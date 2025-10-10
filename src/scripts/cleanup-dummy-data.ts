/**
 * Firebase Dummy Data Cleanup Script
 * Removes all dummy participants and notices from Firebase
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

// 삭제할 더미 참가자 ID 목록
const dummyParticipantIds = [
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
  '11', '12', '13', '14', '15', '16', '17', '18', '19', '20'
];

// 유지할 관리자 ID 목록
const adminIds = ['admin', 'admin2', 'admin3'];

async function deleteParticipants() {
  console.log('🗑️  Deleting dummy participants...\n');

  let deletedCount = 0;

  for (const id of dummyParticipantIds) {
    try {
      const docRef = db.collection('participants').doc(id);
      const doc = await docRef.get();

      if (doc.exists) {
        await docRef.delete();
        console.log(`✅ Deleted participant: ${id} (${doc.data()?.name || 'Unknown'})`);
        deletedCount++;
      } else {
        console.log(`⚠️  Participant not found: ${id}`);
      }
    } catch (error) {
      console.error(`❌ Error deleting participant ${id}:`, error);
    }
  }

  console.log(`\n✨ Deleted ${deletedCount} dummy participants\n`);
}

async function deleteAllNotices() {
  console.log('🗑️  Deleting all notices...\n');

  try {
    const noticesSnapshot = await db.collection('notices').get();

    if (noticesSnapshot.empty) {
      console.log('ℹ️  No notices found to delete\n');
      return;
    }

    const batch = db.batch();
    let deleteCount = 0;

    noticesSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
      deleteCount++;
      console.log(`✅ Will delete notice: ${doc.id}`);
    });

    await batch.commit();
    console.log(`\n✨ Deleted ${deleteCount} notices\n`);
  } catch (error) {
    console.error('❌ Error deleting notices:', error);
  }
}

async function verifyRemainingData() {
  console.log('🔍 Verifying remaining data...\n');

  // 참가자 확인
  const participantsSnapshot = await db.collection('participants').get();
  console.log(`📊 Remaining participants: ${participantsSnapshot.size}`);

  participantsSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    console.log(`   - ${doc.id}: ${data.name} (${data.isAdmin ? '관리자' : '일반'})`);
  });

  // 공지사항 확인
  const noticesSnapshot = await db.collection('notices').get();
  console.log(`\n📊 Remaining notices: ${noticesSnapshot.size}\n`);
}

async function main() {
  try {
    console.log('🚀 Starting dummy data cleanup...\n');

    await deleteParticipants();
    await deleteAllNotices();
    await verifyRemainingData();

    console.log('🎉 Cleanup completed successfully!');
    console.log('💡 Run "npm run seed:admin" to re-seed admin data if needed.\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

main();
