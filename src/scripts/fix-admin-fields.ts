/**
 * 참가자 isAdmin/isAdministrator 필드 수정 스크립트
 *
 * 일반 참가자의 isAdmin/isAdministrator를 false로 되돌립니다.
 * 실행 전 반드시 check-admin-fields 스크립트로 확인하세요.
 */

import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin.firestore();
  }

  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (serviceAccountEnv) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(serviceAccountEnv)),
    });
  } else if (serviceAccountPath) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccountPath),
    });
  } else {
    throw new Error('Firebase 인증 정보가 없습니다.');
  }

  return admin.firestore();
}

// 실제 관리자 전화번호 목록
const ADMIN_PHONE_NUMBERS = [
  '01000000001',  // admin (운영자)
  '42633467921',  // admin2 (문준영)
  '42627615193',  // admin3 (김현지)
];

async function fixAdminFields() {
  console.log('🔧 참가자 isAdmin/isAdministrator 필드 수정 시작...\n');

  const db = initializeFirebaseAdmin();

  // 모든 참가자 조회
  const participantsSnapshot = await db.collection('participants').get();
  console.log(`📚 총 ${participantsSnapshot.size}명 참가자 확인 중...\n`);

  const toFix: any[] = [];
  const alreadyCorrect: any[] = [];

  // 1단계: 수정이 필요한 참가자 식별
  for (const doc of participantsSnapshot.docs) {
    const data = doc.data();
    const isAdmin = data.isAdmin === true;
    const isAdministrator = data.isAdministrator === true;
    const shouldBeAdmin = ADMIN_PHONE_NUMBERS.includes(data.phoneNumber);

    if (!shouldBeAdmin && (isAdmin || isAdministrator)) {
      // 일반 참가자인데 관리자 플래그가 true
      toFix.push({
        id: doc.id,
        name: data.name,
        phoneNumber: data.phoneNumber,
        cohortId: data.cohortId,
        currentIsAdmin: isAdmin,
        currentIsAdministrator: isAdministrator,
      });
    } else {
      alreadyCorrect.push({
        id: doc.id,
        name: data.name,
        shouldBeAdmin,
      });
    }
  }

  console.log('📊 수정 대상 분석 완료:');
  console.log(`   수정 필요: ${toFix.length}명`);
  console.log(`   정상 상태: ${alreadyCorrect.length}명\n`);

  if (toFix.length === 0) {
    console.log('✅ 모든 참가자가 정상 상태입니다. 수정할 항목이 없습니다.');
    process.exit(0);
  }

  // 수정할 참가자 목록 출력
  console.log('🔧 다음 참가자들을 수정합니다:\n');
  toFix.forEach((p, index) => {
    console.log(`   ${index + 1}. ${p.name} (ID: ${p.id})`);
    console.log(`      전화번호: ${p.phoneNumber}`);
    console.log(`      현재 isAdmin: ${p.currentIsAdmin} → false`);
    console.log(`      현재 isAdministrator: ${p.currentIsAdministrator} → false`);
    console.log('');
  });

  // 2단계: Firestore 업데이트
  console.log('🚀 Firestore 업데이트 시작...\n');

  const batch = db.batch();
  let updateCount = 0;

  for (const participant of toFix) {
    const docRef = db.collection('participants').doc(participant.id);

    // isAdmin과 isAdministrator 모두 false로 설정
    batch.update(docRef, {
      isAdmin: false,
      isAdministrator: false,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    updateCount++;
    console.log(`   ✅ ${participant.name} (ID: ${participant.id}) 업데이트 준비 완료`);
  }

  // Batch commit
  await batch.commit();

  console.log(`\n✅ 총 ${updateCount}명의 참가자 필드를 수정했습니다.`);
  console.log('\n📝 수정 내용:');
  console.log('   - isAdmin: true → false');
  console.log('   - isAdministrator: true → false');
  console.log('   - updatedAt: 현재 시각으로 갱신');

  console.log('\n✅ 수정 완료! 다시 확인하려면:');
  console.log('   npm run check:admin-fields');

  process.exit(0);
}

fixAdminFields().catch((error) => {
  console.error('❌ 오류:', error);
  process.exit(1);
});
