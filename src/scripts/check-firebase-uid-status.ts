/**
 * Firebase UID 연결 상태 확인 스크립트
 *
 * 기존 참가자들의 firebaseUid 필드 상태를 확인하고
 * Firebase Auth 마이그레이션 준비 상태를 점검합니다.
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

interface ParticipantStatus {
  id: string;
  name: string;
  phoneNumber: string;
  hasFirebaseUid: boolean;
  firebaseUid?: string;
  isAdministrator: boolean;
  cohortId: string;
}

async function checkFirebaseUidStatus() {
  console.log('🔍 Firebase UID 연결 상태 확인 시작...\n');

  const participantsRef = db.collection('participants');
  const snapshot = await participantsRef.get();

  const statuses: ParticipantStatus[] = [];
  let connectedCount = 0;
  let notConnectedCount = 0;
  let adminCount = 0;

  snapshot.forEach(doc => {
    const data = doc.data();
    const hasFirebaseUid = !!data.firebaseUid;

    const status: ParticipantStatus = {
      id: doc.id,
      name: data.name || 'Unknown',
      phoneNumber: data.phoneNumber || 'Unknown',
      hasFirebaseUid,
      firebaseUid: data.firebaseUid,
      isAdministrator: data.isAdministrator === true,
      cohortId: data.cohortId || 'Unknown',
    };

    statuses.push(status);

    if (data.isAdministrator) {
      adminCount++;
    } else if (hasFirebaseUid) {
      connectedCount++;
    } else {
      notConnectedCount++;
    }
  });

  console.log('📊 전체 통계:');
  console.log(`   총 참가자: ${statuses.length}명`);
  console.log(`   관리자: ${adminCount}명`);
  console.log(`   일반 참가자: ${statuses.length - adminCount}명`);
  console.log();

  console.log('🔗 Firebase UID 연결 상태:');
  console.log(`   연결됨: ${connectedCount}명`);
  console.log(`   미연결: ${notConnectedCount}명`);
  console.log();

  // 관리자 상태
  const admins = statuses.filter(s => s.isAdministrator);
  if (admins.length > 0) {
    console.log('👨‍💼 관리자 계정:');
    admins.forEach(admin => {
      console.log(`   ${admin.name} (${admin.id})`);
      console.log(`      전화번호: ${admin.phoneNumber}`);
      console.log(`      Firebase UID: ${admin.hasFirebaseUid ? '✅ ' + admin.firebaseUid : '❌ 미연결'}`);
    });
    console.log();
  }

  // 미연결 참가자
  const notConnected = statuses.filter(s => !s.isAdministrator && !s.hasFirebaseUid);
  if (notConnected.length > 0) {
    console.log('⚠️ Firebase UID 미연결 참가자:');
    notConnected.forEach(participant => {
      console.log(`   ${participant.name} (${participant.id})`);
      console.log(`      전화번호: ${participant.phoneNumber}`);
      console.log(`      코호트: ${participant.cohortId}`);
    });
    console.log();
    console.log('💡 이 참가자들은 첫 로그인 시 자동으로 Firebase UID가 연결됩니다.');
  } else {
    console.log('✅ 모든 일반 참가자가 Firebase UID에 연결되어 있습니다.');
  }

  // 연결된 참가자
  const connected = statuses.filter(s => !s.isAdministrator && s.hasFirebaseUid);
  if (connected.length > 0) {
    console.log('\n✅ Firebase UID 연결된 참가자:');
    connected.forEach(participant => {
      console.log(`   ${participant.name} (${participant.id})`);
      console.log(`      Firebase UID: ${participant.firebaseUid}`);
    });
  }
}

async function main() {
  try {
    await checkFirebaseUidStatus();
    console.log('\n🎉 Firebase UID 상태 확인 완료!');
    process.exit(0);
  } catch (error) {
    console.error('❌ 에러 발생:', error);
    process.exit(1);
  }
}

main();