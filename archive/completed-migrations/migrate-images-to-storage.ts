/**
 * Image Migration Script: Airtable → Firebase Storage
 *
 * 1. Download images from Airtable URLs
 * 2. Convert to WebP format (50-70% size reduction)
 * 3. Upload to Firebase Storage
 * 4. Update Firestore participant documents with new URLs
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import { logger } from '@/lib/logger';
import { MIGRATION_CONFIG, IMAGE_CONFIG } from '@/constants/migration';

// Load service account from environment variable
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json';
const serviceAccount = require(path.resolve(process.cwd(), serviceAccountPath));

// Initialize Firebase Admin
if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'philipandsophy.firebasestorage.app',
  });
}

const db = getFirestore();
const storage = getStorage();

// Temp directory for downloads
const TEMP_DIR = path.join(process.cwd(), 'temp-images');

/**
 * Download image from URL with proper cleanup
 */
async function downloadImage(url: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(outputPath);
    let request: any = null;

    const cleanup = () => {
      if (file) {
        file.removeAllListeners();
        file.end();
      }
      if (request) {
        request.removeAllListeners();
        request.destroy();
      }
    };

    request = https.get(url, (response) => {
      if (response.statusCode !== 200) {
        cleanup();
        fs.unlink(outputPath, () => {});
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }

      response.pipe(file);

      file.on('finish', () => {
        cleanup();
        resolve();
      });

      file.on('error', (err) => {
        cleanup();
        fs.unlink(outputPath, () => {});
        reject(err);
      });
    });

    request.on('error', (err) => {
      cleanup();
      fs.unlink(outputPath, () => {});
      reject(err);
    });
  });
}

/**
 * Convert image to WebP with configured quality
 */
async function convertToWebP(inputPath: string, outputPath: string): Promise<void> {
  await sharp(inputPath)
    .webp({ quality: MIGRATION_CONFIG.IMAGE_QUALITY })
    .toFile(outputPath);
}

/**
 * Upload to Firebase Storage with configured cache
 */
async function uploadToStorage(localPath: string, storagePath: string): Promise<string> {
  const bucket = storage.bucket();

  await bucket.upload(localPath, {
    destination: storagePath,
    metadata: {
      contentType: 'image/webp',
      cacheControl: `public, max-age=${MIGRATION_CONFIG.CACHE_MAX_AGE}`,
    },
  });

  // Make file publicly accessible
  const file = bucket.file(storagePath);
  await file.makePublic();

  // Get public URL
  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
  return publicUrl;
}

/**
 * Clean filename for storage
 */
function cleanFileName(name: string): string {
  // Remove special characters, keep Korean
  return name.replace(/[^\w\sㄱ-ㅎㅏ-ㅣ가-힣-]/g, '').trim();
}

/**
 * Main migration function
 */
async function migrateImages() {
  try {
    logger.info('🚀 Starting image migration to Firebase Storage...\n');

    // Create temp directory
    if (!fs.existsSync(TEMP_DIR)) {
      fs.mkdirSync(TEMP_DIR, { recursive: true });
    }

    // Get all participants
    const participantsSnapshot = await db.collection('participants').get();
    const participants = participantsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Array<{ id: string; name?: string; profileImage?: string; [key: string]: any }>;

    logger.info(`📊 Found ${participants.length} participants\n`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const participant of participants) {
      const { id, name, profileImage } = participant;

      // Skip if no profile image or already on Firebase Storage
      if (!profileImage) {
        logger.info(`⏭️  Skipping ${name}: No profile image`);
        skipCount++;
        continue;
      }

      if (profileImage.includes('firebasestorage.googleapis.com') || profileImage.includes('storage.googleapis.com')) {
        logger.info(`✅ Skipping ${name}: Already on Firebase Storage`);
        skipCount++;
        continue;
      }

      logger.info(`\n📥 Processing: ${name} (${id})`);
      logger.info(`   Source: ${profileImage.substring(0, 80)}...`);

      let tempOriginal: string | null = null;
      let tempWebP: string | null = null;

      try {
        // File paths
        const cleanName = cleanFileName(name);
        tempOriginal = path.join(TEMP_DIR, `${cleanName}_original.jpg`);
        tempWebP = path.join(TEMP_DIR, `${cleanName}.webp`);
        const storagePath = `${IMAGE_CONFIG.STORAGE_PATHS.PROFILES}/${cleanName}${IMAGE_CONFIG.EXTENSIONS.WEBP}`;

        // Step 1: Download
        logger.info('   ⬇️  Downloading...');
        await downloadImage(profileImage, tempOriginal);

        // Step 2: Convert to WebP
        logger.info('   🔄 Converting to WebP...');
        await convertToWebP(tempOriginal, tempWebP);

        // Get file sizes for comparison
        const originalSize = fs.statSync(tempOriginal).size;
        const webpSize = fs.statSync(tempWebP).size;
        const reduction = ((1 - webpSize / originalSize) * 100).toFixed(1);
        logger.info(`   📊 Size: ${(originalSize / 1024).toFixed(0)}KB → ${(webpSize / 1024).toFixed(0)}KB (${reduction}% reduction)`);

        // Step 3: Upload to Storage
        logger.info('   ⬆️  Uploading to Firebase Storage...');
        const publicUrl = await uploadToStorage(tempWebP, storagePath);
        logger.info(`   ✅ Uploaded: ${publicUrl}`);

        // Step 4: Update Firestore
        logger.info('   💾 Updating Firestore...');
        await db.collection('participants').doc(id).update({
          profileImage: publicUrl,
          updatedAt: new Date(),
        });

        logger.info(`   ✨ Success: ${name}`);
        successCount++;

      } catch (error) {
        logger.error(`   ❌ Error processing ${name}:`, error);
        errorCount++;
      } finally {
        // Always clean up temp files, even on error
        if (tempOriginal && fs.existsSync(tempOriginal)) {
          try {
            fs.unlinkSync(tempOriginal);
          } catch (cleanupError) {
            logger.warn(`   ⚠️  Failed to cleanup ${tempOriginal}`, cleanupError);
          }
        }
        if (tempWebP && fs.existsSync(tempWebP)) {
          try {
            fs.unlinkSync(tempWebP);
          } catch (cleanupError) {
            logger.warn(`   ⚠️  Failed to cleanup ${tempWebP}`, cleanupError);
          }
        }
      }
    }

    // Clean up temp directory
    if (fs.existsSync(TEMP_DIR)) {
      try {
        fs.rmdirSync(TEMP_DIR, { recursive: true });
      } catch (cleanupError) {
        logger.warn('⚠️  Failed to cleanup temp directory', cleanupError);
      }
    }

    logger.info('\n' + '='.repeat(60));
    logger.info('🎉 Migration Complete!');
    logger.info('='.repeat(60));
    logger.info(`✅ Migrated: ${successCount}`);
    logger.info(`⏭️  Skipped: ${skipCount}`);
    logger.info(`❌ Errors: ${errorCount}`);
    logger.info(`📊 Total: ${participants.length}`);
    logger.info('='.repeat(60) + '\n');

    if (successCount > 0) {
      logger.info('🚀 Images are now served from Firebase Storage CDN!');
      logger.info('⚡ Expected performance improvement: 5-10x faster loading');
    }

    process.exit(errorCount > 0 ? 1 : 0);

  } catch (error) {
    logger.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateImages();
