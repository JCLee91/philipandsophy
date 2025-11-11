/**
 * 매칭 공식 변경 영향 분석 (간소화 버전)
 *
 * 기존: 2 × (submissionCount + 1)
 * 신규: 2 × (submissionCount + 2)
 *
 * DB의 실제 할당 개수만 확인하여:
 * 1. 짝수/홀수 체크
 * 2. 날짜별 할당 개수 분포
 * 3. 최소/최대/평균 할당 개수
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

async function analyzeMatchingFormulaImpact() {
  try {
    const cohortId = '3';
    console.log(`🔍 Cohort ${cohortId} 매칭 공식 영향 분석\n`);

    // dailyFeaturedParticipants에서 매칭 데이터 조회
    const cohortDoc = await db.collection('cohorts').doc(cohortId).get();
    const cohortData = cohortDoc.data();

    if (!cohortData?.dailyFeaturedParticipants) {
      console.log('❌ dailyFeaturedParticipants 데이터 없음');
      return;
    }

    const dailyData = cohortData.dailyFeaturedParticipants;
    const dates = Object.keys(dailyData).sort();

    console.log(`📅 총 ${dates.length}개 날짜의 매칭 데이터 발견\n`);

    // 전체 통계 수집
    const allCounts: number[] = [];
    const dateStats: Record<string, {
      min: number;
      max: number;
      avg: number;
      counts: number[];
    }> = {};

    for (const date of dates) {
      const dayData = dailyData[date];

      if (!dayData.assignments) {
        console.log(`⚠️ ${date}: assignments 없음`);
        continue;
      }

      const assignments = dayData.assignments;
      const participantIds = Object.keys(assignments);
      const counts: number[] = [];

      for (const participantId of participantIds) {
        const assignment = assignments[participantId];
        const assigned = assignment.assigned || [];
        const count = assigned.length;
        counts.push(count);
        allCounts.push(count);
      }

      const min = Math.min(...counts);
      const max = Math.max(...counts);
      const avg = counts.reduce((sum, c) => sum + c, 0) / counts.length;

      dateStats[date] = { min, max, avg, counts };
    }

    // 날짜별 상세 출력
    console.log('=== 날짜별 할당 개수 분포 ===\n');
    dates.forEach(date => {
      if (!dateStats[date]) {
        console.log(`${date}: ⚠️ 데이터 없음`);
        return;
      }

      const stats = dateStats[date];
      const participantCount = stats.counts.length;

      // 개수별 분포 계산
      const distribution = new Map<number, number>();
      stats.counts.forEach(count => {
        distribution.set(count, (distribution.get(count) || 0) + 1);
      });

      const distributionStr = Array.from(distribution.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([count, freq]) => `${count}개: ${freq}명`)
        .join(', ');

      console.log(`${date}:`);
      console.log(`   참가자: ${participantCount}명`);
      console.log(`   범위: ${stats.min}~${stats.max}개 (평균: ${stats.avg.toFixed(1)}개)`);
      console.log(`   분포: ${distributionStr}`);
    });

    // 전체 통계
    console.log('\n\n=== 전체 통계 ===\n');

    const totalAssignments = allCounts.length;
    const minCount = Math.min(...allCounts);
    const maxCount = Math.max(...allCounts);
    const avgCount = allCounts.reduce((sum, c) => sum + c, 0) / allCounts.length;

    // 짝수/홀수 체크
    const oddCounts = allCounts.filter(c => c % 2 !== 0);
    const evenCounts = allCounts.filter(c => c % 2 === 0);

    console.log(`총 할당 건수: ${totalAssignments}건`);
    console.log(`할당 개수 범위: ${minCount}~${maxCount}개`);
    console.log(`평균 할당 개수: ${avgCount.toFixed(2)}개`);
    console.log('');
    console.log(`✅ 짝수 할당: ${evenCounts.length}건 (${((evenCounts.length / totalAssignments) * 100).toFixed(1)}%)`);
    console.log(`⚠️ 홀수 할당: ${oddCounts.length}건 (${((oddCounts.length / totalAssignments) * 100).toFixed(1)}%)`);

    // 개수별 분포
    const overallDistribution = new Map<number, number>();
    allCounts.forEach(count => {
      overallDistribution.set(count, (overallDistribution.get(count) || 0) + 1);
    });

    console.log('\n=== 할당 개수별 분포 ===\n');
    Array.from(overallDistribution.entries())
      .sort((a, b) => a[0] - b[0])
      .forEach(([count, freq]) => {
        const percentage = ((freq / totalAssignments) * 100).toFixed(1);
        const bar = '█'.repeat(Math.floor(freq / 5));
        console.log(`${count}개: ${freq}명 (${percentage}%) ${bar}`);
      });

    // 공식 역산 분석
    console.log('\n\n=== 공식 역산 분석 ===\n');
    console.log('기존 공식: 2 × (n + 1) → 2, 4, 6, 8, 10, 12, ...');
    console.log('신규 공식: 2 × (n + 2) → 4, 6, 8, 10, 12, 14, ...');
    console.log('');

    // 기존 공식으로 가능한 개수
    const oldFormulaPossible = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20];
    // 신규 공식으로만 가능한 개수는 없음 (모두 기존 공식에도 포함됨)
    // 하지만 2개는 신규 공식으로는 불가능 (최소 4개)

    const twoCountAssignments = allCounts.filter(c => c === 2).length;
    const fourOrMoreAssignments = allCounts.filter(c => c >= 4).length;

    if (twoCountAssignments > 0) {
      console.log(`📌 2개 할당: ${twoCountAssignments}건 → 기존 공식 (n=0) 사용 중`);
      console.log(`   신규 공식으로 변경 시 4개로 증가 (n=0 → 4개)`);
    } else {
      console.log(`✅ 2개 할당 없음 → 이미 신규 공식 적용되었을 가능성`);
    }

    console.log('');
    console.log(`4개 이상 할당: ${fourOrMoreAssignments}건`);

    // 권장사항
    console.log('\n\n=== 권장사항 ===\n');

    if (twoCountAssignments > 0) {
      console.log('📌 기존 공식 사용 중 (2개 할당 존재)');
      console.log('');
      console.log('✅ 옵션 1) 그대로 유지 (추천)');
      console.log('   • 내일 새벽 2시부터 신규 공식 자동 적용');
      console.log('   • 기존 데이터 유지 (일관성)');
      console.log('   • 인증 0회 사용자: 2개 → 4개로 자연스럽게 증가');
      console.log('   • 수동 작업 불필요');
      console.log('');
      console.log('⚠️ 옵션 2) 과거 데이터 재생성');
      console.log('   • 모든 날짜 데이터를 신규 공식으로 재생성');
      console.log('   • 사용자 경험 급변 (갑자기 프로필북 +2개)');
      console.log('   • 이미 본 프로필북 개수 변경 (혼란 가능성)');
      console.log('   • 수동 스크립트 필요 + 백업 권장');
    } else {
      console.log('✅ 2개 할당 없음 → 신규 공식 적용 가능성 높음');
      console.log('   • 현재 데이터 유지 권장');
      console.log('   • 추가 조치 불필요');
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  }
}

// 실행
analyzeMatchingFormulaImpact()
  .then(() => {
    console.log('\n✅ 분석 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 분석 실패:', error);
    process.exit(1);
  });
