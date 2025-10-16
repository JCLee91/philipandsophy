/**
 * 특정 전화번호의 firebaseUid 초기화
 * 사용법: npx tsx src/scripts/reset-firebase-uid.ts
 */

require('dotenv').config({ path: '.env.local' });

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function resetFirebaseUid() {
  try {
    const phoneNumber = '01024539284';
    console.log(`🔍 전화번호 ${phoneNumber} 검색 중...`);

    const participantsRef = collection(db, 'participants');
    const q = query(participantsRef, where('phoneNumber', '==', phoneNumber));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.log('❌ 해당 전화번호를 가진 참가자를 찾을 수 없습니다.');
      process.exit(1);
    }

    console.log(`✅ ${snapshot.size}개의 참가자를 찾았습니다.\n`);

    for (const doc of snapshot.docs) {
      const data = doc.data();
      console.log('📄 Document ID:', doc.id);
      console.log('👤 이름:', data.name);
      console.log('📱 전화번호:', data.phoneNumber);
      console.log('🔑 기존 firebaseUid:', data.firebaseUid || '없음');

      if (data.firebaseUid) {
        // firebaseUid 필드 삭제
        await updateDoc(doc.ref, {
          firebaseUid: null,
        });
        console.log('✅ firebaseUid 초기화 완료!\n');
      } else {
        console.log('⚠️  이미 firebaseUid가 없습니다.\n');
      }
    }

    console.log('✅ 모든 작업 완료!');
    console.log('📱 이제 다시 로그인하면 새로운 Firebase UID가 연결됩니다.');
    
    process.exit(0);

  } catch (error) {
    console.error('❌ 에러 발생:', error);
    process.exit(1);
  }
}

resetFirebaseUid();
