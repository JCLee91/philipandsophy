/**
 * 3기 Cohort와 참가자 정보 확인
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';

// .env.local 파일 로드
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Firebase 설정
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, 'seoul');

async function checkCohort3() {
  console.log('🔍 3기 Cohort 및 참가자 확인 중...\n');

  try {
    // 1. 모든 cohort 조회
    const cohortsRef = collection(db, 'cohorts');
    const cohortsSnapshot = await getDocs(cohortsRef);

    console.log('📋 전체 Cohort 목록:');
    console.log('==================');

    cohortsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`ID: ${doc.id}`);
      console.log(`  - name: ${data.name}`);
      console.log(`  - startDate: ${data.startDate}`);
      console.log(`  - endDate: ${data.endDate}`);
      console.log(`  - isActive: ${data.isActive}`);
      console.log('');
    });

    // 2. 최근 생성된 cohort 찾기 (3기로 추정)
    const recentCohorts = cohortsSnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
      }))
      .sort((a, b) => {
        const aTime = a.createdAt?.getTime() || 0;
        const bTime = b.createdAt?.getTime() || 0;
        return bTime - aTime;
      });

    const cohort3Candidate = recentCohorts[0];

    if (cohort3Candidate) {
      console.log('\n📌 가장 최근 생성된 Cohort (3기 추정):');
      console.log('==================');
      console.log(`ID: ${cohort3Candidate.id}`);
      console.log(`name: ${cohort3Candidate.name}`);
      console.log(`startDate: ${cohort3Candidate.startDate}`);
      console.log(`endDate: ${cohort3Candidate.endDate}`);
      console.log(`isActive: ${cohort3Candidate.isActive}`);
      console.log(`createdAt: ${cohort3Candidate.createdAt}`);
      console.log('');

      // 3. 해당 cohort의 참가자 조회
      const participantsRef = collection(db, 'participants');
      const participantsQuery = query(participantsRef, where('cohortId', '==', cohort3Candidate.id));
      const participantsSnapshot = await getDocs(participantsQuery);

      console.log(`\n👥 참가자 수: ${participantsSnapshot.size}명`);
      console.log('==================');

      participantsSnapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`${index + 1}. ID: ${doc.id}`);
        console.log(`   - name: ${data.name}`);
        console.log(`   - phoneNumber: ${data.phoneNumber}`);
        console.log(`   - gender: ${data.gender || 'N/A'}`);
        console.log(`   - isAdministrator: ${data.isAdministrator || false}`);
        console.log(`   - isSuperAdmin: ${data.isSuperAdmin || false}`);
        console.log(`   - isGhost: ${data.isGhost || false}`);
        console.log('');
      });
    }

    console.log('\n✅ 확인 완료');
  } catch (error) {
    console.error('❌ 에러 발생:', error);
  }
}

checkCohort3();
