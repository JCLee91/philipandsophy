#!/usr/bin/env tsx

/**
 * Firebase UID를 최신 코호트로 마이그레이션
 *
 * 문제:
 * - 다중 코호트 참가자의 경우, firebaseUid가 이전 코호트 문서에만 있고
 *   최신 코호트 문서에는 없어서 로그인 시 이전 코호트로 연결됨
 *
 * 해결:
 * - 같은 전화번호를 가진 참가자 중 최신 코호트에만 firebaseUid 연결
 * - 이전 코호트 문서들의 firebaseUid는 null로 초기화
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const COLLECTIONS = {
  PARTICIPANTS: 'participants',
  COHORTS: 'cohorts',
} as const;

interface Participant {
  id: string;
  phoneNumber: string;
  firebaseUid?: string | null;
  cohortId: string;
  createdAt: any;
}

interface CohortInfo {
  id: string;
  createdAt: any;
}

interface MigrationResult {
  phoneNumber: string;
  participants: Array<{
    id: string;
    cohortId: string;
    hadUid: boolean;
    isLatest: boolean;
  }>;
  latestParticipantId: string;
  uidToMigrate: string | null;
  action: 'migrate' | 'already_correct' | 'no_uid';
}

/**
 * Firebase Admin 초기화
 */
function initializeFirebaseAdmin() {
  if (getApps().length === 0) {
    const serviceAccount = require('../firebase-service-account.json');

    initializeApp({
      credential: cert(serviceAccount),
    });
  }

  return getFirestore();
}

/**
 * 모든 코호트 정보 조회 (생성일 기준 정렬)
 */
async function getAllCohorts(db: FirebaseFirestore.Firestore): Promise<Map<string, CohortInfo>> {
  const cohortsSnapshot = await db.collection(COLLECTIONS.COHORTS).get();
  const cohortMap = new Map<string, CohortInfo>();

  cohortsSnapshot.forEach(doc => {
    cohortMap.set(doc.id, {
      id: doc.id,
      createdAt: doc.data().createdAt,
    });
  });

  return cohortMap;
}

/**
 * 최신 코호트 판별 (createdAt 기준)
 */
function getLatestCohortId(cohortIds: string[], cohortMap: Map<string, CohortInfo>): string {
  return cohortIds.sort((a, b) => {
    const cohortA = cohortMap.get(a);
    const cohortB = cohortMap.get(b);

    if (!cohortA || !cohortB) return 0;

    const timeA = cohortA.createdAt?.toMillis() || 0;
    const timeB = cohortB.createdAt?.toMillis() || 0;

    return timeB - timeA; // 최신순
  })[0];
}

/**
 * 모든 참가자를 전화번호별로 그룹화
 */
async function groupParticipantsByPhone(
  db: FirebaseFirestore.Firestore
): Promise<Map<string, Participant[]>> {
  const participantsSnapshot = await db.collection(COLLECTIONS.PARTICIPANTS).get();
  const phoneGroups = new Map<string, Participant[]>();

  participantsSnapshot.forEach(doc => {
    const data = doc.data();
    const phoneNumber = data.phoneNumber;

    if (!phoneNumber) return;

    const participant: Participant = {
      id: doc.id,
      phoneNumber,
      firebaseUid: data.firebaseUid || null,
      cohortId: data.cohortId,
      createdAt: data.createdAt,
    };

    if (!phoneGroups.has(phoneNumber)) {
      phoneGroups.set(phoneNumber, []);
    }

    phoneGroups.get(phoneNumber)!.push(participant);
  });

  return phoneGroups;
}

/**
 * 마이그레이션 계획 분석
 */
function analyzeMigration(
  phoneGroups: Map<string, Participant[]>,
  cohortMap: Map<string, CohortInfo>
): MigrationResult[] {
  const results: MigrationResult[] = [];

  for (const [phoneNumber, participants] of phoneGroups) {
    // 단일 참가자는 마이그레이션 불필요
    if (participants.length === 1) continue;

    // 최신 코호트 찾기
    const cohortIds = participants.map(p => p.cohortId);
    const latestCohortId = getLatestCohortId(cohortIds, cohortMap);
    const latestParticipant = participants.find(p => p.cohortId === latestCohortId);

    if (!latestParticipant) continue;

    // firebaseUid 찾기
    const participantWithUid = participants.find(p => p.firebaseUid);
    const uidToMigrate = participantWithUid?.firebaseUid || null;

    // 이미 최신 참가자에 UID가 있고 다른 곳에는 없는 경우
    const isAlreadyCorrect =
      latestParticipant.firebaseUid === uidToMigrate &&
      participants.every(p => p.id === latestParticipant.id || !p.firebaseUid);

    const action = !uidToMigrate
      ? 'no_uid'
      : isAlreadyCorrect
        ? 'already_correct'
        : 'migrate';

    results.push({
      phoneNumber,
      participants: participants.map(p => ({
        id: p.id,
        cohortId: p.cohortId,
        hadUid: !!p.firebaseUid,
        isLatest: p.id === latestParticipant.id,
      })),
      latestParticipantId: latestParticipant.id,
      uidToMigrate,
      action,
    });
  }

  return results;
}

