/**
 * 이지현, 한찬희 프로필북 1개씩 추가
 *
 * 문제: 11-11 매칭에서 10개 요청했으나 9개만 할당됨
 * 해결: 공급자 중 미할당자 1명씩 추가
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

const COHORT_ID = '3';
const MATCHING_DATE = '2025-11-11';
const TARGET_PARTICIPANTS = ['cohort3-지현', 'cohort3-찬희'];

async function addMissingProfiles() {
  console.log('🔄 이지현, 한찬희 프로필북 추가 시작\n');

  // 1. 11-11 매칭 데이터 조회
  const cohortDoc = await db.collection('cohorts').doc(COHORT_ID).get();
  const cohortData = cohortDoc.data();
  const matchingData = cohortData?.dailyFeaturedParticipants?.[MATCHING_DATE];

  if (!matchingData?.assignments) {
    console.log('❌ 11-11 매칭 데이터 없음');
    return;
  }

  console.log('=== 1단계: 현재 할당 조회 ===\n');

  for (const participantId of TARGET_PARTICIPANTS) {
    const assignment = matchingData.assignments[participantId];
    if (!assignment?.assigned) {
      console.log(`❌ ${participantId}: 할당 데이터 없음`);
      continue;
    }

    const currentCount = assignment.assigned.length;
    console.log(`${participantId}: 현재 ${currentCount}개 할당`);
    console.log(`  할당된 프로필: ${assignment.assigned.join(', ')}`);
  }

  // 2. 11-11 공급자 조회
  console.log('\n=== 2단계: 공급자 조회 ===\n');

  const submissions = await db.collection('reading_submissions')
    .where('submissionDate', '==', MATCHING_DATE)
    .where('status', '!=', 'draft')
    .get();

  const providerIds = new Set<string>();
  submissions.docs.forEach(doc => {
    const data = doc.data();
    if (data.participantId) {
      providerIds.add(data.participantId);
    }
  });

  console.log(`공급자: ${providerIds.size}명`);
  console.log(`공급자 목록: ${Array.from(providerIds).sort().join(', ')}\n`);

  // 3. 각 참가자에게 1명씩 추가
  console.log('=== 3단계: 미할당자 선택 및 추가 ===\n');

  const updates: Record<string, string[]> = {};

  for (const participantId of TARGET_PARTICIPANTS) {
    const assignment = matchingData.assignments[participantId];
    if (!assignment?.assigned) continue;

    const alreadyAssigned = new Set(assignment.assigned);

    // 후보: 공급자 중 (본인 제외 + 이미 할당된 사람 제외)
    const candidates = Array.from(providerIds).filter(id =>
      id !== participantId && !alreadyAssigned.has(id)
    );

    if (candidates.length === 0) {
      console.log(`❌ ${participantId}: 추가 가능한 후보 없음`);
      continue;
    }

    // 랜덤 선택
    const randomIndex = Math.floor(Math.random() * candidates.length);
    const selected = candidates[randomIndex];

    console.log(`${participantId}:`);
    console.log(`  후보 ${candidates.length}명 중 선택: ${selected}`);

    // 업데이트할 배열
    updates[participantId] = [...assignment.assigned, selected];
    console.log(`  업데이트: ${assignment.assigned.length}개 → ${updates[participantId].length}개\n`);
  }

  // 4. Firestore 업데이트
  console.log('=== 4단계: Firestore 업데이트 ===\n');

  if (Object.keys(updates).length === 0) {
    console.log('❌ 업데이트할 항목 없음');
    return;
  }

  const cohortRef = db.collection('cohorts').doc(COHORT_ID);

  await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(cohortRef);
    const data = doc.data();
    const dailyFeaturedParticipants = data?.dailyFeaturedParticipants || {};

    for (const [participantId, newAssigned] of Object.entries(updates)) {
      dailyFeaturedParticipants[MATCHING_DATE].assignments[participantId].assigned = newAssigned;
    }

    transaction.update(cohortRef, {
      dailyFeaturedParticipants,
    });
  });

  console.log('✅ 업데이트 완료\n');

  // 5. 검증
  console.log('=== 5단계: 검증 ===\n');

  const updatedDoc = await db.collection('cohorts').doc(COHORT_ID).get();
  const updatedData = updatedDoc.data();
  const updatedMatching = updatedData?.dailyFeaturedParticipants?.[MATCHING_DATE];

  for (const participantId of TARGET_PARTICIPANTS) {
    const assignment = updatedMatching?.assignments?.[participantId];
    if (assignment?.assigned) {
      console.log(`${participantId}: ${assignment.assigned.length}개`);
    }
  }
}

// 실행
addMissingProfiles()
  .then(() => {
    console.log('\n✅ 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 실패:', error);
    process.exit(1);
  });
