/**
 * 검증: 4-1기와 4-2기 상위 5개씩 확인
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

  // 3. 모든 제출물 수집
  const submissionsSnapshot = await db.collection('reading_submissions')
    .where('status', '==', 'approved')
    .get();

  // 기수별 데이터 수집
  const reviewsByCohort: Record<string, Array<{ name: string; date: string; length: number }>> = {
    '4-1': [],
    '4-2': [],
  };
  const answersByCohort: Record<string, Array<{ name: string; date: string; length: number; question: string }>> = {
    '4-1': [],
    '4-2': [],
  };

  submissionsSnapshot.forEach(doc => {
    const data = doc.data() as SubmissionData;
    const participant = participantMap.get(data.participantId);

    if (!participant) return;

    const cohortId = participant.cohortId;
    const submissionDate = data.submissionDate ||
      (data.submittedAt ? format(data.submittedAt.toDate(), 'yyyy-MM-dd') : '날짜 없음');

    if (data.review && data.review.length > 0) {
      reviewsByCohort[cohortId].push({
        name: participant.name,
        date: submissionDate,
        length: data.review.length,
      });
    }

    if (data.dailyAnswer && data.dailyAnswer.length > 0) {
      answersByCohort[cohortId].push({
        name: participant.name,
        date: submissionDate,
        length: data.dailyAnswer.length,
        question: data.dailyQuestion || '',
      });
    }
  });

  // 4. 정렬 및 출력
  for (const cohortId of ['4-1', '4-2']) {
    console.log('\n' + '='.repeat(70));
    console.log(`[${cohortId}] 독서 감상평 TOP 5 (길이순)`);
    console.log('='.repeat(70));

    const sortedReviews = reviewsByCohort[cohortId].sort((a, b) => b.length - a.length);
    sortedReviews.slice(0, 5).forEach((r, i) => {
      console.log(`${i + 1}. ${r.name} | ${r.date} | ${r.length}자`);
    });
    console.log(`총 제출 수: ${sortedReviews.length}개`);

    console.log('\n' + '-'.repeat(70));
    console.log(`[${cohortId}] 가치관 답변 TOP 5 (길이순)`);
    console.log('-'.repeat(70));

    const sortedAnswers = answersByCohort[cohortId].sort((a, b) => b.length - a.length);
    sortedAnswers.slice(0, 5).forEach((r, i) => {
      console.log(`${i + 1}. ${r.name} | ${r.date} | ${r.length}자`);
    });
    console.log(`총 제출 수: ${sortedAnswers.length}개`);
  }
}

main().catch(console.error);
