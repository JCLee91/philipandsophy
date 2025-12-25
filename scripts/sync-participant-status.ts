/**
 * 참가자 상태 동기화 스크립트
 *
 * Airtable에서 특정 기수의 결제 완료된 참가자를 조회하여
 * Firestore participants의 status를 'applicant' → 'active'로 변경
 *
 * 실행 방법:
 * 1. 미리보기 (6기 기준):
 *    npx tsx scripts/sync-participant-status.ts --cohort=6
 *
 * 2. 실제 실행:
 *    npx tsx scripts/sync-participant-status.ts --cohort=6 --execute
 *
 * 3. Firestore만 조회 (Airtable 없이):
 *    npx tsx scripts/sync-participant-status.ts --cohort=6 --firestore-only --execute
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import path from 'path';
import dotenv from 'dotenv';

// .env.local 로드
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Airtable 설정
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE_ID = process.env.AIRTABLE_TABLE_ID;

const AIRTABLE_FIELDS = {
  PHONE_NUMBER: '연락처',
  NAME: '이름',
  PAYMENT_STATUS: '결제 여부',
  MEMBERSHIP_COHORT: '멤버십 기수', // 멀티 선택 필드
};

const PAYMENT_STATUS_PAID = '결제 완료';

// Firebase Admin 초기화
function initFirebaseAdmin() {
  if (getApps().length > 0) {
    return getFirestore();
  }

  const serviceAccountPath = path.resolve(
    process.cwd(),
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json'
  );

  initializeApp({
    credential: cert(serviceAccountPath),
  });

  return getFirestore();
}

interface AirtableRecord {
  id: string;
  fields: {
    [key: string]: string | string[] | undefined;
  };
}

interface Participant {
  id: string;
  name: string;
  phoneNumber: string;
  cohortId: string;
  status?: string;
}

/**
 * Airtable에서 특정 기수의 결제 완료된 레코드 조회
 * 멀티 선택 필드에서 특정 기수가 포함된 레코드만 필터링
 */
async function fetchPaidRecordsFromAirtable(cohortNumber: string): Promise<AirtableRecord[]> {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID || !AIRTABLE_TABLE_ID) {
    throw new Error('Airtable 환경 변수가 설정되지 않았습니다.');
  }

  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}`;

  // 멀티 선택 필드에서 특정 값 포함 여부 확인
  // AND 조건: 결제 완료 AND 해당 기수 포함
  const filterFormula = `AND(
    {${AIRTABLE_FIELDS.PAYMENT_STATUS}} = "${PAYMENT_STATUS_PAID}",
    FIND("${cohortNumber}", ARRAYJOIN({${AIRTABLE_FIELDS.MEMBERSHIP_COHORT}}, ",")) > 0
  )`.replace(/\s+/g, ' ');

  const params = new URLSearchParams({
    filterByFormula: filterFormula,
  });

  const response = await fetch(`${url}?${params}`, {
    headers: {
      Authorization: `Bearer ${AIRTABLE_API_KEY}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Airtable API 오류: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.records as AirtableRecord[];
}

/**
 * 전화번호와 기수로 Firestore에서 applicant 상태인 참가자 조회
 * 재신청자의 경우 해당 기수의 participant만 조회
 */
async function getApplicantByPhoneAndCohort(
  db: FirebaseFirestore.Firestore,
  phoneNumber: string,
  cohortId: string
): Promise<Participant | null> {
  const normalizedPhone = phoneNumber.replace(/-/g, '');

  const snapshot = await db
    .collection('participants')
    .where('phoneNumber', '==', normalizedPhone)
    .where('cohortId', '==', cohortId)
    .where('status', '==', 'applicant')
    .get();

  if (snapshot.empty) {
    return null;
  }

  return {
    id: snapshot.docs[0].id,
    ...snapshot.docs[0].data(),
  } as Participant;
}

/**
 * 특정 코호트의 모든 applicant 조회
 */
async function getApplicantsByCohort(
  db: FirebaseFirestore.Firestore,
  cohortId: string
): Promise<Participant[]> {
  const snapshot = await db
    .collection('participants')
    .where('cohortId', '==', cohortId)
    .where('status', '==', 'applicant')
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Participant[];
}

/**
 * 참가자 상태를 active로 변경
 */
