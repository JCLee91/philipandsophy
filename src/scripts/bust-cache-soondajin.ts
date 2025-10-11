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

async function bustCache() {
  const db = admin.firestore();
  const participantId = '손다진-9759';

  console.log('🔄 캐시 버스팅: URL 업데이트\n');

  const baseUrl = 'https://storage.googleapis.com/philipandsophy.firebasestorage.app/profile_images/손다진-9759_full.webp';
  const timestamp = Date.now();
  const newUrl = `${baseUrl}?v=${timestamp}`;

  await db.collection('participants').doc(participantId).update({
    profileImage: newUrl,
  });

  console.log('✅ Firestore URL 업데이트 완료');
  console.log(`📍 New URL: ${newUrl}`);
  console.log('\n💡 이제 브라우저 새로고침하면 새 이미지가 표시됩니다.');
}

bustCache()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
