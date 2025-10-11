/**
 * 제출 완료 카운트 디버깅 스크립트
 *
 * 실제 Firestore 데이터를 조회하여 제출 현황 확인
 */

import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import { getDailyQuestionText } from '../constants/daily-questions';
import { getTodayString } from '../lib/date-utils';

// 환경 변수 로드
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

/**
 * Firebase Admin 초기화
 */
function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin.firestore();
  }

  // 1. JSON 문자열 환경 변수 시도
  const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (serviceAccountEnv) {
    const serviceAccount = JSON.parse(serviceAccountEnv);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    return admin.firestore();
  }

  // 2. 파일 경로 환경 변수 시도
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (serviceAccountPath) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccountPath),
    });
    return admin.firestore();
  }

  throw new Error('FIREBASE_SERVICE_ACCOUNT 또는 FIREBASE_SERVICE_ACCOUNT_PATH 환경 변수가 설정되지 않았습니다.');
}

async function debugSubmissionCount() {
  console.log('🔍 제출 완료 카운트 디버깅 시작...\n');

  const db = initializeFirebaseAdmin();
  const today = getTodayString();
  const todayQuestion = getDailyQuestionText(today);

  console.log('📅 오늘 날짜:', today);
  console.log('❓ 오늘의 질문:', todayQuestion);
  console.log('');

  // 1. 모든 제출물 조회 (날짜 필터만)
  console.log('1️⃣ 오늘 날짜로 제출된 모든 독서 인증 조회...');
  const allTodaySubmissions = await db
    .collection('reading_submissions')
    .where('submissionDate', '==', today)
    .get();

  console.log(`   총 ${allTodaySubmissions.size}개 발견`);

  if (allTodaySubmissions.size > 0) {
    console.log('\n   📋 상세 정보:');
    allTodaySubmissions.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`   [${index + 1}] ID: ${doc.id}`);
      console.log(`       참가자: ${data.participantId}`);
      console.log(`       제출일: ${data.submissionDate}`);
      console.log(`       질문: ${data.dailyQuestion || '(없음)'}`);
      console.log(`       답변: ${data.dailyAnswer ? data.dailyAnswer.substring(0, 50) + '...' : '(없음)'}`);
      console.log(`       책 제목: ${data.bookTitle || '(없음)'}`);
      console.log('');
    });
  }

  // 2. 날짜 + 질문으로 필터링 (API 로직과 동일)
  console.log('2️⃣ API와 동일한 쿼리 실행 (날짜 + 질문)...');
  const apiQuerySubmissions = await db
    .collection('reading_submissions')
    .where('submissionDate', '==', today)
    .where('dailyQuestion', '==', todayQuestion)
    .get();

  console.log(`   총 ${apiQuerySubmissions.size}개 발견`);

  // 중복 제거
  const uniqueParticipantIds = new Set<string>();
  apiQuerySubmissions.docs.forEach((doc) => {
    const data = doc.data();
    uniqueParticipantIds.add(data.participantId);
  });

  console.log(`   고유 참가자: ${uniqueParticipantIds.size}명`);
  if (uniqueParticipantIds.size > 0) {
    console.log(`   참가자 ID: ${Array.from(uniqueParticipantIds).join(', ')}`);
  }

  // 3. 문제 진단
  console.log('\n🩺 문제 진단:');
  if (allTodaySubmissions.size === 0) {
    console.log('   ❌ 오늘 제출된 독서 인증이 아예 없습니다.');
    console.log('   → 참가자가 아직 제출하지 않았거나, submissionDate 형식이 잘못되었습니다.');
  } else if (apiQuerySubmissions.size === 0) {
    console.log('   ❌ 제출물은 있지만 dailyQuestion이 매칭되지 않습니다.');
    console.log('   → dailyQuestion 필드가 비어있거나, 질문 텍스트가 일치하지 않습니다.');
    console.log('');
    console.log('   💡 해결 방법:');
    console.log('   1. 독서 인증 다이얼로그에서 질문이 제대로 표시되는지 확인');
    console.log('   2. 제출 시 dailyQuestion이 저장되는지 확인');
    console.log(`   3. 예상 질문: "${todayQuestion}"`);
  } else {
    console.log('   ✅ 정상적으로 작동 중입니다!');
  }

  console.log('\n✅ 디버깅 완료');
  process.exit(0);
}

debugSubmissionCount().catch((error) => {
  console.error('❌ 오류 발생:', error);
  process.exit(1);
});
