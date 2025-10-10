/**
 * 매일 자정에 실행되어 다음날의 프로필북 매칭을 생성하는 스크립트
 *
 * 실행 방법:
 * npm run generate:matching
 */

import * as dotenv from 'dotenv';
import * as admin from 'firebase-admin';
import { getDailyQuestionText } from '@/constants/daily-questions';
import { matchParticipantsByAI, ParticipantAnswer } from '@/lib/ai-matching';
import { getTodayString } from '@/lib/date-utils';

// 환경 변수 로드
dotenv.config({ path: '.env.local' });

// Firebase Admin 초기화
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json';

if (!admin.apps.length) {
  const serviceAccount = require(`../../${serviceAccountPath}`);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

interface SubmissionData {
  participantId: string;
  dailyQuestion: string;
  dailyAnswer: string;
  submissionDate: string;
}

interface ParticipantData {
  id: string;
  name: string;
}

async function generateDailyMatching() {
  try {
    console.log('🤖 AI 매칭 시스템 시작...\n');

    // 1. 오늘의 질문 가져오기
    const todayQuestion = getDailyQuestionText();
    const today = getTodayString();

    console.log(`📅 날짜: ${today}`);
    console.log(`❓ 오늘의 질문: ${todayQuestion}\n`);

    // 2. Cohort ID 가져오기 (활성화된 첫 번째 cohort)
    const cohortsSnapshot = await db
      .collection('cohorts')
      .where('isActive', '==', true)
      .limit(1)
      .get();

    if (cohortsSnapshot.empty) {
      throw new Error('활성화된 cohort가 없습니다.');
    }

    const cohortDoc = cohortsSnapshot.docs[0];
    const cohortId = cohortDoc.id;
    console.log(`📚 Cohort ID: ${cohortId}\n`);

    // 3. 오늘 제출한 참가자들의 답변 가져오기
    const submissionsSnapshot = await db
      .collection('reading_submissions')
      .where('submissionDate', '==', today)
      .where('dailyQuestion', '==', todayQuestion)
      .get();

    console.log(`📝 오늘 제출한 참가자: ${submissionsSnapshot.size}명\n`);

    if (submissionsSnapshot.size < 4) {
      console.log('⚠️  매칭하기에 충분한 참가자가 없습니다 (최소 4명 필요).');
      console.log('   내일 다시 시도해주세요.');
      return;
    }

    // 4. 참가자 정보와 답변 수집
    const participantAnswers: ParticipantAnswer[] = [];
    const participantIds = new Set<string>();

    for (const doc of submissionsSnapshot.docs) {
      const submission = doc.data() as SubmissionData;

      // 중복 제거 (한 사람이 여러 번 제출한 경우 첫 번째만)
      if (participantIds.has(submission.participantId)) {
        continue;
      }
      participantIds.add(submission.participantId);

      // 참가자 이름 가져오기
      const participantDoc = await db
        .collection('participants')
        .doc(submission.participantId)
        .get();

      if (!participantDoc.exists) {
        console.warn(`⚠️  참가자 정보를 찾을 수 없음: ${submission.participantId}`);
        continue;
      }

      const participant = participantDoc.data() as ParticipantData;

      participantAnswers.push({
        id: submission.participantId,
        name: participant.name,
        answer: submission.dailyAnswer,
      });
    }

    console.log(`✅ 분석 대상 참가자: ${participantAnswers.length}명\n`);

    // 5. AI 매칭 수행
    console.log('🧠 AI 분석 중...\n');
    const matching = await matchParticipantsByAI(todayQuestion, participantAnswers);

    console.log('✨ 매칭 결과:');
    console.log(`   비슷한 가치관 (파란색): ${matching.similar.join(', ')}`);
    console.log(`   반대 가치관 (노란색): ${matching.opposite.join(', ')}\n`);

    // 6. Cohort 문서에 매칭 결과 저장
    const dailyFeaturedParticipants = cohortDoc.data()?.dailyFeaturedParticipants || {};
    dailyFeaturedParticipants[today] = {
      similar: matching.similar,
      opposite: matching.opposite,
    };

    await cohortDoc.ref.update({
      dailyFeaturedParticipants,
      updatedAt: admin.firestore.Timestamp.now(),
    });

    console.log('💾 Firebase에 매칭 결과 저장 완료\n');
    console.log('🎉 AI 매칭 시스템 실행 완료!');

  } catch (error) {
    console.error('❌ 에러 발생:', error);
    throw error;
  }
}

// 스크립트 실행
generateDailyMatching()
  .then(() => {
    console.log('\n✅ 스크립트 실행 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 스크립트 실행 실패:', error);
    process.exit(1);
  });
