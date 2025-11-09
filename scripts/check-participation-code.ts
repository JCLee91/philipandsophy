/**
 * participationCode 데이터 점검 스크립트
 *
 * 목적: 3기 참가자 및 제출물의 participationCode 필드 누락 여부 확인
 *
 * 실행:
 * npx tsx scripts/check-participation-code.ts
 */

import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

// .env.local 로드
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Firebase Admin 초기화
if (!admin.apps.length) {
  const serviceAccountPath = path.resolve(__dirname, '../firebase-service-account.json');

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountPath),
    databaseURL: `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseio.com`,
  });
}

// Seoul DB 가져오기
const { getFirestore } = require('firebase-admin/firestore');
const db = getFirestore(admin.app(), 'seoul');

interface CheckResult {
  cohortId: string;
  totalParticipants: number;
  participantsWithCode: number;
  participantsWithoutCode: number;
  participantsWithoutCodeList: Array<{
    id: string;
    name: string;
    participationCode: string | undefined;
  }>;
  totalSubmissions: number;
  submissionsWithCode: number;
  submissionsWithoutCode: number;
  submissionsWithoutCodeList: Array<{
    id: string;
    participantId: string;
    participationCode: string | undefined;
    submissionDate: string;
  }>;
  affectedParticipants: Map<string, {
    name: string;
    totalSubmissions: number;
    submissionsWithoutCode: number;
  }>;
}

async function checkParticipationCode(cohortId: string = '3'): Promise<CheckResult> {
  console.log(`\n🔍 Checking participationCode for cohort: ${cohortId}\n`);

  const result: CheckResult = {
    cohortId,
    totalParticipants: 0,
    participantsWithCode: 0,
    participantsWithoutCode: 0,
    participantsWithoutCodeList: [],
    totalSubmissions: 0,
    submissionsWithCode: 0,
    submissionsWithoutCode: 0,
    submissionsWithoutCodeList: [],
    affectedParticipants: new Map(),
  };

  // 1. 참가자 점검
  console.log('📊 Step 1: Checking Participants...\n');

  const participantsSnapshot = await db
    .collection('participants')
    .where('cohortId', '==', cohortId)
    .get();

  result.totalParticipants = participantsSnapshot.size;

  const participantMap = new Map<string, { name: string; participationCode?: string }>();

  participantsSnapshot.docs.forEach((doc: any) => {
    const data = doc.data();
    const participationCode = data.participationCode;

    participantMap.set(doc.id, {
      name: data.name,
      participationCode,
    });

    if (participationCode) {
      result.participantsWithCode++;
    } else {
      result.participantsWithoutCode++;
      result.participantsWithoutCodeList.push({
        id: doc.id,
        name: data.name,
        participationCode,
      });
    }
  });

  console.log(`Total Participants: ${result.totalParticipants}`);
  console.log(`✅ With participationCode: ${result.participantsWithCode}`);
  console.log(`❌ Without participationCode: ${result.participantsWithoutCode}`);

  if (result.participantsWithoutCodeList.length > 0) {
    console.log('\n⚠️  Participants without participationCode:');
    result.participantsWithoutCodeList.forEach(p => {
      console.log(`  - ${p.name} (${p.id})`);
    });
  }

  // 2. 제출물 점검
  console.log('\n📊 Step 2: Checking Submissions...\n');

  const participantIds = Array.from(participantMap.keys());

  // Firestore 'in' 쿼리는 최대 10개 제한
  const submissionDocs: any[] = [];
  for (let i = 0; i < participantIds.length; i += 10) {
    const chunk = participantIds.slice(i, i + 10);
    const snapshot = await db
      .collection('reading_submissions')
      .where('participantId', 'in', chunk)
      .get();
    submissionDocs.push(...snapshot.docs);
  }

  result.totalSubmissions = submissionDocs.length;

  submissionDocs.forEach((doc: any) => {
    const data = doc.data();
    const participationCode = data.participationCode;
    const participantId = data.participantId;
    const submissionDate = data.submissionDate;

    if (participationCode) {
      result.submissionsWithCode++;
    } else {
      result.submissionsWithoutCode++;
      result.submissionsWithoutCodeList.push({
        id: doc.id,
        participantId,
        participationCode,
        submissionDate,
      });

      // 영향받는 참가자 집계
      const participant = participantMap.get(participantId);
      if (participant) {
        if (!result.affectedParticipants.has(participantId)) {
          result.affectedParticipants.set(participantId, {
            name: participant.name,
            totalSubmissions: 0,
            submissionsWithoutCode: 0,
          });
        }
        const affected = result.affectedParticipants.get(participantId)!;
        affected.totalSubmissions++;
        affected.submissionsWithoutCode++;
      }
    }
  });

  console.log(`Total Submissions: ${result.totalSubmissions}`);
  console.log(`✅ With participationCode: ${result.submissionsWithCode}`);
  console.log(`❌ Without participationCode: ${result.submissionsWithoutCode}`);

  // 3. 영향받는 참가자 요약
  if (result.affectedParticipants.size > 0) {
    console.log('\n⚠️  Affected Participants (submissions without participationCode):');
    console.log('─'.repeat(80));
    console.log(`${'Name'.padEnd(20)} | ${'Participant ID'.padEnd(25)} | Total | Missing`);
    console.log('─'.repeat(80));

    result.affectedParticipants.forEach((info, participantId) => {
      console.log(
        `${info.name.padEnd(20)} | ${participantId.padEnd(25)} | ${String(info.totalSubmissions).padEnd(5)} | ${info.submissionsWithoutCode}`
      );
    });
    console.log('─'.repeat(80));
  }

  // 4. 잠재적 문제 분석
  console.log('\n📈 Impact Analysis:\n');

  if (result.participantsWithoutCode > 0) {
    console.log(`⚠️  ${result.participantsWithoutCode} participants have no participationCode`);
    console.log(`   → Fallback to participant.id will be used`);
  }

  if (result.submissionsWithoutCode > 0) {
    console.log(`⚠️  ${result.submissionsWithoutCode} submissions have no participationCode`);
    console.log(`   → These submissions will be EXCLUDED from cumulative count`);
    console.log(`   → Affected: ${result.affectedParticipants.size} participants`);

    const totalMissedSubmissions = Array.from(result.affectedParticipants.values())
      .reduce((sum, info) => sum + info.submissionsWithoutCode, 0);

    console.log(`   → Total missed submissions: ${totalMissedSubmissions}`);
  }

  if (result.participantsWithCode === result.totalParticipants &&
      result.submissionsWithCode === result.totalSubmissions) {
    console.log('✅ All data has participationCode - No issues detected!');
  }

  return result;
}

// 실행
async function main() {
  try {
    const cohortId = process.argv[2] || '3'; // 기본값: 3기

    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║  participationCode Data Integrity Check                       ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');

    const result = await checkParticipationCode(cohortId);

    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║  Summary                                                       ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log(`\nCohort: ${result.cohortId}`);
    console.log(`Participants: ${result.participantsWithCode}/${result.totalParticipants} have code`);
    console.log(`Submissions: ${result.submissionsWithCode}/${result.totalSubmissions} have code`);

    if (result.affectedParticipants.size > 0) {
      console.log(`\n⚠️  WARNING: ${result.affectedParticipants.size} participants affected`);
      console.log(`   These users may see LOWER cumulative submission count!`);
    } else {
      console.log('\n✅ No data integrity issues detected');
    }

    console.log('\n✨ Check complete!\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

main();
