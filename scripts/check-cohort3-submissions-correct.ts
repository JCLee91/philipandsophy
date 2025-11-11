/**
 * 3기 참가자들의 누적 인증 횟수 조회 (올바른 방법)
 *
 * reading_submissions에는 cohortId가 없으므로:
 * 1. 3기 참가자 목록 조회
 * 2. 해당 참가자들의 participationCode로 인증 필터링
 */

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const app = initializeApp({
  credential: applicationDefault(),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
});

const db = getFirestore(app, 'seoul');

async function checkCohort3SubmissionsCorrect() {
  try {
    const cohortId = '3';
    const targetDate = '2025-11-10'; // 매칭 날짜

    console.log(`📊 3기 참가자 누적 인증 횟수 조회 (올바른 방법)\n`);

    // 1. 3기 참가자 목록 조회
    const participantsSnapshot = await db
      .collection('participants')
      .where('cohortId', '==', cohortId)
      .get();

    const participationCodes = new Set<string>();
    const participantMap = new Map<string, any>();

    participantsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const code = data.participationCode || doc.id;
      participationCodes.add(code);
      participantMap.set(code, {
        id: doc.id,
        name: data.name || doc.id,
        participationCode: code,
      });
    });

    console.log(`3기 참가자: ${participationCodes.size}명`);
    console.log(`participationCodes: ${Array.from(participationCodes).slice(0, 5).join(', ')}...\n`);

    // 2. 모든 인증 조회 (cohortId 필터 없이)
    const allSubmissionsSnapshot = await db
      .collection('reading_submissions')
      .get();

    console.log(`전체 인증: ${allSubmissionsSnapshot.size}건\n`);

    // 3. 3기 참가자의 인증만 필터링
    const cohort3Submissions = allSubmissionsSnapshot.docs.filter(doc => {
      const data = doc.data();
      return participationCodes.has(data.participationCode);
    });

    console.log(`3기 인증: ${cohort3Submissions.length}건\n`);

    // 4. status별 분류
    const byStatus = new Map<string, number>();
    cohort3Submissions.forEach(doc => {
      const status = doc.data().status || 'unknown';
      byStatus.set(status, (byStatus.get(status) || 0) + 1);
    });

    console.log('='.repeat(80));
    console.log('Status별 통계:\n');
    Array.from(byStatus.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([status, count]) => {
        console.log(`  ${status}: ${count}건`);
      });
    console.log('');

    // 5. 참가자별 누적 인증 횟수 (targetDate 이전, approved만)
    const results: Array<{
      id: string;
      name: string;
      participationCode: string;
      approvedCount: number;
      allCount: number;
      approvedDates: string[];
      allDates: string[];
    }> = [];

    Array.from(participantMap.values()).forEach(participant => {
      const code = participant.participationCode;

      // 해당 참가자의 모든 인증
      const allSubs = cohort3Submissions.filter(doc =>
        doc.data().participationCode === code
      );

      // targetDate 이전 approved 인증
      const approvedSubs = allSubs.filter(doc => {
        const data = doc.data();
        return (
          data.status === 'approved' &&
          data.submissionDate &&
          data.submissionDate < targetDate
        );
      });

      const allDates = new Set(allSubs.map(doc => doc.data().submissionDate));
      const approvedDates = new Set(approvedSubs.map(doc => doc.data().submissionDate));

      results.push({
        id: participant.id,
        name: participant.name,
        participationCode: code,
        approvedCount: approvedDates.size,
        allCount: allDates.size,
        approvedDates: Array.from(approvedDates).sort(),
        allDates: Array.from(allDates).sort(),
      });
    });

    // 6. 출력 (approved 횟수 기준 정렬)
    results.sort((a, b) => b.approvedCount - a.approvedCount);

    console.log('='.repeat(80));
    console.log('참가자별 누적 인증 횟수:\n');

    results.forEach(r => {
      if (r.allCount > 0) {
        const expected = 2 * (r.approvedCount + 2);
        console.log(`${r.name} (${r.id})`);
        console.log(`  participationCode: ${r.participationCode}`);
        console.log(`  Approved 인증: ${r.approvedCount}회 (${r.approvedDates.join(', ') || '없음'})`);
        console.log(`  전체 인증: ${r.allCount}회 (${r.allDates.join(', ') || '없음'})`);
        console.log(`  예상 프로필북: ${expected}개`);
        console.log('');
      }
    });

    // 7. 인증 없는 참가자 수
    const noSubmission = results.filter(r => r.allCount === 0).length;
    console.log(`인증 없는 참가자: ${noSubmission}명\n`);

    // 8. 통계
    console.log('='.repeat(80));
    console.log('통계:\n');

    const distribution = new Map<number, number>();
    results.forEach(r => {
      distribution.set(r.approvedCount, (distribution.get(r.approvedCount) || 0) + 1);
    });

    Array.from(distribution.entries())
      .sort((a, b) => a[0] - b[0])
      .forEach(([count, freq]) => {
        console.log(`  ${count}회 approved 인증: ${freq}명`);
      });

    console.log('');

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  }
}

checkCohort3SubmissionsCorrect()
  .then(() => {
    console.log('✅ 조회 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 조회 실패:', error);
    process.exit(1);
  });
