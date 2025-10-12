/**
 * 하진영 참가자 데이터 확인 스크립트
 * - 참가자 정보 확인
 * - 어제/오늘 제출 내역 확인
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { getYesterdayString, getTodayString } from '../lib/date-utils';

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

async function checkHaJinYoungData() {
  console.log('🔍 하진영 참가자 데이터 확인 중...\n');

  const yesterday = getYesterdayString();
  const today = getTodayString();

  console.log(`📅 어제: ${yesterday}`);
  console.log(`📅 오늘: ${today}\n`);

  // 1. 하진영 참가자 찾기
  console.log('1️⃣ 하진영 참가자 검색...');
  const participantsRef = collection(db, 'participants');
  const participantQuery = query(participantsRef, where('name', '==', '하진영'));
  const participantSnapshot = await getDocs(participantQuery);

  if (participantSnapshot.empty) {
    console.log('❌ 하진영 참가자를 찾을 수 없습니다.');
    return;
  }

  participantSnapshot.forEach((doc) => {
    const data = doc.data();
    console.log(`✅ 참가자 ID: ${doc.id}`);
    console.log(`   이름: ${data.name}`);
    console.log(`   전화번호: ${data.phone}`);
    console.log(`   코호트: ${data.cohortId}`);
    console.log(`   직업: ${data.occupation || '미입력'}`);
    console.log(`   관리자: ${data.isAdmin || data.isAdministrator ? 'Yes' : 'No'}\n`);
  });

  const haJinYoungId = participantSnapshot.docs[0].id;
  const cohortId = participantSnapshot.docs[0].data().cohortId;

  // 2. 어제 제출 내역 확인
  console.log('2️⃣ 어제 제출 내역 확인...');
  const yesterdaySubmissionsRef = collection(db, 'reading_submissions');
  const yesterdayQuery = query(
    yesterdaySubmissionsRef,
    where('participantId', '==', haJinYoungId),
    where('submissionDate', '==', yesterday)
  );
  const yesterdaySnapshot = await getDocs(yesterdayQuery);

  if (yesterdaySnapshot.empty) {
    console.log(`❌ 어제(${yesterday}) 제출 내역 없음\n`);
  } else {
    console.log(`✅ 어제(${yesterday}) 제출 내역 있음:`);
    yesterdaySnapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`   제출 ID: ${doc.id}`);
      console.log(`   책 제목: ${data.bookTitle}`);
      console.log(`   일일 질문: ${data.dailyQuestion}`);
      console.log(`   답변: ${data.dailyAnswer?.substring(0, 50)}...`);
      console.log(`   제출일: ${data.submissionDate}\n`);
    });
  }

  // 3. 오늘 제출 내역 확인
  console.log('3️⃣ 오늘 제출 내역 확인...');
  const todayQuery = query(
    yesterdaySubmissionsRef,
    where('participantId', '==', haJinYoungId),
    where('submissionDate', '==', today)
  );
  const todaySnapshot = await getDocs(todayQuery);

  if (todaySnapshot.empty) {
    console.log(`❌ 오늘(${today}) 제출 내역 없음\n`);
  } else {
    console.log(`✅ 오늘(${today}) 제출 내역 있음:`);
    todaySnapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`   제출 ID: ${doc.id}`);
      console.log(`   책 제목: ${data.bookTitle}`);
      console.log(`   일일 질문: ${data.dailyQuestion}`);
      console.log(`   답변: ${data.dailyAnswer?.substring(0, 50)}...`);
      console.log(`   제출일: ${data.submissionDate}\n`);
    });
  }

  // 4. 전체 제출 내역 확인
  console.log('4️⃣ 전체 제출 내역 확인...');
  const allSubmissionsQuery = query(
    yesterdaySubmissionsRef,
    where('participantId', '==', haJinYoungId)
  );
  const allSubmissionsSnapshot = await getDocs(allSubmissionsQuery);

  console.log(`📊 총 제출 횟수: ${allSubmissionsSnapshot.size}개\n`);
  allSubmissionsSnapshot.forEach((doc) => {
    const data = doc.data();
    console.log(`   - ${data.submissionDate}: ${data.bookTitle}`);
  });

  console.log('\n✅ 확인 완료!');
}

checkHaJinYoungData().catch(console.error);
