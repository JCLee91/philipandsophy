/**
 * Check 손다진 participant ID and profile image URL
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

if (!getApps().length) {
  const serviceAccount = require('../../firebase-service-account.json');
  initializeApp({
    credential: cert(serviceAccount),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

const db = getFirestore();

async function checkDajinProfile() {
  const participantsSnapshot = await db.collection('participants').get();
  
  const dajinDocs = participantsSnapshot.docs.filter(doc => 
    doc.data().name === '손다진'
  );

  if (dajinDocs.length === 0) {
    console.log('❌ 손다진 참가자를 찾을 수 없습니다.\n');
    return;
  }

  dajinDocs.forEach(doc => {
    const data = doc.data();
    console.log('👤 손다진 프로필 정보:');
    console.log(`   ID: ${doc.id}`);
    console.log(`   이름: ${data.name}`);
    console.log(`   전화번호: ${data.phoneNumber}`);
    console.log(`   profileImage: ${data.profileImage || '(없음)'}`);
    console.log(`   profileImageCircle: ${data.profileImageCircle || '(없음)'}`);
    console.log('');
  });
}

checkDajinProfile()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
