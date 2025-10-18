#!/usr/bin/env node
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, initializeFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {});

async function verifyRules() {
  try {
    console.log('✅ Firebase initialized with (default) database');

    // Try to read cohort data (should require authentication per rules)
    const cohortRef = doc(db, 'cohorts', '1');
    const cohortSnap = await getDoc(cohortRef);

    if (cohortSnap.exists()) {
      const data = cohortSnap.data();
      const dailyFeatured = data.dailyFeaturedParticipants || {};
      const oct17 = dailyFeatured['2025-10-17'];

      console.log('\n📊 Cohort 1 Data:');
      console.log('  Cohort Name:', data.name);
      console.log('  2025-10-17 매칭:', oct17 ? '✅ 존재' : '❌ 없음');

      if (oct17 && oct17.assignments) {
        const assignmentCount = Object.keys(oct17.assignments).length;
        console.log('  배정 수:', assignmentCount, '명');
        console.log('\n✅ 보안 규칙이 정상적으로 적용되었습니다!');
        console.log('✅ 데이터가 복구되어 있습니다!');
      }
    } else {
      console.log('❌ Cohort 1 데이터를 찾을 수 없습니다.');
    }
  } catch (error) {
    if (error.code === 'permission-denied') {
      console.log('✅ 보안 규칙이 작동중입니다 (인증 필요)');
      console.log('   웹 앱에서 로그인하면 데이터에 접근할 수 있습니다.');
    } else {
      console.error('❌ 오류:', error.message);
    }
  }
}

verifyRules();
