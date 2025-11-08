/**
 * 3기 Cohort ID 마이그레이션
 *
 * UEnVoBc2k6KcaFlqzVae → 3
 *
 * 사전 요구사항:
 * gcloud auth application-default login
 *
 * 실행 방법:
 * npx tsx src/scripts/migrate-cohort3-id.ts
 */

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';

// .env.local 파일 로드
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Firebase Admin SDK 초기화 (Application Default Credentials)
const app = initializeApp({
  credential: applicationDefault(),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
});

// Seoul named database 사용
const db = getFirestore(app, 'seoul');

const OLD_COHORT_ID = 'UEnVoBc2k6KcaFlqzVae';
const NEW_COHORT_ID = '3';

async function migrateCohort3() {
  console.log('🚀 3기 Cohort ID 마이그레이션 시작...\n');
  console.log(`OLD: ${OLD_COHORT_ID}`);
  console.log(`NEW: ${NEW_COHORT_ID}\n`);

  try {
    // 1. 기존 cohort 데이터 읽기
    console.log('📖 1. 기존 cohort 데이터 읽기...');
    const oldCohortRef = db.collection('cohorts').doc(OLD_COHORT_ID);
    const oldCohortSnap = await oldCohortRef.get();

    if (!oldCohortSnap.exists) {
      console.error(`❌ Cohort ${OLD_COHORT_ID} not found`);
      return;
    }

    const cohortData = oldCohortSnap.data();
    console.log(`✅ Cohort 데이터 로드: ${cohortData?.name}`);

    // 2. 새 ID로 cohort 생성 확인
    console.log('\n📝 2. 새 cohort 문서 생성 확인...');
    const newCohortRef = db.collection('cohorts').doc(NEW_COHORT_ID);
    const newCohortSnap = await newCohortRef.get();

    if (newCohortSnap.exists) {
      console.log(`⚠️  Cohort ${NEW_COHORT_ID}가 이미 존재합니다.`);
      const existingData = newCohortSnap.data();
      console.log(`   기존 데이터: ${existingData?.name}, ${existingData?.startDate}`);
      console.log('❌ 마이그레이션 중단 (이미 존재하는 문서)');
      return;
    }

    // 3. 새 cohort 문서 생성
    console.log(`\n📝 3. 새 cohort 문서 생성 (ID: ${NEW_COHORT_ID})...`);
    await newCohortRef.set(cohortData);
    console.log('✅ 새 cohort 생성 완료');

    // 4. 참가자 cohortId 업데이트
    console.log(`\n👥 4. 참가자 cohortId 업데이트 (${OLD_COHORT_ID} → ${NEW_COHORT_ID})...`);

    const participantsSnapshot = await db
      .collection('participants')
      .where('cohortId', '==', OLD_COHORT_ID)
      .get();

    console.log(`   참가자 수: ${participantsSnapshot.size}명`);

    if (participantsSnapshot.size > 0) {
      // Batch update (최대 500개)
      const batch = db.batch();
      let count = 0;

      participantsSnapshot.docs.forEach((participantDoc) => {
        batch.update(participantDoc.ref, { cohortId: NEW_COHORT_ID });
        count++;
      });

      await batch.commit();
      console.log(`✅ ${count}명의 참가자 cohortId 업데이트 완료`);
    }

    // 5. 기존 cohort 문서 삭제
    console.log(`\n🗑️  5. 기존 cohort 문서 삭제 (ID: ${OLD_COHORT_ID})...`);
    await oldCohortRef.delete();
    console.log('✅ 기존 cohort 삭제 완료');

    // 6. 검증
    console.log('\n✅ 6. 마이그레이션 검증...');
    const verifyNewCohort = await newCohortRef.get();
    const verifyOldCohort = await oldCohortRef.get();

    console.log(`   새 cohort (${NEW_COHORT_ID}): ${verifyNewCohort.exists ? '✅ 존재' : '❌ 없음'}`);
    console.log(`   기존 cohort (${OLD_COHORT_ID}): ${verifyOldCohort.exists ? '❌ 아직 존재' : '✅ 삭제됨'}`);

    // 참가자 검증
    const verifyParticipantsSnap = await db
      .collection('participants')
      .where('cohortId', '==', NEW_COHORT_ID)
      .get();
    console.log(`   참가자 (cohortId=${NEW_COHORT_ID}): ${verifyParticipantsSnap.size}명`);

    console.log('\n🎉 마이그레이션 완료!');
  } catch (error) {
    console.error('\n❌ 마이그레이션 실패:', error);
    throw error;
  }
}

migrateCohort3();