/**
 * 마이그레이션 실행
 */
async function executeMigration(
  db: FirebaseFirestore.Firestore,
  results: MigrationResult[],
  dryRun: boolean
): Promise<void> {
  const migrateResults = results.filter(r => r.action === 'migrate');

  console.log('\n📊 마이그레이션 요약');
  console.log(`총 전화번호: ${results.length}개`);
  console.log(`마이그레이션 필요: ${migrateResults.length}개`);
  console.log(`이미 올바름: ${results.filter(r => r.action === 'already_correct').length}개`);
  console.log(`UID 없음: ${results.filter(r => r.action === 'no_uid').length}개\n`);

  if (migrateResults.length === 0) {
    console.log('✅ 마이그레이션이 필요한 데이터가 없습니다.');
    return;
  }

  if (dryRun) {
    console.log('🔍 드라이런 모드: 실제 변경하지 않고 시뮬레이션만 수행\n');
  } else {
    console.log('⚠️  실제 마이그레이션 실행 중...\n');
  }

  for (const result of migrateResults) {
    console.log(`\n📞 전화번호: ${result.phoneNumber}`);
    console.log(`   UID: ${result.uidToMigrate}`);
    console.log(`   참가자 목록:`);

    for (const p of result.participants) {
      const status = p.isLatest ? '✅ 최신' : '⏳ 이전';
      const uidStatus = p.hadUid ? '🔑 UID 있음' : '❌ UID 없음';
      console.log(`   - ${p.id} (${p.cohortId}) ${status} ${uidStatus}`);
    }

    if (!dryRun) {
      const batch = db.batch();

      // 최신 참가자에 UID 설정
      const latestDocRef = db.collection(COLLECTIONS.PARTICIPANTS).doc(result.latestParticipantId);
      batch.update(latestDocRef, {
        firebaseUid: result.uidToMigrate,
        updatedAt: FieldValue.serverTimestamp(),
      });

      // 이전 참가자들의 UID 제거
      for (const p of result.participants) {
        if (p.id !== result.latestParticipantId && p.hadUid) {
          const docRef = db.collection(COLLECTIONS.PARTICIPANTS).doc(p.id);
          batch.update(docRef, {
            firebaseUid: null,
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
      }

      await batch.commit();
      console.log(`   ✅ 마이그레이션 완료: ${result.latestParticipantId}로 UID 이동`);
    } else {
      console.log(`   🔍 [드라이런] ${result.latestParticipantId}로 UID를 이동할 예정`);
    }
  }

  if (dryRun) {
    console.log('\n💡 실제 마이그레이션을 실행하려면 --apply 플래그를 사용하세요:');
    console.log('   npm run migrate:uid-to-latest -- --apply');
  } else {
    console.log('\n✅ 모든 마이그레이션이 완료되었습니다!');
  }
}

/**
 * 메인 실행
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--apply');

  console.log('🚀 Firebase UID 마이그레이션 스크립트 시작\n');

  if (dryRun) {
    console.log('⚠️  드라이런 모드: 실제 변경하지 않고 분석만 수행합니다.');
    console.log('   실제 실행하려면 --apply 플래그를 추가하세요.\n');
  }

  // Firebase Admin 초기화
  const db = initializeFirebaseAdmin();
  console.log('✅ Firebase Admin 초기화 완료\n');

  // 코호트 정보 조회
  console.log('📋 코호트 정보 조회 중...');
  const cohortMap = await getAllCohorts(db);
  console.log(`✅ ${cohortMap.size}개 코호트 발견\n`);

  // 참가자를 전화번호별로 그룹화
  console.log('👥 참가자 그룹화 중...');
  const phoneGroups = await groupParticipantsByPhone(db);
  console.log(`✅ ${phoneGroups.size}개 전화번호 발견\n`);

  // 마이그레이션 분석
  console.log('🔍 마이그레이션 분석 중...');
  const migrationResults = analyzeMigration(phoneGroups, cohortMap);

  // 마이그레이션 실행 (또는 드라이런)
  await executeMigration(db, migrationResults, dryRun);

  console.log('\n' + '='.repeat(60));
  console.log('작업 완료!');
  console.log('='.repeat(60));
}

main().catch((error) => {
  console.error('💥 오류 발생:', error);
  process.exit(1);
});
