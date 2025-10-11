/**
 * Update 손다진 profile image
 * - Convert to WebP
 * - Delete old files from Storage
 * - Upload new files to same path (cache-busting)
 * - Firestore URLs remain the same
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
const db = admin.firestore();

const PARTICIPANT_ID = '손다진-9759';
const SOURCE_IMAGE = path.join(process.cwd(), 'public/image/Profile_1기_손다진.png');
const TEMP_DIR = '/tmp/profile_update';

async function convertToWebP(
  inputPath: string,
  outputPath: string,
  size: number,
  isCircle: boolean = false
) {
  if (isCircle) {
    console.log(`   Converting to WebP (${size}x${size}, cropped for circle)...`);
    await sharp(inputPath)
      .resize(size, size, {
        fit: 'cover',  // 정사각형으로 crop (원형 아바타용)
        position: 'center'
      })
      .webp({ quality: 85 })
      .toFile(outputPath);
  } else {
    console.log(`   Converting to WebP (max ${size}px, preserving aspect ratio)...`);
    await sharp(inputPath)
      .resize(size, size, {
        fit: 'inside',  // 비율 유지 (전체 프로필용)
        withoutEnlargement: true
      })
      .webp({ quality: 85 })
      .toFile(outputPath);
  }
}

async function deleteOldFile(storagePath: string) {
  try {
    const file = bucket.file(storagePath);
    const [exists] = await file.exists();
    if (exists) {
      await file.delete();
      console.log(`   ✅ Deleted old file: ${storagePath}`);
    } else {
      console.log(`   ℹ️  File not found (may be first upload): ${storagePath}`);
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
      cacheControl: 'public, max-age=31536000', // 1 year cache
    },
  });

  await file.makePublic();

  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
  console.log(`   ✅ Uploaded: ${storagePath}`);

  return publicUrl;
}

async function updateDajinProfile() {
  console.log('🖼️  Update 손다진 Profile Image');
  console.log('═══════════════════════════════════════════════════════\n');

  // Check if source image exists
  if (!fs.existsSync(SOURCE_IMAGE)) {
    console.error('❌ Source image not found at:', SOURCE_IMAGE);
    console.log('\n💡 Please save the profile image to:', SOURCE_IMAGE);
    process.exit(1);
  }

  console.log('✅ Source image found\n');

  try {
    // Step 1: Convert to WebP
    console.log('📸 Step 1: Converting images to WebP...\n');

    const fullImagePath = path.join(TEMP_DIR, 'dajin_full.webp');
    const circleImagePath = path.join(TEMP_DIR, 'dajin_circle.webp');

    await convertToWebP(SOURCE_IMAGE, fullImagePath, 1000, false); // Full size (비율 유지)
    await convertToWebP(SOURCE_IMAGE, circleImagePath, 400, true); // Circle size (정사각형 crop)

    console.log('   ✅ WebP conversion complete\n');

    // Step 2: Delete old files
    console.log('🗑️  Step 2: Deleting old files from Storage...\n');

    await deleteOldFile(`profile_images/${PARTICIPANT_ID}_full.webp`);
    await deleteOldFile(`profile_images/${PARTICIPANT_ID}_circle.webp`);

    console.log('');

    // Step 3: Upload new files
    console.log('📤 Step 3: Uploading new images...\n');

    const fullUrl = await uploadToStorage(
      fullImagePath,
      `profile_images/${PARTICIPANT_ID}_full.webp`
    );

    const circleUrl = await uploadToStorage(
      circleImagePath,
      `profile_images/${PARTICIPANT_ID}_circle.webp`
    );

    console.log('');

    // Step 4: Verify Firestore (URLs should be the same)
    console.log('🔍 Step 4: Verifying Firestore...\n');

    const docRef = db.collection('participants').doc(PARTICIPANT_ID);
    const doc = await docRef.get();

    if (!doc.exists) {
      console.error('❌ Participant not found:', PARTICIPANT_ID);
      process.exit(1);
    }

    const data = doc.data()!;

    console.log('   Current profileImage:', data.profileImage);
    console.log('   Expected profileImage:', fullUrl);
    console.log('   Match:', data.profileImage === fullUrl ? '✅' : '⚠️  Mismatch');
    console.log('');
    console.log('   Current profileImageCircle:', data.profileImageCircle);
    console.log('   Expected profileImageCircle:', circleUrl);
    console.log('   Match:', data.profileImageCircle === circleUrl ? '✅' : '⚠️  Mismatch');

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✅ Profile image update complete!\n');
    console.log('💡 Cache will be cleared automatically as the file was replaced.');
    console.log('💡 Users may need to refresh (Ctrl+F5) to see changes immediately.\n');

    // Cleanup temp files
    fs.unlinkSync(fullImagePath);
    fs.unlinkSync(circleImagePath);
    console.log('🧹 Cleaned up temporary files\n');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

updateDajinProfile()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
