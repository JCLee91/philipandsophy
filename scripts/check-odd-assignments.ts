/**
 * 홀수 개수 할당 확인
 *
 * 2의 배수가 아닌 프로필북을 받은 사람들 확인
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

async function checkOddAssignments() {
  try {
    const cohortId = '3';
    const date = '2025-11-10';

    console.log(`🔍 ${date} 홀수 할당 확인 중...\n`);

    // 1. dailyFeaturedParticipants 가져오기
    const cohortDoc = await db.collection('cohorts').doc(cohortId).get();
    const cohortData = cohortDoc.data();
    const dailyFeaturedParticipants = cohortData?.dailyFeaturedParticipants || {};
    const matching = dailyFeaturedParticipants[date];

    if (!matching) {
      console.log(`❌ ${date} 매칭 데이터 없음`);
      return;
    }

    console.log(`✅ ${date} 매칭 데이터 발견\n`);

    // 2. 참가자별 할당 개수 확인
    const assignments = matching.assignments || {};
    const oddAssignments: Array<{ id: string; name: string; count: number; expected: number; submissionCount: number }> = [];

    for (const [participantId, data] of Object.entries(assignments)) {
      const assigned = (data as any).assigned || [];
      const count = assigned.length;

      // 홀수인지 확인
      if (count % 2 !== 0) {
        // 참가자 정보 조회
        const participantDoc = await db.collection('participants').doc(participantId).get();
        const participantData = participantDoc.data();

        // 누적 인증 횟수 계산
        const submissionsSnapshot = await db
          .collection('reading_submissions')
          .where('participantId', '==', participantId)
          .where('status', '==', 'approved')
          .where('submissionDate', '<=', date)
          .get();

        const submissionCount = submissionsSnapshot.size;
        const expectedCount = 2 * (submissionCount + 1);

        oddAssignments.push({
          id: participantId,
          name: participantData?.name || participantId,
          count,
          expected: expectedCount,
          submissionCount,
        });
      }
    }

    // 3. 결과 출력
    console.log('=== 홀수 할당 참가자 ===\n');

    if (oddAssignments.length === 0) {
      console.log('✅ 모두 2의 배수로 정상 할당\n');
    } else {
      console.log(`⚠️  ${oddAssignments.length}명이 홀수 개수 할당받음:\n`);

      oddAssignments.sort((a, b) => b.count - a.count);

      for (const assignment of oddAssignments) {
        console.log(`📌 ${assignment.name} (${assignment.id}):`);
        console.log(`   실제: ${assignment.count}개`);
        console.log(`   예상: ${assignment.expected}개 (누적 인증: ${assignment.submissionCount}회)`);
        console.log(`   차이: ${assignment.expected - assignment.count}개 부족\n`);
      }
    }

    // 4. 전체 통계
    const totalParticipants = Object.keys(assignments).length;
    const allCounts = Object.values(assignments).map((data: any) => (data.assigned || []).length);
    const avgCount = allCounts.reduce((sum, c) => sum + c, 0) / allCounts.length;
    const minCount = Math.min(...allCounts);
    const maxCount = Math.max(...allCounts);

    console.log('=== 전체 통계 ===');
    console.log(`총 참가자: ${totalParticipants}명`);
    console.log(`평균 할당: ${avgCount.toFixed(1)}개`);
    console.log(`최소 할당: ${minCount}개`);
    console.log(`최대 할당: ${maxCount}개`);
    console.log(`홀수 할당: ${oddAssignments.length}명`);

    // 5. 할당 개수별 분포
    const distribution = new Map<number, number>();
    allCounts.forEach(count => {
      distribution.set(count, (distribution.get(count) || 0) + 1);
    });

    console.log('\n=== 할당 개수 분포 ===');
    const sortedCounts = Array.from(distribution.keys()).sort((a, b) => a - b);
    sortedCounts.forEach(count => {
      const participantCount = distribution.get(count)!;
      const bar = '█'.repeat(Math.ceil(participantCount / 2));
      console.log(`${count}개: ${bar} ${participantCount}명`);
    });

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  }
}

// 실행
checkOddAssignments()
  .then(() => {
    console.log('\n✅ 스크립트 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 스크립트 실패:', error);
    process.exit(1);
  });
