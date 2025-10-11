/**
 * Convert Profile Images to WebP and Update Firebase Storage
 *
 * Purpose:
 * 1. Convert all PNG profile images to WebP format
 * 2. Upload WebP images to Firebase Storage
 * 3. Update participant records with new WebP URLs
 * 4. Delete old PNG files from Storage
 *
 * Expected results:
 * - 70-90% file size reduction
 * - Faster page load times
 * - Better mobile performance
 *
 * Usage:
 *   npm run convert:profiles-webp
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { execSync } from 'child_process';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Initialize Firebase Admin
if (!getApps().length) {
  const serviceAccount = require('../../firebase-service-account.json');

  initializeApp({
    credential: cert(serviceAccount),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

const db = getFirestore();
const storage = getStorage();
const bucket = storage.bucket();

const TEMP_DIR = '/tmp/profile-webp-conversion';

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * Convert PNG to WebP using cwebp command
 */
function convertToWebP(inputPath: string, outputPath: string): void {
  try {
    // Use cwebp with quality 85 for good balance
    execSync(`cwebp -q 85 "${inputPath}" -o "${outputPath}"`, {
      stdio: 'pipe',
    });
  } catch (error) {
    throw new Error(`WebP conversion failed: ${error}`);
  }
}

/**
 * Upload WebP image to Firebase Storage
 */
async function uploadWebPToStorage(
  localPath: string,
  storagePath: string
): Promise<string> {
  const fileBuffer = fs.readFileSync(localPath);
  const file = bucket.file(storagePath);

  await file.save(fileBuffer, {
    metadata: {
      contentType: 'image/webp',
    },
  });

  await file.makePublic();

  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
  return publicUrl;
}

/**
 * Process single image: download → convert → upload → delete old
 */
async function processImage(
  participantId: string,
  imageType: 'full' | 'circle',
  oldPngUrl: string
): Promise<string> {
  const suffix = imageType === 'full' ? '' : '_circle';
  const tempPngPath = path.join(TEMP_DIR, `${participantId}${suffix}.png`);
  const tempWebpPath = path.join(TEMP_DIR, `${participantId}${suffix}.webp`);
  const storageWebpPath = `profile_images/${participantId}${suffix}.webp`;

  try {
    // 1. Download PNG from Firebase Storage
    console.log(`   📥 Downloading ${imageType} PNG...`);
    const oldFile = bucket.file(`profile_images/${participantId}${suffix}.png`);
    await oldFile.download({ destination: tempPngPath });

    // 2. Convert to WebP
    console.log(`   🔄 Converting to WebP...`);
    convertToWebP(tempPngPath, tempWebpPath);

    const pngSize = fs.statSync(tempPngPath).size;
    const webpSize = fs.statSync(tempWebpPath).size;
    const reduction = ((1 - webpSize / pngSize) * 100).toFixed(1);
    console.log(`   ✅ Size: ${(pngSize / 1024).toFixed(1)}KB → ${(webpSize / 1024).toFixed(1)}KB (-${reduction}%)`);

    // 3. Upload WebP to Storage
    console.log(`   📤 Uploading WebP to Storage...`);
    const webpUrl = await uploadWebPToStorage(tempWebpPath, storageWebpPath);

    // 4. Delete old PNG file from Storage
    console.log(`   🗑️  Deleting old PNG...`);
    await oldFile.delete();

    // 5. Cleanup temp files
    fs.unlinkSync(tempPngPath);
    fs.unlinkSync(tempWebpPath);

    return webpUrl;
  } catch (error) {
    console.error(`   ❌ Error processing ${participantId} ${imageType}:`, error);
    // Cleanup temp files on error
    if (fs.existsSync(tempPngPath)) fs.unlinkSync(tempPngPath);
    if (fs.existsSync(tempWebpPath)) fs.unlinkSync(tempWebpPath);
    throw error;
  }
}

async function run() {
  console.log('🚀 Convert Profile Images to WebP');
  console.log('═══════════════════════════════════════════════════════\n');

  // Check if cwebp is installed
  try {
    execSync('which cwebp', { stdio: 'pipe' });
  } catch {
    console.error('❌ cwebp not found!');
    console.log('   Install with: brew install webp');
    process.exit(1);
  }

  // Get all participants with profile images
  const participantsSnapshot = await db.collection('participants').get();
  const participants = participantsSnapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((p: any) => p.profileImage || p.profileImageCircle);

  console.log(`📊 Found ${participants.length} participants with images\n`);

  let totalProcessed = 0;
  let totalErrors = 0;

  for (const participant of participants) {
    console.log(`\n👤 Processing: ${participant.id}`);

    const updateData: any = {
      updatedAt: Timestamp.now(),
    };

    try {
      // Process full profile image
      if ((participant as any).profileImage) {
        const webpUrl = await processImage(
          participant.id,
          'full',
          (participant as any).profileImage
        );
        updateData.profileImage = webpUrl;
      }

      // Process circle profile image
      if ((participant as any).profileImageCircle) {
        const webpUrl = await processImage(
          participant.id,
          'circle',
          (participant as any).profileImageCircle
        );
        updateData.profileImageCircle = webpUrl;
      }

      // Update Firestore document
      await db.collection('participants').doc(participant.id).update(updateData);
      console.log(`   ✅ Updated Firestore record`);

      totalProcessed++;
    } catch (error) {
      console.error(`   ❌ Failed to process ${participant.id}`);
      totalErrors++;
    }
  }

  // Cleanup temp directory
  fs.rmSync(TEMP_DIR, { recursive: true, force: true });

  console.log('\n\n═══════════════════════════════════════════════════════');
  console.log('📊 Conversion Summary');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`✅ Successfully converted: ${totalProcessed} participants`);
  console.log(`❌ Errors: ${totalErrors}`);
  console.log('═══════════════════════════════════════════════════════\n');

  if (totalErrors === 0) {
    console.log('🎉 All profile images converted to WebP!');
    console.log('   Expected improvement: 70-90% file size reduction\n');
  }
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
