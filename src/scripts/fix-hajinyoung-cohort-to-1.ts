/**
 * 하진영-5953 참가자의 cohortId를 올바르게 1로 수정
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

async function fixCohortIdTo1() {
  console.log('🔧 하진영-5953 cohortId 올바르게 수정 중...\n');

  const app = initAdmin();
  const db = app.firestore();

  // 1. 참가자 cohortId를 1로 수정
  await db.collection('participants').doc('하진영-5953').update({
    cohortId: '1',
    updatedAt: admin.firestore.Timestamp.now(),
  });

  console.log('✅ 참가자 cohortId: 10 → 1 수정 완료!');

  // 2. 모든 제출 데이터도 cohortId를 1로 수정
  console.log('\n📋 제출 데이터 cohortId 수정 중...');
  const submissionsSnapshot = await db
    .collection('reading_submissions')
    .where('participantId', '==', '하진영-5953')
    .get();

  let updateCount = 0;
  for (const doc of submissionsSnapshot.docs) {
    await doc.ref.update({
      cohortId: '1',
      updatedAt: admin.firestore.Timestamp.now(),
    });
    updateCount++;
  }

  console.log(`✅ ${updateCount}개 제출 데이터 cohortId 수정 완료`);
}

fixCohortIdTo1()
  .then(() => {
    console.log('\n✅ 완료! 이제 cohort 1의 어제 제출 현황에 하진영님이 카운트됩니다.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 에러:', error);
    process.exit(1);
  });
