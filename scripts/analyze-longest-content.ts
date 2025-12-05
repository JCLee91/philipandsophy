/**
 * 4-1기와 4-2기의 가장 긴 독서 감상평과 가치관 답변 분석
 */

import { getAdminDb } from '../src/lib/firebase/admin';
import { format } from 'date-fns';

interface SubmissionData {
  participantId: string;
  review?: string;
  dailyAnswer?: string;
  dailyQuestion?: string;
  submittedAt?: { toDate: () => Date };
  submissionDate?: string;
  cohortId?: string;
  status?: string;
}

interface ParticipantData {
  name: string;
  cohortId: string;
}

async function main() {
  const db = getAdminDb();

  // 1. 4-1기와 4-2기 코호트 ID 찾기
  const cohortsSnapshot = await db.collection('cohorts').get();
  const targetCohorts: { id: string; name: string }[] = [];

  cohortsSnapshot.forEach(doc => {
    const data = doc.data();
    if (data.name?.includes('4-1') || data.name?.includes('4-2')) {
      targetCohorts.push({ id: doc.id, name: data.name });
    }
  });

  console.log('\n=== 대상 코호트 ===');
  targetCohorts.forEach(c => console.log(`${c.name}: ${c.id}`));

  const cohortIds = targetCohorts.map(c => c.id);

  // 2. 해당 코호트의 참가자 목록 가져오기
  const participantMap = new Map<string, ParticipantData>();

  for (const cohortId of cohortIds) {
    const participantsSnapshot = await db.collection('participants')
      .where('cohortId', '==', cohortId)
      .get();

    participantsSnapshot.forEach(doc => {
      const data = doc.data();
      participantMap.set(doc.id, {
        name: data.name,
        cohortId: cohortId,
      });
    });
  }

  console.log(`\n총 참가자 수: ${participantMap.size}명`);

  // 3. 해당 참가자들의 제출물 분석 (기수별로)
  const submissionsSnapshot = await db.collection('reading_submissions')
    .where('status', '==', 'approved')
    .get();

  // 기수별 최고 기록 저장
  const longestReviews: Record<string, { length: number; name: string; date: string; cohort: string; review: string }> = {};
  const longestAnswers: Record<string, { length: number; name: string; date: string; cohort: string; question: string; answer: string }> = {};

  // 초기화
  for (const cohort of targetCohorts) {
    longestReviews[cohort.id] = { length: 0, name: '', date: '', cohort: cohort.name, review: '' };
    longestAnswers[cohort.id] = { length: 0, name: '', date: '', cohort: cohort.name, question: '', answer: '' };
  }

  submissionsSnapshot.forEach(doc => {
    const data = doc.data() as SubmissionData;
    const participant = participantMap.get(data.participantId);

    if (!participant) return; // 4-1, 4-2기 참가자가 아님

    const cohortId = participant.cohortId;
    const cohortName = targetCohorts.find(c => c.id === cohortId)?.name || '';
    const submissionDate = data.submissionDate ||
      (data.submittedAt ? format(data.submittedAt.toDate(), 'yyyy-MM-dd') : '날짜 없음');

    // 독서 감상평 길이 체크
    if (data.review) {
      const reviewLength = data.review.length;
      if (reviewLength > longestReviews[cohortId].length) {
        longestReviews[cohortId] = {
          length: reviewLength,
          name: participant.name,
          date: submissionDate,
          cohort: cohortName,
          review: data.review,
        };
      }
    }

    // 가치관 답변 길이 체크
    if (data.dailyAnswer) {
      const answerLength = data.dailyAnswer.length;
      if (answerLength > longestAnswers[cohortId].length) {
        longestAnswers[cohortId] = {
          length: answerLength,
          name: participant.name,
          date: submissionDate,
          cohort: cohortName,
          question: data.dailyQuestion || '',
          answer: data.dailyAnswer,
        };
      }
    }
  });

  // 4. 결과 출력 (기수별)
  for (const cohort of targetCohorts) {
    const review = longestReviews[cohort.id];
    const answer = longestAnswers[cohort.id];

    console.log('\n' + '='.repeat(60));
    console.log(`📚 [${cohort.name}] 가장 긴 독서 감상평`);
    console.log('='.repeat(60));
    console.log(`이름: ${review.name}`);
    console.log(`날짜: ${review.date}`);
    console.log(`글자수: ${review.length}자`);

    console.log('\n' + '-'.repeat(60));
    console.log(`💭 [${cohort.name}] 가장 긴 가치관 답변`);
    console.log('-'.repeat(60));
    console.log(`이름: ${answer.name}`);
    console.log(`날짜: ${answer.date}`);
    console.log(`글자수: ${answer.length}자`);
    console.log(`질문: ${answer.question}`);
  }
}

main().catch(console.error);
