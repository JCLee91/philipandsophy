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

const bucket = admin.storage().bucket();

async function uploadSoondajin() {
  const localPath = path.join(process.cwd(), 'public/image/image_update/손다진-9759_full.webp');
  const storagePath = 'profile_images/손다진-9759_full.webp';

  console.log('📤 손다진 프로필 이미지 업로드\n');

  try {
    // 1. 기존 파일 삭제 (캐시 버스팅)
    const file = bucket.file(storagePath);
    const [exists] = await file.exists();

    if (exists) {
      await file.delete();
      console.log('✅ 기존 파일 삭제');
    }

    // 2. 새 파일 업로드
    await bucket.upload(localPath, {
      destination: storagePath,
      metadata: {
        contentType: 'image/webp',
        cacheControl: 'public, max-age=31536000',
      },
    });

    // 3. 공개 권한 설정
    await file.makePublic();

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
    console.log('✅ 업로드 완료');
    console.log(`📍 URL: ${publicUrl}\n`);

  } catch (error: any) {
    console.error('❌ 오류:', error.message);
    process.exit(1);
  }
}

uploadSoondajin()
  .then(() => {
    console.log('✅ 완료! 브라우저에서 Cmd+Shift+R로 새로고침하세요.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
