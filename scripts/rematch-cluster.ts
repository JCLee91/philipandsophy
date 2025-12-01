#!/usr/bin/env tsx
/**
 * 클러스터 매칭 재실행 스크립트
 *
 * 특정 날짜의 매칭을 재실행하고 DB에 저장
 */

import { Timestamp } from 'firebase-admin/firestore';
import { getFirebaseAdmin } from '../src/lib/firebase/admin-init';

const CLOUD_FUNCTION_URL = 'https://asia-northeast3-philipandsophy.cloudfunctions.net/manualClusterMatching';

async function rematchCluster(cohortId: string, targetDate: string) {
  console.log(`🔄 클러스터 매칭 재실행: cohort=${cohortId}, date=${targetDate}\n`);

  const { db } = getFirebaseAdmin();

  // 1. Internal Secret 가져오기
  const internalSecret = process.env.INTERNAL_SERVICE_SECRET;
  if (!internalSecret) {
    console.error('❌ INTERNAL_SERVICE_SECRET 환경 변수가 필요합니다.');
    process.exit(1);
  }

  // 2. Cloud Function 호출
  console.log('📡 Cloud Function 호출 중...');

  const response = await fetch(CLOUD_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-secret': internalSecret,
    },
    body: JSON.stringify({
      cohortId,
      date: targetDate,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ API 호출 실패: ${response.status} ${response.statusText}`);
    console.error(errorText);
    process.exit(1);
  }

  const result = await response.json();

  console.log(`✅ 매칭 결과 수신:`);
  console.log(`   - 날짜: ${result.date}`);
  console.log(`   - 참가자 수: ${result.totalParticipants}명`);
  console.log(`   - 클러스터 수: ${Object.keys(result.matching.clusters).length}개`);
  console.log('');

  // 3. 클러스터 상세 출력
  console.log('📊 클러스터 상세:');
  for (const [clusterId, cluster] of Object.entries(result.matching.clusters) as any) {
    console.log(`   ${cluster.emoji} ${cluster.name} [${cluster.category}]`);
    console.log(`      멤버: ${cluster.memberIds.join(', ')}`);
  }
  console.log('');

  // 4. Firestore 저장 (Transaction)
  console.log('💾 Firestore에 저장 중...');

  const matchingEntry = {
    clusters: result.matching.clusters,
    assignments: result.matching.assignments,
    matchingVersion: 'cluster' as const,
  };

  const cohortRef = db.collection('cohorts').doc(cohortId);

  await db.runTransaction(async (transaction: any) => {
    const currentDoc = await transaction.get(cohortRef);
    if (!currentDoc.exists) {
      throw new Error(`Cohort ${cohortId} not found`);
    }

    const currentData = currentDoc.data();
    const dailyFeaturedParticipants = currentData?.dailyFeaturedParticipants || {};

    dailyFeaturedParticipants[targetDate] = matchingEntry;

    transaction.update(cohortRef, {
      dailyFeaturedParticipants,
      updatedAt: Timestamp.now(),
    });
  });

  console.log(`✅ dailyFeaturedParticipants[${targetDate}] 업데이트 완료!`);

  // 5. 백업 저장
  const confirmRef = db.collection('matching_results').doc(`${cohortId}-${targetDate}`);

  await confirmRef.set({
    cohortId,
    date: targetDate,
    matching: matchingEntry,
    totalParticipants: result.totalParticipants,
    clusterCount: Object.keys(result.matching.clusters).length,
    confirmedAt: Timestamp.now(),
    confirmedBy: 'rematch_script',
  });

  console.log(`✅ matching_results/${cohortId}-${targetDate} 백업 저장 완료!`);

  console.log('\n🎉 클러스터 매칭 재실행 완료!');
  process.exit(0);
}

// CLI 인자 파싱
const args = process.argv.slice(2);
const cohortId = args[0] || '4-2';
const targetDate = args[1] || '2025-12-01';

rematchCluster(cohortId, targetDate).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
