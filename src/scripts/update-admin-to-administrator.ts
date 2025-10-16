/**
 * 관리자 isAdministrator 필드 업데이트 스크립트
 *
 * 기존 DB의 isAdmin: true인 관리자들을
 * isAdministrator: true로 업데이트합니다.
 *
 * 이렇게 하면 코드가 isAdministrator만 체크해도
 * 관리자 권한이 정상 작동합니다.
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// Service Account 키 경로
const serviceAccountPath = path.join(process.cwd(), 'firebase-service-account.json');

// 키 파일 확인
if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Service Account 키 파일을 찾을 수 없습니다.');
  process.exit(1);
}

// Admin SDK 초기화
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

// 알려진 관리자 ID들
const ADMIN_IDS = ['admin', 'admin2', 'admin3'];

async function updateAdminFields() {
  console.log('🔧 관리자 isAdministrator 필드 업데이트 시작...\n');

  const participantsRef = db.collection('participants');
  const snapshot = await participantsRef.get();

  let updateCount = 0;
  const batch = db.batch();

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const isKnownAdmin = ADMIN_IDS.includes(doc.id);
    const hasIsAdmin = data.isAdmin === true;
    const hasIsAdministrator = data.isAdministrator === true;

    // 관리자인데 isAdministrator가 false인 경우만 업데이트
    if (isKnownAdmin && !hasIsAdministrator) {
      console.log(`📝 관리자 발견: ${data.name} (ID: ${doc.id})`);
      console.log(`   현재 상태: isAdmin=${hasIsAdmin}, isAdministrator=${hasIsAdministrator}`);
      console.log(`   ➜ isAdministrator를 true로 설정합니다.\n`);

      batch.update(doc.ref, {
        isAdministrator: true,
        isAdmin: admin.firestore.FieldValue.delete(), // 레거시 필드 제거
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      updateCount++;
    }
  }

  if (updateCount > 0) {
    await batch.commit();
    console.log(`✅ 총 ${updateCount}명의 관리자 필드를 업데이트했습니다.\n`);
    console.log('📝 업데이트 내용:');
    console.log('   - isAdministrator: false → true');
    console.log('   - isAdmin: 삭제 (레거시 필드 제거)');
    console.log('   - updatedAt: 현재 시각으로 갱신\n');
  } else {
    console.log('ℹ️  업데이트할 관리자가 없습니다. 이미 모든 관리자가 올바르게 설정되어 있습니다.\n');
  }

  // 업데이트 후 상태 확인
  console.log('📊 최종 관리자 상태:');
  console.log('─'.repeat(50));

  for (const adminId of ADMIN_IDS) {
    const adminDoc = await participantsRef.doc(adminId).get();
    if (adminDoc.exists) {
      const data = adminDoc.data();
      console.log(`${data?.name} (${adminId})`);
      console.log(`   isAdministrator: ${data?.isAdministrator === true ? '✅' : '❌'}`);
      console.log(`   isAdmin: ${data?.isAdmin === true ? '⚠️ (레거시)' : '삭제됨 ✅'}`);
      console.log();
    }
  }
}

async function main() {
  try {
    await updateAdminFields();
    console.log('🎉 관리자 필드 업데이트 완료!');
    process.exit(0);
  } catch (error) {
    console.error('❌ 에러 발생:', error);
    process.exit(1);
  }
}

main();