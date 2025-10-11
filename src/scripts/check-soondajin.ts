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

async function checkSoondajin() {
  const storagePath = 'profile_images/손다진-9759_full.webp';

  console.log('🔍 Firebase Storage 파일 확인\n');

  const file = bucket.file(storagePath);
  const [exists] = await file.exists();

  if (!exists) {
    console.log('❌ 파일이 존재하지 않습니다.');
    return;
  }

  const [metadata] = await file.getMetadata();
  const tempPath = '/tmp/soondajin_check.webp';

  await file.download({ destination: tempPath });
  const imageMetadata = await sharp(tempPath).metadata();

  console.log('📊 현재 Firebase Storage 파일:');
  console.log(`  크기: ${imageMetadata.width}x${imageMetadata.height}px`);
  console.log(`  업데이트 시간: ${metadata.updated}`);
  console.log(`  파일 크기: ${(Number(metadata.size) / 1024).toFixed(1)} KB`);
  console.log(`  Content-Type: ${metadata.contentType}`);
  console.log('');

  // Firestore URL 확인
  const db = admin.firestore();
  const participantDoc = await db.collection('participants').doc('손다진-9759').get();

  if (participantDoc.exists) {
    const data = participantDoc.data();
    console.log('📝 Firestore에 저장된 URL:');
    console.log(`  ${data?.profileImage}`);
  }

  fs.unlinkSync(tempPath);
}

checkSoondajin()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
