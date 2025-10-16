/**
 * Firebase Custom Claims 설정 스크립트
 *
 * 관리자 participant 문서를 찾아서 해당 Firebase UID에 admin claim을 설정합니다.
 *
 * 사용법:
 * npm run set:admin-claims
 */

import * as admin from 'firebase-admin';

// Firebase Admin 초기화 (서비스 계정 키 사용)
if (!admin.apps.length) {
  const serviceAccount = require('../firebase-service-account.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function setAdminClaims() {
  console.log('🔍 관리자 participant 문서 검색 중...\n');

  try {
    // participants 컬렉션에서 isAdministrator=true인 문서 찾기
    const participantsSnapshot = await db
      .collection('participants')
      .where('isAdministrator', '==', true)
      .get();

    if (participantsSnapshot.empty) {
      console.log('⚠️  isAdministrator=true인 participant가 없습니다.');
      return;
    }

    console.log(`✅ ${participantsSnapshot.size}명의 관리자를 발견했습니다.\n`);

    // 각 관리자에 대해 Custom Claims 설정
    for (const doc of participantsSnapshot.docs) {
      const data = doc.data();
      const firebaseUid = data.firebaseUid;
      const name = data.name || '이름 없음';

      if (!firebaseUid) {
        console.log(`⏭️  ${doc.id} (${name}): firebaseUid가 없어 건너뜁니다.`);
        continue;
      }

      try {
        // Firebase Auth에서 사용자 찾기
        const user = await admin.auth().getUser(firebaseUid);

        // 이미 admin claim이 있는지 확인
        const currentClaims = user.customClaims || {};
        if (currentClaims.admin === true) {
          console.log(`✓  ${doc.id} (${name}): 이미 admin claim이 설정되어 있습니다.`);
          continue;
        }

        // Custom Claims 설정
        await admin.auth().setCustomUserClaims(firebaseUid, {
          ...currentClaims,
          admin: true
        });

        console.log(`✅ ${doc.id} (${name}): admin claim을 설정했습니다.`);
        console.log(`   Firebase UID: ${firebaseUid}`);
        console.log(`   전화번호: ${data.phoneNumber || 'N/A'}\n`);

      } catch (error: any) {
        console.error(`❌ ${doc.id} (${name}): Custom Claims 설정 실패`);
        console.error(`   오류: ${error.message}\n`);
      }
    }

    console.log('\n✅ 완료! 클라이언트에서 토큰을 새로고침해야 합니다.');
    console.log('   예: await auth.currentUser?.getIdToken(true);\n');

  } catch (error: any) {
    console.error('❌ 스크립트 실행 중 오류 발생:', error.message);
    process.exit(1);
  }
}

// 실행
setAdminClaims()
  .then(() => {
    console.log('🎉 스크립트 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 예상치 못한 오류:', error);
    process.exit(1);
  });
