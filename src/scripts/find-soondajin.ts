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

async function findSoondajin() {
  const db = admin.firestore();
  const snapshot = await db.collection('participants').where('name', '==', '손다진').get();

  console.log('🔍 "손다진" 참가자 검색:\n');

  if (snapshot.empty) {
    console.log('❌ 참가자를 찾을 수 없습니다.');
    return;
  }

  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(`📍 Document ID: ${doc.id}`);
    console.log(`   이름: ${data.name}`);
    console.log(`   Full 이미지: ${data.profileImage}`);
    console.log(`   Circle 이미지: ${data.profileImageCircle || '(없음)'}`);
    console.log('');
  });
}

findSoondajin()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
