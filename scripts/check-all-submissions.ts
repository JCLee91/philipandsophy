/**
 * 3기 모든 인증 조회 (status 무관)
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

async function checkAllSubmissions() {
  try {
    const cohortId = '3';

    console.log(`📊 3기 모든 인증 조회 (status 무관)\n`);

    // 모든 인증 조회
    const submissionsSnapshot = await db
      .collection('reading_submissions')
      .where('cohortId', '==', cohortId)
      .get();

    console.log(`총 인증 건수: ${submissionsSnapshot.size}건\n`);

    // status별 분류
    const byStatus = new Map<string, any[]>();
    const byParticipant = new Map<string, any[]>();

    submissionsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const status = data.status || 'unknown';
      const participationCode = data.participationCode || 'unknown';

      // status별
      if (!byStatus.has(status)) {
        byStatus.set(status, []);
      }
      byStatus.get(status)!.push({ ...data, id: doc.id });

      // 참가자별
      if (!byParticipant.has(participationCode)) {
        byParticipant.set(participationCode, []);
      }
      byParticipant.get(participationCode)!.push({ ...data, id: doc.id });
    });

    // Status별 통계
    console.log('='.repeat(80));
    console.log('Status별 통계:\n');
    Array.from(byStatus.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .forEach(([status, submissions]) => {
        console.log(`  ${status}: ${submissions.length}건`);
      });
    console.log('');

    // 참가자별 인증 내역
    console.log('='.repeat(80));
    console.log('참가자별 인증 내역:\n');

    Array.from(byParticipant.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .forEach(([code, submissions]) => {
        console.log(`${code}:`);
        submissions
          .sort((a, b) => (a.submissionDate || '').localeCompare(b.submissionDate || ''))
          .forEach(sub => {
            console.log(`  - ${sub.submissionDate || '날짜없음'} [${sub.status}] ${sub.id}`);
          });
        console.log('');
      });

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  }
}

checkAllSubmissions()
  .then(() => {
    console.log('✅ 조회 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 조회 실패:', error);
    process.exit(1);
  });
