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

async function uploadWithTimestamp() {
  const localPath = path.join(process.cwd(), 'public/image/image_update/손다진-9759_full.webp');
  const timestamp = Date.now();
  const oldPath = 'profile_images/손다진-9759_full.webp';
  const newPath = `profile_images/손다진-9759_full_${timestamp}.webp`;

  console.log('🔄 CDN 캐시 우회: 타임스탬프 파일명 업로드\n');

  try {
    // 1. 새 파일명으로 업로드
    await bucket.upload(localPath, {
      destination: newPath,
      metadata: {
        contentType: 'image/webp',
        cacheControl: 'public, max-age=31536000',
      },
    });

    const file = bucket.file(newPath);
    await file.makePublic();

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${newPath}`;
    console.log('✅ 새 파일 업로드 완료');
    console.log(`📍 URL: ${publicUrl}\n`);

    // 2. Firestore URL 업데이트
    const db = admin.firestore();
    await db.collection('participants').doc('손다진-9759').update({
      profileImage: publicUrl,
    });

    console.log('✅ Firestore URL 업데이트 완료');

    // 3. 옛날 파일 삭제 (선택사항)
    try {
      const oldFile = bucket.file(oldPath);
      const [exists] = await oldFile.exists();
      if (exists) {
        await oldFile.delete();
        console.log('✅ 옛날 파일 삭제 완료\n');
      }
    } catch (err) {
      console.log('⚠️  옛날 파일 삭제 실패 (무시 가능)\n');
    }

    console.log('💡 이제 브라우저 새로고침하면 새 이미지가 즉시 표시됩니다!');

  } catch (error: any) {
    console.error('❌ 오류:', error.message);
    process.exit(1);
  }
}

uploadWithTimestamp()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
