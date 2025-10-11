import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const serviceAccountPath = path.join(process.cwd(), 'firebase-service-account.json');

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

const bucket = admin.storage().bucket();

async function compareSoondajin() {
  console.log('🔍 손다진 이미지 비교\n');

  // 로컬 파일
  const localPath = path.join(process.cwd(), 'public/image/image_update/손다진-9759_full.webp');
  const localMeta = await sharp(localPath).metadata();
  const localStats = fs.statSync(localPath);

  console.log('📁 로컬 파일:');
  console.log(`   크기: ${localMeta.width}x${localMeta.height}px`);
  console.log(`   용량: ${(localStats.size / 1024).toFixed(1)} KB`);
  console.log('');

  // Firebase Storage 파일
  const storagePath = 'profile_images/손다진-9759_full.webp';
  const file = bucket.file(storagePath);
  const [metadata] = await file.getMetadata();

  const tempPath = '/tmp/firebase_soondajin.webp';
  await file.download({ destination: tempPath });

  const storageMeta = await sharp(tempPath).metadata();
  const storageStats = fs.statSync(tempPath);

  console.log('☁️  Firebase Storage:');
  console.log(`   크기: ${storageMeta.width}x${storageMeta.height}px`);
  console.log(`   용량: ${(storageStats.size / 1024).toFixed(1)} KB`);
  console.log(`   업로드 시간: ${metadata.updated}`);
  console.log('');

  // 비교
  if (localStats.size === storageStats.size) {
    console.log('✅ 파일 크기 일치 - 업로드 성공!');
  } else {
    console.log('❌ 파일 크기 불일치 - 다른 파일입니다!');
    console.log(`   로컬: ${localStats.size} bytes`);
    console.log(`   Storage: ${storageStats.size} bytes`);
  }

  fs.unlinkSync(tempPath);
}

compareSoondajin()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
