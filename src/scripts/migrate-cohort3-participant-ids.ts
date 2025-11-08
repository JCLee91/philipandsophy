/**
 * 3기 참가자 ID 마이그레이션
 *
 * 랜덤 ID → cohort3-이름 (성 제외)
 * 중복 시: cohort3-이름A, cohort3-이름B, ...
 *
 * 실행 방법:
 * npm run migrate:cohort3-participant-ids
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

/**
 * 성을 제외한 이름 추출
 * 예: "문혜선" → "혜선", "김하연" → "하연"
 */
function extractGivenName(fullName: string): string {
  // 한국 이름은 보통 첫 글자가 성
  if (fullName.length <= 2) {
    return fullName; // 2글자 이하는 그대로
  }
  return fullName.slice(1); // 첫 글자 제외
}

/**
 * 중복 시 A, B, C 추가
 */
function generateUniqueId(baseName: string, usedNames: Set<string>): string {
  let newId = `cohort3-${baseName}`;

  if (!usedNames.has(newId)) {
    return newId;
  }

  // 중복이면 A, B, C, ... 추가
  const suffixes = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  for (const suffix of suffixes) {
    const candidateId = `cohort3-${baseName}${suffix}`;
    if (!usedNames.has(candidateId)) {
      return candidateId;
    }
  }

  // 26개 넘으면 숫자로
  let num = 1;
  while (usedNames.has(`cohort3-${baseName}${num}`)) {
    num++;
  }
  return `cohort3-${baseName}${num}`;
}

async function migrateParticipantIds() {
  console.log('🚀 3기 참가자 ID 마이그레이션 시작...\n');

  try {
    // 1. 3기 참가자 조회
    console.log('📖 1. 3기 참가자 조회...');
    const participantsSnapshot = await db
      .collection('participants')
      .where('cohortId', '==', '3')
      .get();

    console.log(`✅ ${participantsSnapshot.size}명 발견\n`);

    // 2. 새 ID 생성 (중복 체크)
    console.log('📝 2. 새 ID 생성 (중복 체크)...');

    const usedNames = new Set<string>();
    const migrations: Array<{
      oldId: string;
      newId: string;
      name: string;
      data: any;
    }> = [];

    participantsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const fullName = data.name;
      const givenName = extractGivenName(fullName);
      const newId = generateUniqueId(givenName, usedNames);

      usedNames.add(newId);

      migrations.push({
        oldId: doc.id,
        newId,
        name: fullName,
        data,
      });
    });

    console.log('✅ ID 생성 완료\n');

    // 3. 미리보기
    console.log('👀 3. 마이그레이션 미리보기:');
    console.log('==================');
    migrations.forEach((m, index) => {
      console.log(`${index + 1}. ${m.name}`);
      console.log(`   OLD: ${m.oldId}`);
      console.log(`   NEW: ${m.newId}`);
      console.log('');
    });

    // 4. 마이그레이션 실행
    console.log('\n🔄 4. 마이그레이션 실행 중...');

    for (const migration of migrations) {
      const { oldId, newId, data } = migration;

      // 새 문서 생성
      await db.collection('participants').doc(newId).set(data);
      console.log(`✅ 생성: ${newId}`);

      // 기존 문서 삭제
      await db.collection('participants').doc(oldId).delete();
      console.log(`🗑️  삭제: ${oldId}`);
    }

    console.log('\n✅ 5. 마이그레이션 완료!');

    // 6. 검증
    console.log('\n🔍 6. 검증 중...');
    const verifySnapshot = await db
      .collection('participants')
      .where('cohortId', '==', '3')
      .get();

    console.log(`   cohort3 참가자 수: ${verifySnapshot.size}명`);

    const newIds = verifySnapshot.docs.map(doc => doc.id);
    const allStartWithCohort3 = newIds.every(id => id.startsWith('cohort3-'));

    console.log(`   모든 ID가 cohort3- 시작: ${allStartWithCohort3 ? '✅' : '❌'}`);

    console.log('\n🎉 마이그레이션 완료!');
  } catch (error) {
    console.error('\n❌ 마이그레이션 실패:', error);
    throw error;
  }
}

migrateParticipantIds();
