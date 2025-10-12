/**
 * 하진영-5953 참가자의 관리자 상태 확인
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

async function checkHaJinYoungStatus() {
  console.log('🔍 하진영-5953 참가자 상태 확인 중...\n');

  const app = initAdmin();
  const db = app.firestore();

  // 하진영 참가자 문서 읽기
  const docRef = db.collection('participants').doc('하진영-5953');
  const doc = await docRef.get();

  if (!doc.exists) {
    console.log('❌ 하진영-5953 참가자를 찾을 수 없습니다.');
    return;
  }

  const data = doc.data();
  console.log('📄 하진영-5953 참가자 정보:');
  console.log(`   이름: ${data?.name}`);
  console.log(`   코호트: ${data?.cohortId}`);
  console.log(`   전화번호: ${data?.phone}`);
  console.log(`   isAdmin: ${data?.isAdmin || false}`);
  console.log(`   isAdministrator: ${data?.isAdministrator || false}`);
  console.log(`   직업: ${data?.occupation || '미입력'}`);

  if (data?.isAdmin || data?.isAdministrator) {
    console.log('\n⚠️ 관리자로 설정되어 있어 제출 현황에서 제외됩니다!');
    console.log('   → isAdmin, isAdministrator를 false로 변경해야 합니다.');
  } else {
    console.log('\n✅ 관리자가 아닙니다. 다른 문제를 확인해야 합니다.');
  }

  // 어제 제출 내역 확인
  console.log('\n📋 어제(2025-10-11) 제출 내역 확인...');
  const submissionsSnapshot = await db
    .collection('reading_submissions')
    .where('participantId', '==', '하진영-5953')
    .where('submissionDate', '==', '2025-10-11')
    .get();

  if (submissionsSnapshot.empty) {
    console.log('❌ 어제 제출 내역이 없습니다!');
  } else {
    console.log(`✅ 어제 제출 내역 ${submissionsSnapshot.size}개 발견`);
    submissionsSnapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`   - 문서 ID: ${doc.id}`);
      console.log(`   - 코호트: ${data.cohortId}`);
      console.log(`   - 책: ${data.bookTitle}`);
    });
  }
}

checkHaJinYoungStatus()
  .then(() => {
    console.log('\n✅ 완료!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 에러:', error);
    process.exit(1);
  });
