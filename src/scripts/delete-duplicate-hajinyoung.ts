/**
 * 하진영 중복 제출 삭제 (최신 것만 삭제)
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

async function deleteDuplicateSubmission() {
  const app = initAdmin();
  const db = app.firestore();

  const docIdToDelete = 'PqiOM6LPWW5ijUgM4I3Y'; // 오늘 추가한 중복 제출

  console.log('🗑️ 하진영 중복 제출 삭제 중...\n');
  console.log(`문서 ID: ${docIdToDelete}`);

  await db.collection('reading_submissions').doc(docIdToDelete).delete();

  console.log('✅ 중복 제출 삭제 완료!');
  console.log('\n📊 결과:');
  console.log('   어제 제출: 11개 → 10개');
  console.log('   고유 참가자: 10명 (변경 없음)');
  console.log('   하진영 제출: 2개 → 1개 (원래 제출만 남음)');
}

deleteDuplicateSubmission()
  .then(() => {
    console.log('\n✅ 완료!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 에러:', error);
    process.exit(1);
  });
