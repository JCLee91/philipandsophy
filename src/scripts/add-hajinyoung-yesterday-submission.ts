/**
 * 하진영-5953 어제(2025-10-11) 제출 데이터 추가
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';
import { getYesterdayString } from '../lib/date-utils';
import { getDailyQuestionText } from '../constants/daily-questions';

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

async function addYesterdaySubmission() {
  const participantId = '하진영-5953';
  const yesterday = getYesterdayString();
  const yesterdayQuestion = getDailyQuestionText(yesterday);

  console.log('📝 하진영-5953 어제 제출 데이터 추가 중...\n');
  console.log(`📅 제출 날짜: ${yesterday}`);
  console.log(`❓ 데일리 질문: ${yesterdayQuestion}\n`);

  const submissionData = {
    participantId,
    cohortId: '10',
    submissionDate: yesterday,
    bookTitle: '귀욤미소 ㅡ 아가씨와 밤(2025 이전버전)',
    bookReview: '첫 도입부분을 읽었어요. 밀수업자.. 어떤 무엇을 밀수할지, 도입부를 어떻게 잡느냐에 따라 눈길을 확 끌어 당기는 대목이 좋아요',
    dailyQuestion: yesterdayQuestion,
    dailyAnswer: '"꽃꽂이할 때" 이파리 다듬고 가시제거하고 꽃을 어떻게 배열할까 어케 꽃을까 고민하다보면 세상 모르게 시간이 흐르고 있어요',
    imageUrl: '', // 이미지 없음
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  try {
    const docRef = await addDoc(collection(db, 'reading_submissions'), submissionData);
    console.log('✅ 제출 데이터 추가 완료!');
    console.log(`📄 Document ID: ${docRef.id}\n`);
    console.log('📋 추가된 데이터:');
    console.log(JSON.stringify(submissionData, null, 2));
  } catch (error) {
    console.error('❌ 제출 데이터 추가 실패:', error);
  }
}

addYesterdaySubmission().catch(console.error);
