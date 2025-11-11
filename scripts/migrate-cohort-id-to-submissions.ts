/**
 * reading_submissions에 cohortId 필드 추가 (마이그레이션)
 *
 * 안전장치:
 * 1. Dry-run 모드 (기본값: true)
 * 2. 배치 업데이트 (500개씩)
 * 3. 검증 로직 (날짜 범위, participationCode 매칭)
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

// ⚠️ 실제 업데이트하려면 false로 변경
const DRY_RUN = false;

interface CohortInfo {
  id: string;
  startDate: string;
  endDate: string;
}

async function migrateCohortIdToSubmissions() {
  try {
    console.log('🔄 reading_submissions에 cohortId 마이그레이션 시작\n');
    console.log(`⚠️  모드: ${DRY_RUN ? 'DRY-RUN (미리보기)' : '실제 업데이트'}\n`);

    // 1. Cohort 정보 조회
    console.log('=== 1단계: Cohort 정보 조회 ===\n');

    const cohortsSnapshot = await db.collection('cohorts').get();
    const cohorts: CohortInfo[] = cohortsSnapshot.docs.map(doc => ({
      id: doc.id,
      startDate: doc.data().startDate,
      endDate: doc.data().endDate,
    }));

    console.log(`총 기수: ${cohorts.length}개`);
    cohorts.forEach(c => {
      console.log(`  ${c.id}기: ${c.startDate} ~ ${c.endDate}`);
    });
    console.log('');

    // 2. 참가자 정보 조회 (participationCode → cohortId 매핑)
    console.log('=== 2단계: 참가자 정보 조회 ===\n');

    const participantsSnapshot = await db.collection('participants').get();
    const participantMap = new Map<string, string>(); // participationCode → cohortId

    participantsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const participationCode = data.participationCode || doc.id;
      participantMap.set(participationCode, data.cohortId);
    });

    console.log(`총 참가자: ${participantMap.size}명\n`);

    // 3. reading_submissions 조회
    console.log('=== 3단계: reading_submissions 조회 ===\n');

    const submissionsSnapshot = await db.collection('reading_submissions').get();
    console.log(`총 인증: ${submissionsSnapshot.size}건\n`);

    // 4. cohortId가 없는 인증 필터링
    const needsMigration = submissionsSnapshot.docs.filter(doc => {
      const data = doc.data();
      return !data.cohortId; // cohortId 없는 것만
    });

    console.log(`마이그레이션 필요: ${needsMigration.length}건\n`);

    if (needsMigration.length === 0) {
      console.log('✅ 모든 인증에 cohortId가 이미 있습니다.');
      return;
    }

    // 5. cohortId 계산 및 업데이트 준비
    console.log('=== 4단계: cohortId 계산 ===\n');

    const updates: Array<{
      docId: string;
      participationCode: string;
      submissionDate: string;
      cohortId: string;
    }> = [];

    const errors: Array<{
      docId: string;
      participationCode: string;
      submissionDate: string;
      reason: string;
    }> = [];

    needsMigration.forEach(doc => {
      const data = doc.data();
      const participationCode = data.participationCode;
      const submissionDate = data.submissionDate;

      // participationCode로 cohortId 찾기
      const cohortId = participantMap.get(participationCode);

      if (!cohortId) {
        errors.push({
          docId: doc.id,
          participationCode,
          submissionDate,
          reason: 'participationCode에 해당하는 참가자 없음',
        });
        return;
      }

      // 날짜 범위 검증
      const cohort = cohorts.find(c => c.id === cohortId);
      if (!cohort) {
        errors.push({
          docId: doc.id,
          participationCode,
          submissionDate,
          reason: `cohort ${cohortId} 정보 없음`,
        });
        return;
      }

      // 날짜 검증 (submissionDate가 cohort 기간 내인지)
      if (submissionDate < cohort.startDate || submissionDate > cohort.endDate) {
        // 경고만 출력하고 계속 진행 (날짜 범위 밖이어도 cohortId는 추가)
        console.log(`⚠️  날짜 범위 밖: ${participationCode} - ${submissionDate} (${cohortId}기: ${cohort.startDate}~${cohort.endDate})`);
      }

      updates.push({
        docId: doc.id,
        participationCode,
        submissionDate,
        cohortId,
      });
    });

    console.log(`업데이트 가능: ${updates.length}건`);
    console.log(`에러: ${errors.length}건\n`);

    if (errors.length > 0) {
      console.log('=== 에러 목록 ===\n');
      errors.forEach(e => {
        console.log(`❌ ${e.docId} (${e.participationCode}, ${e.submissionDate}): ${e.reason}`);
      });
      console.log('');
    }

    // 6. 통계
    console.log('=== 5단계: 업데이트 통계 ===\n');

    const byCohort = new Map<string, number>();
    updates.forEach(u => {
      byCohort.set(u.cohortId, (byCohort.get(u.cohortId) || 0) + 1);
    });

    console.log('기수별 업데이트 수:');
    Array.from(byCohort.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([cohortId, count]) => {
        console.log(`  ${cohortId}기: ${count}건`);
      });
    console.log('');

    // 7. 업데이트 실행 (배치)
    if (DRY_RUN) {
      console.log('=== DRY-RUN 모드: 실제 업데이트하지 않음 ===\n');
      console.log('실제 업데이트하려면:');
      console.log('1. scripts/migrate-cohort-id-to-submissions.ts 파일 열기');
      console.log('2. const DRY_RUN = false 로 변경');
      console.log('3. 다시 실행\n');
      return;
    }

    console.log('=== 6단계: 실제 업데이트 ===\n');

    const BATCH_SIZE = 500;
    let processed = 0;

    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
      const batch = db.batch();
      const chunk = updates.slice(i, i + BATCH_SIZE);

      chunk.forEach(update => {
        const docRef = db.collection('reading_submissions').doc(update.docId);
        batch.update(docRef, { cohortId: update.cohortId });
      });

      await batch.commit();
      processed += chunk.length;

      console.log(`진행: ${processed}/${updates.length}건 (${Math.round((processed / updates.length) * 100)}%)`);
    }

    console.log('\n✅ 업데이트 완료\n');

    // 8. 검증
    console.log('=== 7단계: 검증 ===\n');

    const verifySnapshot = await db.collection('reading_submissions').get();
    const withCohortId = verifySnapshot.docs.filter(doc => !!doc.data().cohortId);

    console.log(`전체 인증: ${verifySnapshot.size}건`);
    console.log(`cohortId 있음: ${withCohortId.length}건`);
    console.log(`cohortId 없음: ${verifySnapshot.size - withCohortId.length}건`);
    console.log('');

    if (verifySnapshot.size === withCohortId.length) {
      console.log('✅ 모든 인증에 cohortId가 추가되었습니다!');
    } else {
      console.log('⚠️  일부 인증에 cohortId가 없습니다.');
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  }
}

// 실행
migrateCohortIdToSubmissions()
  .then(() => {
    console.log('\n✅ 마이그레이션 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 마이그레이션 실패:', error);
    process.exit(1);
  });
