/**
 * 관리자 Custom Claims 검증 스크립트
 *
 * isAdministrator=true인 participant의 Firebase UID에 admin claim이 설정되어 있는지 확인합니다.
 *
 * 사용법:
 * npm run verify:admin-claims
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

async function verifyAdminClaims() {
  console.log('🔍 관리자 Custom Claims 검증 중...\n');

  try {
    // isAdministrator=true인 participant 찾기
    const adminParticipantsSnapshot = await db
      .collection('participants')
      .where('isAdministrator', '==', true)
      .get();

    if (adminParticipantsSnapshot.empty) {
      console.log('⚠️  isAdministrator=true인 participant가 없습니다.');
      console.log('   관리자 기능을 사용하려면 먼저 관리자 participant를 생성하세요.\n');
      return;
    }

    console.log(`📊 총 ${adminParticipantsSnapshot.size}명의 관리자 participant 확인 중...\n`);

    let withClaimCount = 0;
    let withoutClaimCount = 0;
    let missingUidCount = 0;

    const withoutClaim: Array<{ id: string; name: string; uid: string }> = [];
    const missingUid: Array<{ id: string; name: string }> = [];

    for (const doc of adminParticipantsSnapshot.docs) {
      const data = doc.data();
      const name = data.name || '이름 없음';
      const firebaseUid = data.firebaseUid;

      // firebaseUid 누락
      if (!firebaseUid) {
        missingUidCount++;
        missingUid.push({
          id: doc.id,
          name
        });
        continue;
      }

      try {
        // Firebase Auth에서 사용자 정보 가져오기
        const user = await admin.auth().getUser(firebaseUid);
        const customClaims = user.customClaims || {};

        // admin claim 확인
        if (customClaims.admin === true) {
          withClaimCount++;
          console.log(`✅ ${doc.id} (${name}): admin claim 설정됨`);
          console.log(`   Firebase UID: ${firebaseUid}`);
          console.log(`   전화번호: ${data.phoneNumber || 'N/A'}\n`);
        } else {
          withoutClaimCount++;
          withoutClaim.push({
            id: doc.id,
            name,
            uid: firebaseUid
          });
        }
      } catch (error: any) {
        console.error(`❌ ${doc.id} (${name}): Firebase Auth 사용자를 찾을 수 없음`);
        console.error(`   Firebase UID: ${firebaseUid}`);
        console.error(`   오류: ${error.message}\n`);
      }
    }

    // 결과 요약
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 검증 결과 요약');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ admin claim 설정됨: ${withClaimCount}명`);
    console.log(`⚠️  admin claim 없음: ${withoutClaimCount}명`);
    console.log(`❌ firebaseUid 누락: ${missingUidCount}명`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // admin claim이 없는 관리자
    if (withoutClaim.length > 0) {
      console.log('⚠️  admin claim이 없는 관리자:');
      withoutClaim.forEach(({ id, name, uid }) => {
        console.log(`   - ${id} (${name})`);
        console.log(`     Firebase UID: ${uid}`);
      });
      console.log();
    }

    // firebaseUid 누락 관리자
    if (missingUid.length > 0) {
      console.log('❌ firebaseUid가 누락된 관리자:');
      missingUid.forEach(({ id, name }) => {
        console.log(`   - ${id} (${name})`);
      });
      console.log();
    }

    // 조치 필요 여부
    if (withoutClaimCount > 0 || missingUidCount > 0) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('⚠️  조치 필요');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('현재 보안 규칙은 Custom Claims 기반입니다.');
      console.log('admin claim이 없는 관리자는 다음 작업이 불가능합니다:');
      console.log('  - 공지사항 생성/수정/삭제');
      console.log('  - 기수(Cohort) 생성/수정');
      console.log('  - Storage에서 공지사항 이미지 업로드\n');
      console.log('권장 조치:');
      console.log('  npm run set:admin-claims\n');
      console.log('이 명령어는 isAdministrator=true인 모든 participant에게');
      console.log('자동으로 admin claim을 설정합니다.\n');
    } else {
      console.log('✅ 모든 관리자에게 admin claim이 정상적으로 설정되어 있습니다!\n');
      console.log('💡 Tip: 클라이언트에서 토큰을 새로고침해야 적용됩니다:');
      console.log('   await auth.currentUser?.getIdToken(true);\n');
    }

  } catch (error: any) {
    console.error('❌ 검증 중 오류 발생:', error.message);
    process.exit(1);
  }
}

// 실행
verifyAdminClaims()
  .then(() => {
    console.log('🎉 검증 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 예상치 못한 오류:', error);
    process.exit(1);
  });
