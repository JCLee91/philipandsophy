/**
 * AI 매칭 시스템 테스트 스크립트
 * 오늘 날짜로 테스트 제출 데이터를 생성하고 AI 매칭을 실행합니다.
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { getDailyQuestionText } from '@/constants/daily-questions';
import { getTodayString } from '@/lib/date-utils';
import { matchParticipantsByAI, ParticipantAnswer } from '@/lib/ai-matching';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const serviceAccount = require('../../firebase-service-account.json');

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();

async function testAIMatching() {
  try {
    console.log('🧪 AI 매칭 시스템 테스트 시작...\n');

    const today = getTodayString();
    const todayQuestion = getDailyQuestionText();

    console.log(`📅 날짜: ${today}`);
    console.log(`❓ 오늘의 질문: ${todayQuestion}\n`);

    // 1. 테스트용 제출 데이터 생성
    console.log('📝 테스트 제출 데이터 생성 중...\n');

    const testSubmissions = [
      {
        participantId: '1',
        participationCode: '1',
        bookTitle: 'Test Book 1',
        bookImageUrl: 'https://via.placeholder.com/400',
        review: '테스트 리뷰 1',
        dailyQuestion: todayQuestion,
        dailyAnswer: '성장과 배움을 위해 이 직업을 선택했습니다. 매일 새로운 도전과 성취감을 느낄 수 있어서 좋아요.',
        submissionDate: today,
        submittedAt: Timestamp.now(),
        status: 'approved',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      {
        participantId: '2',
        participationCode: '2',
        bookTitle: 'Test Book 2',
        bookImageUrl: 'https://via.placeholder.com/400',
        review: '테스트 리뷰 2',
        dailyQuestion: todayQuestion,
        dailyAnswer: '안정적인 수입과 워라밸이 좋아서 선택했어요. 일과 개인 생활의 균형이 가장 큰 매력이라고 생각합니다.',
        submissionDate: today,
        submittedAt: Timestamp.now(),
        status: 'approved',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      {
        participantId: '3',
        participationCode: '3',
        bookTitle: 'Test Book 3',
        bookImageUrl: 'https://via.placeholder.com/400',
        review: '테스트 리뷰 3',
        dailyQuestion: todayQuestion,
        dailyAnswer: '사회에 기여하고 싶어서 이 직업을 택했습니다. 다른 사람들에게 긍정적인 영향을 줄 수 있다는 점이 가장 큰 보람입니다.',
        submissionDate: today,
        submittedAt: Timestamp.now(),
        status: 'approved',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      {
        participantId: '4',
        participationCode: '4',
        bookTitle: 'Test Book 4',
        bookImageUrl: 'https://via.placeholder.com/400',
        review: '테스트 리뷰 4',
        dailyQuestion: todayQuestion,
        dailyAnswer: '고수익을 추구하기 위해 선택했습니다. 경쟁에서 이기고 성과를 내는 것이 재미있고, 금전적 보상이 큰 매력이에요.',
        submissionDate: today,
        submittedAt: Timestamp.now(),
        status: 'approved',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      {
        participantId: '5',
        participationCode: '5',
        bookTitle: 'Test Book 5',
        bookImageUrl: 'https://via.placeholder.com/400',
        review: '테스트 리뷰 5',
        dailyQuestion: todayQuestion,
        dailyAnswer: '창의적인 작업을 할 수 있어서 이 직업을 선택했어요. 내 아이디어를 현실로 만들 수 있다는 점이 가장 좋습니다.',
        submissionDate: today,
        submittedAt: Timestamp.now(),
        status: 'approved',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
    ];

    for (const submission of testSubmissions) {
      await db.collection('reading_submissions').add(submission);
    }

    console.log(`✅ ${testSubmissions.length}개의 테스트 제출 데이터 생성 완료\n`);

    // 2. 참가자 정보와 답변 수집
    const participantAnswers: ParticipantAnswer[] = [
      { id: '1', name: '참가자 1', answer: testSubmissions[0].dailyAnswer },
      { id: '2', name: '참가자 2', answer: testSubmissions[1].dailyAnswer },
      { id: '3', name: '참가자 3', answer: testSubmissions[2].dailyAnswer },
      { id: '4', name: '참가자 4', answer: testSubmissions[3].dailyAnswer },
      { id: '5', name: '참가자 5', answer: testSubmissions[4].dailyAnswer },
    ];

    // 3. AI 매칭 수행
    console.log('🧠 AI 분석 중...\n');
    const matching = await matchParticipantsByAI(todayQuestion, participantAnswers);

    console.log('✨ 매칭 결과:');
    console.log(`   총 참가자 수: ${Object.keys(matching.assignments).length}`);
    console.log(`   모든 참가자에게 개별 추천 제공\n`);

    // 4. Cohort 문서에 저장
    const cohortDoc = await db.collection('cohorts').doc('1').get();
    if (!cohortDoc.exists) {
      throw new Error('Cohort not found');
    }

    const dailyFeaturedParticipants = cohortDoc.data()?.dailyFeaturedParticipants || {};
    dailyFeaturedParticipants[today] = matching;

    await cohortDoc.ref.update({
      dailyFeaturedParticipants,
      updatedAt: Timestamp.now(),
    });

    console.log('💾 Firebase에 매칭 결과 저장 완료\n');
    console.log('🎉 AI 매칭 테스트 완료!');

  } catch (error) {
    console.error('❌ 에러 발생:', error);
    throw error;
  }
}

testAIMatching()
  .then(() => {
    console.log('\n✅ 테스트 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 테스트 실패:', error);
    process.exit(1);
  });
