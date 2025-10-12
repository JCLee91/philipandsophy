/**
 * 어제 제출 현황 디버깅: 전체 제출자와 필터링 과정 확인
 */

import * as admin from 'firebase-admin';
import { resolve } from 'path';

function initAdmin() {
  if (admin.apps.length > 0) return admin.app();
  const serviceAccountPath = resolve(process.cwd(), 'firebase-service-account.json');
  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccountPath),
  });
}

async function debugYesterdaySubmissions() {
  const app = initAdmin();
  const db = app.firestore();

  const yesterday = '2025-10-11';
  const yesterdayQuestion = '일상에서 가장 즐거움이나 몰입감을 느끼는 순간은 언제인가요?';
  const cohortId = '1';

  console.log('🔍 어제 제출 현황 디버깅\n');
  console.log(`📅 날짜: ${yesterday}`);
  console.log(`❓ 질문: ${yesterdayQuestion}`);
  console.log(`🏷️ 코호트: ${cohortId}\n`);

  // 1. 어제 제출된 모든 submissions 조회
  console.log('1️⃣ 어제 제출된 모든 submissions:');
  const submissionsSnapshot = await db
    .collection('reading_submissions')
    .where('submissionDate', '==', yesterday)
    .where('dailyQuestion', '==', yesterdayQuestion)
    .get();

  console.log(`   총 ${submissionsSnapshot.size}개 제출\n`);

  // 2. 참가자 ID 중복 제거
  const participantIds = new Set<string>();
  submissionsSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    participantIds.add(data.participantId);
  });

  console.log('2️⃣ 중복 제거 후 고유 참가자 수:');
  console.log(`   ${participantIds.size}명\n`);

  // 3. 각 참가자의 상세 정보 확인
  console.log('3️⃣ 참가자별 상세 정보:\n');

  let validCount = 0;
  let excludedByAdmin = 0;
  let excludedByCohort = 0;
  let notFound = 0;

  for (const participantId of Array.from(participantIds)) {
    const participantDoc = await db.collection('participants').doc(participantId).get();

    if (!participantDoc.exists) {
      console.log(`❌ ${participantId}: 참가자 문서 없음`);
      notFound++;
      continue;
    }

    const data = participantDoc.data()!;
    const isAdmin = data.isAdmin || data.isAdministrator || false;
    const participantCohortId = data.cohortId;

    const status = [];
    let isValid = true;

    if (isAdmin) {
      status.push('관리자');
      excludedByAdmin++;
      isValid = false;
    }

    if (participantCohortId !== cohortId) {
      status.push(`다른 코호트(${participantCohortId})`);
      excludedByCohort++;
      isValid = false;
    }

    if (isValid) {
      console.log(`✅ ${participantId} (${data.name}): 카운트됨`);
      validCount++;
    } else {
      console.log(`❌ ${participantId} (${data.name}): 제외됨 [${status.join(', ')}]`);
    }
  }

  // 4. 요약
  console.log('\n📊 필터링 요약:');
  console.log(`   전체 제출: ${submissionsSnapshot.size}개`);
  console.log(`   고유 참가자: ${participantIds.size}명`);
  console.log(`   ✅ 유효 참가자: ${validCount}명`);
  console.log(`   ❌ 관리자로 제외: ${excludedByAdmin}명`);
  console.log(`   ❌ 다른 코호트로 제외: ${excludedByCohort}명`);
  console.log(`   ❌ 참가자 문서 없음: ${notFound}명`);

  console.log('\n💡 결론:');
  console.log(`   UI에 표시되어야 할 숫자: ${validCount}명`);

  // 5. 하진영 확인
  console.log('\n🔍 하진영-5953 특별 확인:');
  if (participantIds.has('하진영-5953')) {
    const haJinYoungDoc = await db.collection('participants').doc('하진영-5953').get();
    const data = haJinYoungDoc.data()!;
    console.log(`   ✅ 제출 내역 있음`);
    console.log(`   cohortId: ${data.cohortId}`);
    console.log(`   isAdmin: ${data.isAdmin || false}`);
    console.log(`   isAdministrator: ${data.isAdministrator || false}`);

    if (data.cohortId === cohortId && !data.isAdmin && !data.isAdministrator) {
      console.log(`   → 카운트 되어야 함!`);
    } else {
      console.log(`   → 제외되는 이유가 있음`);
    }
  } else {
    console.log('   ❌ 어제 제출 내역 없음');
  }
}

debugYesterdaySubmissions()
  .then(() => {
    console.log('\n✅ 디버깅 완료!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 에러:', error);
    process.exit(1);
  });