async function activateParticipant(
  db: FirebaseFirestore.Firestore,
  participantId: string,
  dryRun: boolean
): Promise<void> {
  if (!dryRun) {
    await db.collection('participants').doc(participantId).update({
      status: 'active',
      updatedAt: Timestamp.now(),
    });
  }
}

function parseArgs(args: string[]): { cohort?: string; execute: boolean; firestoreOnly: boolean } {
  const cohortArg = args.find((a) => a.startsWith('--cohort='));
  const cohort = cohortArg ? cohortArg.replace('--cohort=', '') : undefined;
  const execute = args.includes('--execute');
  const firestoreOnly = args.includes('--firestore-only');

  return { cohort, execute, firestoreOnly };
}

async function main() {
  const args = process.argv.slice(2);
  const { cohort, execute, firestoreOnly } = parseArgs(args);

  if (!cohort) {
    console.log('❌ --cohort 옵션이 필요합니다.');
    console.log('   예: npx tsx scripts/sync-participant-status.ts --cohort=6');
    process.exit(1);
  }

  // DB에는 cohortId가 '6' 형태로 저장됨 (not 'cohort6')
  const cohortId = cohort;
  const db = initFirebaseAdmin();

  console.log('='.repeat(60));
  console.log('참가자 상태 동기화 스크립트');
  console.log('='.repeat(60));
  console.log(`대상 기수: ${cohort}기 (cohortId: '${cohortId}')`);
  console.log(`모드: ${execute ? '🔴 실제 실행' : '🟡 Dry-run (미리보기)'}`);
  console.log(`소스: ${firestoreOnly ? 'Firestore만' : 'Airtable 결제 완료자'}`);
  console.log();

  let toActivate: { participant: Participant; airtableName?: string }[] = [];

  if (firestoreOnly) {
    // Firestore에서 해당 코호트의 모든 applicant 조회
    console.log(`📋 Firestore에서 ${cohortId} applicant 조회 중...`);
    const applicants = await getApplicantsByCohort(db, cohortId);
    toActivate = applicants.map((p) => ({ participant: p }));
  } else {
    // Airtable에서 해당 기수의 결제 완료자 조회
    console.log(`📡 Airtable에서 ${cohort}기 결제 완료자 조회 중...`);
    const paidRecords = await fetchPaidRecordsFromAirtable(cohort);
    console.log(`   └─ ${paidRecords.length}명 결제 완료 (${cohort}기)`);
    console.log();

    // Firestore에서 해당 참가자의 status 확인
    console.log('🔍 Firestore에서 status 확인 중...');
    for (const record of paidRecords) {
      const phoneNumber = record.fields[AIRTABLE_FIELDS.PHONE_NUMBER] as string;
      const name = record.fields[AIRTABLE_FIELDS.NAME] as string;

      if (!phoneNumber) continue;

      // 해당 기수의 participant만 조회 (재신청자 고려)
      const applicant = await getApplicantByPhoneAndCohort(db, phoneNumber, cohortId);

      if (applicant) {
        toActivate.push({
          participant: applicant,
          airtableName: name,
        });
      }
    }
  }

  console.log();
  console.log(`🔄 status='applicant' → 'active' 변경 대상: ${toActivate.length}명`);
  console.log();

  if (toActivate.length === 0) {
    console.log('✅ 변경할 참가자가 없습니다.');
    return;
  }

  console.log('변경 대상:');
  toActivate.forEach((item, i) => {
    const p = item.participant;
    const displayName = item.airtableName || p.name;
    console.log(`  ${i + 1}. ${p.id} (${displayName}) - ${p.phoneNumber.slice(-4)}`);
  });
  console.log();

  if (!execute) {
    console.log('⚠️  Dry-run 모드입니다. 실제 변경하려면 --execute 플래그를 추가하세요.');
    console.log(`    npx tsx scripts/sync-participant-status.ts --cohort=${cohort} --execute`);
    return;
  }

  // 실제 변경
  for (const item of toActivate) {
    console.log(`[EXECUTE] Activating: ${item.participant.id}`);
    await activateParticipant(db, item.participant.id, false);
  }

  console.log();
  console.log(`✅ 완료! ${toActivate.length}명의 status가 'active'로 변경되었습니다.`);
}

main().catch((error) => {
  console.error('❌ 오류 발생:', error);
  process.exit(1);
});
