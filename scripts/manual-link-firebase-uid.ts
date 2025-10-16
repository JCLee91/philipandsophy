/**
 * 수동으로 firebaseUid 연결 스크립트
 *
 * 사용법: npx tsx scripts/manual-link-firebase-uid.ts
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

async function manualLinkFirebaseUid() {
  const participantId = 'admin';
  const firebaseUid = 'jt0pdvnLybeTNcFG2Qvuff1Abn22';

  console.log('🔗 Firebase UID 수동 연결 중...\n');
  console.log(`Participant ID: ${participantId}`);
  console.log(`Firebase UID: ${firebaseUid}\n`);

  try {
    const docRef = db.collection('participants').doc(participantId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      console.log('❌ participant 문서가 없습니다.');
      return;
    }

    const data = docSnap.data()!;
    console.log('📄 현재 상태:');
    console.log(`   이름: ${data.name}`);
    console.log(`   전화번호: ${data.phoneNumber}`);
    console.log(`   firebaseUid: ${data.firebaseUid || 'NULL'}\n`);

    // firebaseUid 업데이트
    await docRef.update({
      firebaseUid: firebaseUid,
      updatedAt: admin.firestore.Timestamp.now()
    });

    console.log('✅ firebaseUid 연결 완료!\n');

    // 확인
    const updatedDoc = await docRef.get();
    const updatedData = updatedDoc.data()!;
    console.log('📄 업데이트 후:');
    console.log(`   firebaseUid: ${updatedData.firebaseUid}\n`);

    console.log('💡 다음 단계:');
    console.log('   1. 앱에서 다시 로그인');
    console.log('   2. npm run set:admin-claims 실행');
    console.log('   3. 앱에서 로그아웃 → 재로그인 (토큰 갱신)\n');

  } catch (error: any) {
    console.error('❌ 연결 실패:', error.message);
    process.exit(1);
  }
}

// 실행
manualLinkFirebaseUid()
  .then(() => {
    console.log('🎉 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 예상치 못한 오류:', error);
    process.exit(1);
  });
