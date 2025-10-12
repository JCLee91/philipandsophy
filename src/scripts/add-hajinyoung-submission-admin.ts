/**
 * Firebase Admin SDK로 하진영-5953 어제 제출 데이터 추가
 */

import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// .env.local 로드
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

// Firebase Admin 초기화
function initAdmin() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const serviceAccountPath = resolve(process.cwd(), 'firebase-service-account.json');

  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccountPath),
  });
}

async function addYesterdaySubmission() {
  console.log('🔥 Firebase Admin 초기화 중...\n');
  const app = initAdmin();
  const db = app.firestore();

  const yesterday = '2025-10-11';
  const yesterdayQuestion = '일상에서 가장 즐거움이나 몰입감을 느끼는 순간은 언제인가요?';

  console.log('📝 하진영-5953 어제 제출 데이터 추가 중...');
  console.log(`📅 제출 날짜: ${yesterday}`);
  console.log(`❓ 데일리 질문: ${yesterdayQuestion}\n`);

  const submissionData = {
    participantId: '하진영-5953',
    cohortId: '10',
    submissionDate: yesterday,
    bookTitle: '귀욤미소 ㅡ 아가씨와 밤(2025 이전버전)',
    bookReview: '첫 도입부분을 읽었어요. 밀수업자.. 어떤 무엇을 밀수할지, 도입부를 어떻게 잡느냐에 따라 눈길을 확 끌어 당기는 대목이 좋아요',
    dailyQuestion: yesterdayQuestion,
    dailyAnswer: '"꽃꽂이할 때" 이파리 다듬고 가시제거하고 꽃을 어떻게 배열할까 어케 꽃을까 고민하다보면 세상 모르게 시간이 흐르고 있어요',
    imageUrl: '',
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now(),
  };

  try {
    const docRef = await db.collection('reading_submissions').add(submissionData);
    console.log('✅ 제출 데이터 추가 완료!');
    console.log(`📄 Document ID: ${docRef.id}\n`);
    console.log('📋 추가된 데이터:');
    console.log(JSON.stringify(submissionData, null, 2));
  } catch (error) {
    console.error('❌ 제출 데이터 추가 실패:', error);
    throw error;
  }
}

addYesterdaySubmission()
  .then(() => {
    console.log('\n✅ 완료!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 에러:', error);
    process.exit(1);
  });
