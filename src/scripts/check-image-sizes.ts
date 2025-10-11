/**
 * Check original image sizes vs uploaded WebP sizes
 */

import sharp from 'sharp';
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
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

const storage = admin.storage();
const bucket = storage.bucket();

async function checkImageSizes() {
  console.log('🔍 Checking Image Sizes');
  console.log('═══════════════════════════════════════════════════════\n');

  // Check original files
  const updateDir = 'public/image/image_update';

  console.log('📁 Original Images:\n');

  const files = [
    { name: 'Profile_1기_김정현.png', participant: '김정현-9672', type: 'full' },
    { name: 'Profile_1기_서현명.png', participant: '서현명-4074', type: 'full' },
    { name: '김정현.png', participant: '김정현-9672', type: 'circle' },
  ];

  for (const file of files) {
    const localPath = path.join(process.cwd(), updateDir, file.name);

    try {
      const metadata = await sharp(localPath).metadata();
      console.log(`${file.name}:`);
      console.log(`   원본 크기: ${metadata.width}x${metadata.height}px`);
      console.log(`   포맷: ${metadata.format}`);
      console.log('');
    } catch (error) {
      console.log(`${file.name}: 파일 없음\n`);
    }
  }

  console.log('═══════════════════════════════════════════════════════\n');
  console.log('📤 Uploaded WebP Images (Firebase Storage):\n');
  console.log('🆕 새로 업데이트한 이미지:\n');

  for (const file of files) {
    const storagePath = `profile_images/${file.participant}_${file.type}.webp`;

    try {
      const fileRef = bucket.file(storagePath);
      const [exists] = await fileRef.exists();

      if (exists) {
        const [metadata] = await fileRef.getMetadata();
        const tempPath = `/tmp/${file.participant}_${file.type}.webp`;

        await fileRef.download({ destination: tempPath });
        const imageMetadata = await sharp(tempPath).metadata();

        console.log(`${storagePath}:`);
        console.log(`   업로드된 크기: ${imageMetadata.width}x${imageMetadata.height}px`);
        console.log(`   포맷: ${imageMetadata.format}`);
        console.log(`   파일 크기: ${(Number(metadata.size) / 1024).toFixed(1)} KB`);
        console.log('');

        fs.unlinkSync(tempPath);
      } else {
        console.log(`${storagePath}: 파일 없음\n`);
      }
    } catch (error: any) {
      console.log(`${storagePath}: 오류 - ${error.message}\n`);
    }
  }

  console.log('\n📊 기존 다른 사람들 이미지 (비교용):\n');

  const otherProfiles = [
    '이윤지-4321',
    '손다진-5318',
    '김동현-0660',
    '박지영-0780',
  ];

  for (const participantId of otherProfiles) {
    const storagePath = `profile_images/${participantId}_full.webp`;
    try {
      const fileRef = bucket.file(storagePath);
      const [exists] = await fileRef.exists();

      if (exists) {
        const tempPath = `/tmp/${participantId}_compare.webp`;
        await fileRef.download({ destination: tempPath });
        const imageMetadata = await sharp(tempPath).metadata();

        console.log(`${participantId}: ${imageMetadata.width}x${imageMetadata.height}px`);

        fs.unlinkSync(tempPath);
      } else {
        console.log(`${participantId}: 파일 없음`);
      }
    } catch (error: any) {
      console.log(`${participantId}: 오류 - ${error.message}`);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════');
}

checkImageSizes()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
