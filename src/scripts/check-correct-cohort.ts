/**
 * 올바른 코호트 ID 확인
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

async function checkCorrectCohort() {
  const app = initAdmin();
  const db = app.firestore();

  // 1. 모든 코호트 확인
  console.log('📋 전체 코호트 목록:\n');
  const cohortsSnapshot = await db.collection('cohorts').get();

  cohortsSnapshot.forEach((doc) => {
    const data = doc.data();
    console.log(`코호트 ID: ${doc.id}`);
    console.log(`  이름: ${data.name || '미지정'}`);
    console.log(`  시작일: ${data.startDate || '미지정'}`);
    console.log(`  종료일: ${data.endDate || '미지정'}`);
    console.log('');
  });

  // 2. 참가자들이 사용하는 cohortId 통계
  console.log('📊 참가자 cohortId 분포:\n');
  const participantsSnapshot = await db.collection('participants').get();

  const cohortCounts = new Map<string, number>();
  participantsSnapshot.forEach((doc) => {
    const data = doc.data();
    const cohortId = data.cohortId || 'undefined';
    cohortCounts.set(cohortId, (cohortCounts.get(cohortId) || 0) + 1);
  });

  cohortCounts.forEach((count, cohortId) => {
    console.log(`cohortId "${cohortId}": ${count}명`);
  });

  // 3. 어제(2025-10-11) 제출자들의 cohortId 확인
  console.log('\n📅 어제(2025-10-11) 제출자들의 cohortId:\n');
  const submissionsSnapshot = await db
    .collection('reading_submissions')
    .where('submissionDate', '==', '2025-10-11')
    .get();

  const submitterCohorts = new Map<string, Set<string>>();

  for (const doc of submissionsSnapshot.docs) {
    const data = doc.data();
    const participantId = data.participantId;

    // 참가자 정보 가져오기
    const participantDoc = await db.collection('participants').doc(participantId).get();
    if (participantDoc.exists) {
      const participantData = participantDoc.data();
      const cohortId = participantData?.cohortId || 'undefined';

      if (!submitterCohorts.has(cohortId)) {
        submitterCohorts.set(cohortId, new Set());
      }
      submitterCohorts.get(cohortId)!.add(participantId);
    }
  }

  submitterCohorts.forEach((participants, cohortId) => {
    console.log(`cohortId "${cohortId}": ${participants.size}명`);
    participants.forEach((id) => console.log(`  - ${id}`));
  });

  // 4. 하진영의 원래 cohortId 복구 필요 여부
  console.log('\n🔍 하진영-5953의 올바른 cohortId 판단:\n');
  const haJinYoungDoc = await db.collection('participants').doc('하진영-5953').get();
  const currentCohortId = haJinYoungDoc.data()?.cohortId;

  console.log(`현재 cohortId: ${currentCohortId}`);
  console.log(`다른 참가자들이 주로 사용하는 cohortId: ${Array.from(cohortCounts.entries()).sort((a, b) => b[1] - a[1])[0][0]}`);
}

checkCorrectCohort()
  .then(() => {
    console.log('\n✅ 확인 완료!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 에러:', error);
    process.exit(1);
  });
