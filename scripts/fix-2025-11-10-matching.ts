/**
 * 2025-11-10 매칭 데이터 수정
 *
 * matching_results의 올바른 랜덤 매칭 데이터를
 * dailyFeaturedParticipants에 덮어쓰기
 */

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const app = initializeApp({
  credential: applicationDefault(),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
});

const db = getFirestore(app, 'seoul');

async function fixMatchingData() {
  try {
    const cohortId = '3';
    const date = '2025-11-10';

    console.log('🔧 2025-11-10 매칭 데이터 수정 중...\n');

    // 1. matching_results에서 올바른 데이터 가져오기
    console.log('1️⃣ matching_results에서 데이터 가져오기...');
    const matchingResultDoc = await db
      .collection('matching_results')
      .doc(`${cohortId}-${date}`)
      .get();

    if (!matchingResultDoc.exists) {
      throw new Error(`matching_results 문서 없음: ${cohortId}-${date}`);
    }

    const matchingResultData = matchingResultDoc.data()!;
    const correctMatching = matchingResultData.matching;

    console.log(`   ✅ matching 데이터 확인:`);
    console.log(`      matchingVersion: ${correctMatching.matchingVersion}`);
    console.log(`      assignments 개수: ${Object.keys(correctMatching.assignments).length}`);
    console.log(`      confirmedBy: ${matchingResultData.confirmedBy}`);
    console.log(`      confirmedAt: ${matchingResultData.confirmedAt?.toDate().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}\n`);

    // 2. 현재 dailyFeaturedParticipants 확인
    console.log('2️⃣ 현재 dailyFeaturedParticipants 확인...');
    const cohortRef = db.collection('cohorts').doc(cohortId);
    const cohortDoc = await cohortRef.get();

    if (!cohortDoc.exists) {
      throw new Error(`Cohort 문서 없음: ${cohortId}`);
    }

    const cohortData = cohortDoc.data()!;
    const dailyFeaturedParticipants = cohortData.dailyFeaturedParticipants || {};
    const oldMatching = dailyFeaturedParticipants[date];

    if (oldMatching) {
      const firstAssignment = Object.values(oldMatching.assignments || {})[0] as any;
      const hasOldAIStructure = firstAssignment && (firstAssignment.similar || firstAssignment.opposite);

      console.log(`   ⚠️  기존 데이터 발견:`);
      console.log(`      matchingVersion: ${oldMatching.matchingVersion || 'N/A'}`);
      console.log(`      assignments 개수: ${Object.keys(oldMatching.assignments || {}).length}`);
      console.log(`      타입: ${hasOldAIStructure ? 'AI 매칭 (similar/opposite)' : '랜덤 매칭 (assigned)'}\n`);
    } else {
      console.log(`   ℹ️  기존 데이터 없음\n`);
    }

    // 3. Transaction으로 업데이트
    console.log('3️⃣ dailyFeaturedParticipants 업데이트 중...');

    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(cohortRef);

      if (!doc.exists) {
        throw new Error(`Cohort ${cohortId} not found`);
      }

      const data = doc.data()!;
      const dailyFeaturedParticipants = data.dailyFeaturedParticipants || {};

      // 강제로 덮어쓰기
      dailyFeaturedParticipants[date] = correctMatching;

      transaction.update(cohortRef, {
        dailyFeaturedParticipants,
        updatedAt: Timestamp.now(),
      });

      console.log(`   ✅ Transaction 완료\n`);
    });

    // 4. 결과 확인
    console.log('4️⃣ 업데이트 결과 확인...');
    const updatedCohortDoc = await cohortRef.get();
    const updatedData = updatedCohortDoc.data()!;
    const updatedMatching = updatedData.dailyFeaturedParticipants[date];

    console.log(`   ✅ 업데이트된 데이터:`);
    console.log(`      matchingVersion: ${updatedMatching.matchingVersion}`);
    console.log(`      assignments 개수: ${Object.keys(updatedMatching.assignments).length}`);

    // 샘플 확인
    const firstAssignment = Object.values(updatedMatching.assignments)[0] as any;
    if (firstAssignment?.assigned) {
      console.log(`      타입: 랜덤 매칭 (assigned) ✅`);
      console.log(`      샘플: { assigned: [${firstAssignment.assigned.slice(0, 2).join(', ')}...] }`);
    }

    console.log('\n✅ 수정 완료!');
    console.log('   - 2025-11-10 데이터가 올바른 랜덤 매칭 데이터로 교체되었습니다.');
    console.log('   - 프론트엔드에서 30개의 프로필북이 정상적으로 표시됩니다.');

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  }
}

// 실행
fixMatchingData()
  .then(() => {
    console.log('\n✅ 스크립트 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 스크립트 실패:', error);
    process.exit(1);
  });
