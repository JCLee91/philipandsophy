/**
 * 실제 전화번호로 관리자 계정 생성
 * 사용법: npx tsx src/scripts/create-real-admin.ts
 */

require('dotenv').config({ path: '.env.local' });

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

console.log('Firebase 설정:', {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
});

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function createRealAdmin() {
  try {
    console.log('🔄 관리자 계정 생성 중...');

    // 관리자 참가자 생성 (cohort-2025-01 사용)
    const participantsRef = collection(db, 'participants');
    
    const newAdmin = {
      cohortId: 'cohort-2025-01',
      participantId: 'admin-real',
      participationCode: 'ADMIN-REAL',
      name: '관리자',
      phoneNumber: '01024539284',
      gender: 'male' as const,
      birthYear: 1990,
      occupation: '운영자',
      interests: ['독서', '글쓰기', '사람 만나기'],
      readingStyle: '꼼꼼하게 읽기',
      favoriteGenres: ['인문', '에세이'],
      profileImageUrl: '',
      role: 'admin' as const,
      isAdministrator: true,
      isActive: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const docRef = await addDoc(participantsRef, newAdmin);
    
    console.log('\n✅ 관리자 계정 생성 완료!');
    console.log('📱 전화번호:', newAdmin.phoneNumber);
    console.log('👤 이름:', newAdmin.name);
    console.log('🔑 participantId:', newAdmin.participantId);
    console.log('🆔 Cohort ID:', newAdmin.cohortId);
    console.log('📄 Document ID:', docRef.id);

    console.log('\n✅ 이제 http://localhost:3000/app 에서 로그인할 수 있습니다!');
    console.log('📱 전화번호 입력: 010-2453-9284');
    console.log('📨 SMS 인증 코드를 받아서 입력하세요.');

    process.exit(0);

  } catch (error) {
    console.error('❌ 에러 발생:', error);
    process.exit(1);
  }
}

createRealAdmin();
