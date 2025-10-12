/**
 * 하진영-5953 참가자 데이터 조회
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

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

async function getHaJinYoungData() {
  const participantId = '하진영-5953';

  const docRef = doc(db, 'participants', participantId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    console.log('❌ 참가자를 찾을 수 없습니다.');
    return;
  }

  console.log('📄 하진영-5953 참가자 데이터:\n');
  console.log(JSON.stringify(docSnap.data(), null, 2));
}

getHaJinYoungData().catch(console.error);
