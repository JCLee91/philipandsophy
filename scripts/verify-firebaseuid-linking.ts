/**
 * Firebase UID 연결 검증 스크립트
 *
 * 모든 participant 문서에 firebaseUid가 올바르게 설정되어 있는지 확인합니다.
 *
 * 사용법:
 * npm run verify:firebaseuid
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

async function verifyFirebaseUidLinking() {
  console.log('🔍 Participant 문서의 firebaseUid 연결 상태 검증 중...\n');

  try {
    const participantsSnapshot = await db.collection('participants').get();

    if (participantsSnapshot.empty) {
      console.log('⚠️  Participant 문서가 없습니다.');
      return;
    }

    console.log(`📊 총 ${participantsSnapshot.size}명의 participant 확인 중...\n`);

    let linkedCount = 0;
    let missingCount = 0;
    let invalidCount = 0;

    const missingUids: Array<{ id: string; name: string; phone: string }> = [];
    const invalidUids: Array<{ id: string; name: string; uid: string; error: string }> = [];

    for (const doc of participantsSnapshot.docs) {
      const data = doc.data();
      const name = data.name || '이름 없음';
      const phoneNumber = data.phoneNumber || 'N/A';
      const firebaseUid = data.firebaseUid;

      // firebaseUid 누락
      if (!firebaseUid) {
        missingCount++;
        missingUids.push({
          id: doc.id,
          name,
          phone: phoneNumber
        });
        continue;
      }

      // Firebase Auth에서 해당 UID가 존재하는지 확인
      try {
        await admin.auth().getUser(firebaseUid);
        linkedCount++;
      } catch (error: any) {
        invalidCount++;
        invalidUids.push({
          id: doc.id,
          name,
          uid: firebaseUid,
          error: error.message || 'Unknown error'
        });
      }
    }

    // 결과 출력
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 검증 결과 요약');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ 정상 연결: ${linkedCount}명`);
    console.log(`⚠️  firebaseUid 누락: ${missingCount}명`);
    console.log(`❌ 잘못된 firebaseUid: ${invalidCount}명`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // firebaseUid 누락 상세
    if (missingUids.length > 0) {
      console.log('⚠️  firebaseUid가 누락된 participant:');
      missingUids.forEach(({ id, name, phone }) => {
        console.log(`   - ${id} (${name}, ${phone})`);
      });
      console.log();
    }

    // 잘못된 firebaseUid 상세
    if (invalidUids.length > 0) {
      console.log('❌ 잘못된 firebaseUid를 가진 participant:');
      invalidUids.forEach(({ id, name, uid, error }) => {
        console.log(`   - ${id} (${name})`);
        console.log(`     UID: ${uid}`);
        console.log(`     오류: ${error}\n`);
      });
    }

    // 경고 및 권장 조치
    if (missingCount > 0 || invalidCount > 0) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('⚠️  조치 필요');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('현재 보안 규칙은 firebaseUid 필드를 전제로 합니다.');
      console.log('누락/잘못된 UID를 가진 participant는 다음 작업이 불가능합니다:');
      console.log('  - 메시지 읽기/쓰기');
      console.log('  - 독서 인증 생성/수정');
      console.log('  - 프로필 정보 업데이트\n');
      console.log('권장 조치:');
      console.log('  1. 해당 participant의 전화번호로 Firebase Phone Auth 로그인');
      console.log('  2. 로그인 후 participant 문서에 firebaseUid 설정');
      console.log('  3. 또는 scripts/migrate-users-to-firebase-phone-auth.ts 실행\n');
    } else {
      console.log('✅ 모든 participant의 firebaseUid가 정상적으로 연결되어 있습니다!\n');
    }

  } catch (error: any) {
    console.error('❌ 검증 중 오류 발생:', error.message);
    process.exit(1);
  }
}

// 실행
verifyFirebaseUidLinking()
  .then(() => {
    console.log('🎉 검증 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 예상치 못한 오류:', error);
    process.exit(1);
  });
