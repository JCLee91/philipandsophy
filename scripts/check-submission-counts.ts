/**
 * 3기 참가자들의 누적 인증 횟수 조회
 *
 * 11-10 기준: 11-09 이전 approved 인증만 카운트
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

async function checkSubmissionCounts() {
  try {
    const cohortId = '3';
    const targetDate = '2025-11-10'; // 매칭 날짜

    console.log(`📊 3기 참가자 누적 인증 횟수 조회 (${targetDate} 기준)\n`);
    console.log(`   → ${targetDate} 이전 approved 인증만 카운트\n`);

    // 1. 참가자 목록 조회
    const participantsSnapshot = await db
      .collection('participants')
      .where('cohortId', '==', cohortId)
      .get();

    console.log(`총 참가자: ${participantsSnapshot.size}명\n`);

    // 2. 모든 approved 인증 조회
    const submissionsSnapshot = await db
      .collection('reading_submissions')
      .where('cohortId', '==', cohortId)
      .where('status', '==', 'approved')
      .get();

    console.log(`총 approved 인증: ${submissionsSnapshot.size}건\n`);

    // 3. 참가자별 카운트
    const results: Array<{
      id: string;
      name: string;
      participationCode: string;
      submissionCount: number;
      submissionDates: string[];
    }> = [];

    participantsSnapshot.docs.forEach(doc => {
      const participant = doc.data();
      const participationCode = participant.participationCode || doc.id;

      // 해당 참가자의 targetDate 이전 approved 인증
      const submissions = submissionsSnapshot.docs.filter(subDoc => {
        const data = subDoc.data();
        return (
          data.participationCode === participationCode &&
          data.submissionDate &&
          data.submissionDate < targetDate
        );
      });

      const uniqueDates = new Set(submissions.map(s => s.data().submissionDate));
      const sortedDates = Array.from(uniqueDates).sort();

      results.push({
        id: doc.id,
        name: participant.name || doc.id,
        participationCode,
        submissionCount: uniqueDates.size,
        submissionDates: sortedDates,
      });
    });

    // 4. 인증 횟수별로 정렬 후 출력
    results.sort((a, b) => b.submissionCount - a.submissionCount);

    console.log('='.repeat(80));
    console.log('참가자별 누적 인증 횟수:\n');

    results.forEach(r => {
      const expected = 2 * (r.submissionCount + 2);
      console.log(`${r.name} (${r.id})`);
      console.log(`  participationCode: ${r.participationCode}`);
      console.log(`  누적 인증: ${r.submissionCount}회`);
      console.log(`  인증 날짜: ${r.submissionDates.join(', ') || '없음'}`);
      console.log(`  예상 프로필북: ${expected}개`);
      console.log('');
    });

    // 5. 통계
    console.log('='.repeat(80));
    console.log('통계:\n');

    const distribution = new Map<number, number>();
    results.forEach(r => {
      distribution.set(r.submissionCount, (distribution.get(r.submissionCount) || 0) + 1);
    });

    Array.from(distribution.entries())
      .sort((a, b) => a[0] - b[0])
      .forEach(([count, freq]) => {
        console.log(`  ${count}회 인증: ${freq}명`);
      });

    console.log('');

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  }
}

checkSubmissionCounts()
  .then(() => {
    console.log('✅ 조회 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 조회 실패:', error);
    process.exit(1);
  });
