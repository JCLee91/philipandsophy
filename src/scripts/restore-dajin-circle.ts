/**
 * Restore 손다진 circle profile image from profil-circle folder
 * - Convert original circle image to WebP
 * - Upload only circle image (keep full image as is)
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Service Account 키 경로
const serviceAccountPath = path.join(process.cwd(), 'firebase-service-account.json');

// Initialize Admin SDK
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

const storage = admin.storage();
const bucket = storage.bucket();

const PARTICIPANT_ID = '손다진-9759';
const CIRCLE_SOURCE = path.join(process.cwd(), 'public/image/profil-circle/손다진.png');
const TEMP_DIR = '/tmp/profile_update';

async function convertCircleToWebP(inputPath: string, outputPath: string) {
  console.log('   Converting circle image to WebP...');

  // Get original dimensions
  const metadata = await sharp(inputPath).metadata();
  console.log(`   Original size: ${metadata.width}x${metadata.height}`);

  // Convert to WebP without resizing (keep original size)
  await sharp(inputPath)
    .webp({ quality: 85 })
    .toFile(outputPath);

  console.log('   ✅ Converted to WebP');
}

async function deleteOldFile(storagePath: string) {
  try {
    const file = bucket.file(storagePath);
    const [exists] = await file.exists();
    if (exists) {
      await file.delete();
      console.log(`   ✅ Deleted old file: ${storagePath}`);
    }
  } catch (error: any) {
    console.error(`   ⚠️  Error deleting ${storagePath}:`, error.message);
  }
}

async function uploadToStorage(localPath: string, storagePath: string): Promise<string> {
  const file = bucket.file(storagePath);

  await file.save(fs.readFileSync(localPath), {
    metadata: {
      contentType: 'image/webp',
      cacheControl: 'public, max-age=31536000',
    },
  });

  await file.makePublic();

  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
  console.log(`   ✅ Uploaded: ${storagePath}`);

  return publicUrl;
}

async function restoreCircleImage() {
  console.log('🔄 Restore 손다진 Circle Profile Image');
  console.log('═══════════════════════════════════════════════════════\n');

  // Check if source exists
  if (!fs.existsSync(CIRCLE_SOURCE)) {
    console.error('❌ Circle image not found at:', CIRCLE_SOURCE);
    process.exit(1);
  }

  console.log('✅ Circle image found\n');

  // Create temp dir if not exists
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }

  try {
    // Step 1: Convert to WebP
    console.log('📸 Step 1: Converting to WebP...\n');

    const circleImagePath = path.join(TEMP_DIR, 'dajin_circle_restore.webp');
    await convertCircleToWebP(CIRCLE_SOURCE, circleImagePath);

    console.log('');

    // Step 2: Delete old circle image
    console.log('🗑️  Step 2: Deleting old circle image...\n');
    await deleteOldFile(`profile_images/${PARTICIPANT_ID}_circle.webp`);

    console.log('');

    // Step 3: Upload new circle image
    console.log('📤 Step 3: Uploading restored circle image...\n');

    const circleUrl = await uploadToStorage(
      circleImagePath,
      `profile_images/${PARTICIPANT_ID}_circle.webp`
    );

    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ Circle image restored!\n');
    console.log('📍 URL:', circleUrl);
    console.log('\n💡 Cache will be cleared automatically.');
    console.log('💡 Refresh browser (Ctrl+F5) to see changes.\n');

    // Cleanup
    fs.unlinkSync(circleImagePath);
    console.log('🧹 Cleaned up temporary files\n');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

restoreCircleImage()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
