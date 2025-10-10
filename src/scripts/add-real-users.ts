/**
 * Firebase Real Users Addition Script
 * Adds 2 real users with same participation codes as admins but without admin privileges
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// Service Account 키 경로
const serviceAccountPath = path.join(process.cwd(), 'firebase-service-account.json');

// 키 파일 확인
if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Service Account 키 파일을 찾을 수 없습니다.');
  console.error('📝 ADMIN_SDK_SETUP.md 파일을 참고하여 키를 다운로드하세요.');
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

// 추가할 실유저 데이터
const realUsersData = [
  {
    id: 'user-junyoung',
    cohortId: '1',
    name: '문준영',
    phoneNumber: '42633467921', // admin2와 동일한 코드
    isAdmin: false, // 일반 유저
  },
  {
    id: 'user-hyunji',
    cohortId: '1',
    name: '김현지',
    phoneNumber: '42627615193', // admin3와 동일한 코드
    isAdmin: false, // 일반 유저
  },
];

async function addRealUsers() {
  console.log('🌱 Adding real users...\n');

  for (const user of realUsersData) {
    const { id, ...userData } = user;

    try {
      await db.collection('participants').doc(id).set({
        ...userData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`✅ User created: ${user.name} (${id}) - Code: ${user.phoneNumber}`);
    } catch (error) {
      console.error(`❌ Error creating user ${id}:`, error);
    }
  }

  console.log(`\n✨ Successfully added ${realUsersData.length} real users\n`);
}

async function verifyUsers() {
  console.log('🔍 Verifying participants with same codes...\n');

  const codes = ['42633467921', '42627615193'];

  for (const code of codes) {
    const snapshot = await db
      .collection('participants')
      .where('phoneNumber', '==', code)
      .get();

    console.log(`📱 Code ${code}:`);
    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      console.log(`   - ${doc.id}: ${data.name} (${data.isAdmin ? '관리자' : '일반 유저'})`);
    });
    console.log('');
  }
}

async function main() {
  try {
    console.log('🚀 Starting real users addition...\n');

    await addRealUsers();
    await verifyUsers();

    console.log('🎉 Real users added successfully!');
    console.log('💡 Now you have both admin and regular users with same codes.\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding users:', error);
    process.exit(1);
  }
}

main();
