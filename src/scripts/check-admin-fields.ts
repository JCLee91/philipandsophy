/**
 * 참가자 isAdmin/isAdministrator 필드 확인 스크립트
 *
 * 문제: 일반 참가자까지 isAdmin: true가 설정되어 참가자 리스트가 빈 배열로 표시됨
 * 위치: src/app/app/chat/participants/page.tsx:161
 * 필터: participants.filter((p) => !p.isAdmin)
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

async function checkAdminFields() {
  console.log('🔍 참가자 isAdmin/isAdministrator 필드 확인 시작...\n');

  const db = initializeFirebaseAdmin();

  // 모든 참가자 조회
  const participantsSnapshot = await db.collection('participants').get();
  console.log(`📚 총 ${participantsSnapshot.size}명 참가자 발견\n`);

  const results = {
    correctAdmins: [] as any[],
    incorrectAdmins: [] as any[],
    correctRegular: [] as any[],
  };

  for (const doc of participantsSnapshot.docs) {
    const data = doc.data();
    const isAdmin = data.isAdmin === true;
    const isAdministrator = data.isAdministrator === true;
    const shouldBeAdmin = ADMIN_PHONE_NUMBERS.includes(data.phoneNumber);

    const participant = {
      id: doc.id,
      name: data.name,
      phoneNumber: data.phoneNumber,
      cohortId: data.cohortId,
      isAdmin,
      isAdministrator,
      shouldBeAdmin,
    };

    if (shouldBeAdmin && (isAdmin || isAdministrator)) {
      // ✅ 정상: 관리자이고 플래그도 true
      results.correctAdmins.push(participant);
    } else if (!shouldBeAdmin && (isAdmin || isAdministrator)) {
      // ❌ 문제: 일반 참가자인데 관리자 플래그가 true
      results.incorrectAdmins.push(participant);
    } else if (!shouldBeAdmin && !isAdmin && !isAdministrator) {
      // ✅ 정상: 일반 참가자이고 플래그도 false
      results.correctRegular.push(participant);
    }
  }

  // 결과 출력
  console.log('✅ 정상 관리자 (isAdmin 또는 isAdministrator = true):');
  console.log(`   총 ${results.correctAdmins.length}명\n`);
  results.correctAdmins.forEach((p, index) => {
    console.log(`   ${index + 1}. ${p.name} (ID: ${p.id})`);
    console.log(`      전화번호: ${p.phoneNumber}`);
    console.log(`      isAdmin: ${p.isAdmin}, isAdministrator: ${p.isAdministrator}`);
    console.log('');
  });

  console.log('❌ 문제 있는 참가자 (일반 참가자인데 isAdmin/isAdministrator = true):');
  console.log(`   총 ${results.incorrectAdmins.length}명\n`);
  if (results.incorrectAdmins.length > 0) {
    results.incorrectAdmins.forEach((p, index) => {
      console.log(`   ${index + 1}. ${p.name} (ID: ${p.id})`);
      console.log(`      전화번호: ${p.phoneNumber}`);
      console.log(`      isAdmin: ${p.isAdmin}, isAdministrator: ${p.isAdministrator}`);
      console.log('');
    });
    console.log('⚠️  이 참가자들의 isAdmin/isAdministrator를 false로 수정해야 합니다.');
    console.log('   수정 스크립트: npm run fix:admin-fields\n');
  } else {
    console.log('   없음 (모두 정상)\n');
  }

  console.log('✅ 정상 일반 참가자 (isAdmin/isAdministrator = false):');
  console.log(`   총 ${results.correctRegular.length}명\n`);

  console.log('📊 요약:');
  console.log(`   정상 관리자: ${results.correctAdmins.length}명`);
  console.log(`   문제 있는 참가자: ${results.incorrectAdmins.length}명 ⚠️`);
  console.log(`   정상 일반 참가자: ${results.correctRegular.length}명`);
  console.log(`   전체: ${participantsSnapshot.size}명`);

  process.exit(0);
}

checkAdminFields().catch((error) => {
  console.error('❌ 오류:', error);
  process.exit(1);
});
