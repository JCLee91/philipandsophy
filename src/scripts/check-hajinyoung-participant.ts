/**
 * 하진영 참가자 문서 전체 확인 스크립트
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';

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

async function checkHaJinYoungParticipant() {
  console.log('🔍 하진영 참가자 문서 전체 확인 중...\n');

  // 하진영 참가자 찾기
  const participantsRef = collection(db, 'participants');
  const participantQuery = query(participantsRef, where('name', '==', '하진영'));
  const participantSnapshot = await getDocs(participantQuery);

  if (participantSnapshot.empty) {
    console.log('❌ 하진영 참가자를 찾을 수 없습니다.');
    return;
  }

  participantSnapshot.forEach((doc) => {
    console.log(`📄 참가자 ID: ${doc.id}\n`);
    console.log('📋 전체 문서 데이터:');
    console.log(JSON.stringify(doc.data(), null, 2));
  });

  console.log('\n✅ 확인 완료!');
}

checkHaJinYoungParticipant().catch(console.error);
