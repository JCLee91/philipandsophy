/**
 * Batch Update Profile Images
 * - Convert images to WebP
 * - Delete old files from Storage
 * - Upload new files to same path (cache-busting)
 * - Supports both full profile and circle images
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

const UPDATE_DIR = path.join(process.cwd(), 'public/image/image_update');
const TEMP_DIR = '/tmp/batch_profile_update';

// 이미지 파일 매핑 (파일명 → 참가자 이름 및 타입)
interface ImageMapping {
  fileName: string;
  participantName: string;
  type: 'full' | 'circle';
}

const IMAGE_MAPPINGS: ImageMapping[] = [
  {
    fileName: '10_손다진.webp',
    participantName: '손다진',
    type: 'full',
  },
];

async function getParticipantId(name: string): Promise<string | null> {
  const db = admin.firestore();
  const snapshot = await db.collection('participants').get();
  const doc = snapshot.docs.find(d => d.data().name === name);
  return doc ? doc.id : null;
}

async function convertToWebP(
  inputPath: string,
  outputPath: string,
  type: 'full' | 'circle'
) {
  // 모든 이미지: 원본 크기 그대로 유지, 무손실 WebP 변환
  console.log(`      Converting to lossless WebP (${type}, original size preserved)...`);
  await sharp(inputPath)
    .webp({
      lossless: true,  // 무손실 압축
      quality: 100,    // 최고 품질
      nearLossless: false  // 완전 무손실
    })
    .toFile(outputPath);
}

async function deleteOldFile(storagePath: string) {
  try {
    const file = bucket.file(storagePath);
    const [exists] = await file.exists();
    if (exists) {
      await file.delete();
      console.log(`      ✅ Deleted old file: ${storagePath}`);
    } else {
      console.log(`      ℹ️  Old file not found (first upload?): ${storagePath}`);
    }
  } catch (error: any) {
    console.error(`      ⚠️  Error deleting ${storagePath}:`, error.message);
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
  console.log(`      ✅ Uploaded: ${storagePath}`);

  return publicUrl;
}

async function processImage(mapping: ImageMapping, index: number, total: number) {
  console.log(`\n[${ index + 1}/${total}] Processing: ${mapping.fileName}`);
  console.log(`   Name: ${mapping.participantName}`);
  console.log(`   Type: ${mapping.type === 'full' ? 'Full Profile' : 'Circle Avatar'}`);

  // Get participant ID
  const participantId = await getParticipantId(mapping.participantName);
  if (!participantId) {
    console.log(`   ❌ Participant not found: ${mapping.participantName}\n`);
    return { success: false, name: mapping.participantName };
  }

  console.log(`   Participant ID: ${participantId}`);

  const sourcePath = path.join(UPDATE_DIR, mapping.fileName);

  // Check if source exists
  if (!fs.existsSync(sourcePath)) {
    console.log(`   ❌ Source file not found: ${sourcePath}\n`);
    return { success: false, name: mapping.participantName };
  }

  try {
    // Convert to WebP
    const suffix = mapping.type === 'full' ? 'full' : 'circle';
    const tempOutputPath = path.join(TEMP_DIR, `${participantId}_${suffix}.webp`);

    console.log(`   📸 Converting...`);
    await convertToWebP(sourcePath, tempOutputPath, mapping.type);

    // Delete old file
    const storagePath = `profile_images/${participantId}_${suffix}.webp`;
    console.log(`   🗑️  Deleting old file...`);
    await deleteOldFile(storagePath);

    // Upload new file
    console.log(`   📤 Uploading...`);
    const url = await uploadToStorage(tempOutputPath, storagePath);

    // Cleanup temp file
    fs.unlinkSync(tempOutputPath);

    console.log(`   ✅ Success!`);
    console.log(`   URL: ${url}`);

    return { success: true, name: mapping.participantName, type: mapping.type };
  } catch (error: any) {
    console.log(`   ❌ Error: ${error.message}`);
    return { success: false, name: mapping.participantName };
  }
}

async function batchUpdateProfiles() {
  console.log('🔄 Batch Update Profile Images');
  console.log('═══════════════════════════════════════════════════════\n');

  // Check update directory
  if (!fs.existsSync(UPDATE_DIR)) {
    console.error('❌ Update directory not found:', UPDATE_DIR);
    process.exit(1);
  }

  // Create temp directory
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }

  console.log(`📁 Source: ${UPDATE_DIR}`);
  console.log(`📊 Total images to update: ${IMAGE_MAPPINGS.length}\n`);

  const results = [];

  for (let i = 0; i < IMAGE_MAPPINGS.length; i++) {
    const result = await processImage(IMAGE_MAPPINGS[i], i, IMAGE_MAPPINGS.length);
    results.push(result);
  }

  // Summary
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('📊 Update Summary\n');

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  successful.forEach(r => {
    console.log(`   ✓ ${r.name} (${r.type})`);
  });

  if (failed.length > 0) {
    console.log(`\n❌ Failed: ${failed.length}/${results.length}`);
    failed.forEach(r => {
      console.log(`   ✗ ${r.name}`);
    });
  }

  console.log('\n💡 Cache will be cleared automatically.');
  console.log('💡 Refresh browser (Ctrl+F5) to see changes.\n');

  // Cleanup temp directory
  if (fs.existsSync(TEMP_DIR)) {
    fs.rmSync(TEMP_DIR, { recursive: true });
    console.log('🧹 Cleaned up temporary files\n');
  }
}

batchUpdateProfiles()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
