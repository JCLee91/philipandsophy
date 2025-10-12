/**
 * 하진영-5953 참가자의 cohortId를 10으로 업데이트
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

async function updateCohortId() {
  console.log('🔧 하진영-5953 cohortId 업데이트 중...\n');

  const app = initAdmin();
  const db = app.firestore();

  // 하진영 참가자 업데이트
  await db.collection('participants').doc('하진영-5953').update({
    cohortId: '10',
    updatedAt: admin.firestore.Timestamp.now(),
  });

  console.log('✅ cohortId를 1 → 10으로 업데이트 완료!');

  // 어제 제출 데이터도 cohortId 확인 및 업데이트
  console.log('\n📋 제출 데이터 cohortId 확인 중...');
  const submissionsSnapshot = await db
    .collection('reading_submissions')
    .where('participantId', '==', '하진영-5953')
    .where('submissionDate', '==', '2025-10-11')
    .get();

  let updateCount = 0;
  for (const doc of submissionsSnapshot.docs) {
    const data = doc.data();
    if (!data.cohortId || data.cohortId !== '10') {
      await doc.ref.update({
        cohortId: '10',
        updatedAt: admin.firestore.Timestamp.now(),
      });
      console.log(`   ✅ 제출 데이터 ${doc.id} cohortId 업데이트`);
      updateCount++;
    }
  }

  if (updateCount === 0) {
    console.log('   ✅ 모든 제출 데이터가 이미 cohortId 10입니다.');
  } else {
    console.log(`   ✅ ${updateCount}개 제출 데이터 업데이트 완료`);
  }
}

updateCohortId()
  .then(() => {
    console.log('\n✅ 완료! 이제 어제 제출 현황에 하진영님이 카운트됩니다.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 에러:', error);
    process.exit(1);
  });
