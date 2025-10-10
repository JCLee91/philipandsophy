/**
 * Reset User Reading Submissions Script
 * Deletes all reading submissions for a specific user
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

// 초기화할 사용자 ID
const USER_ID = 'user-hyunji';

async function deleteUserSubmissions() {
  console.log('🗑️  Deleting reading submissions for user-hyunji...\n');

  try {
    // participantId로 모든 독서 인증 찾기
    const submissionsSnapshot = await db
      .collection('reading_submissions')
      .where('participantId', '==', USER_ID)
      .get();

    if (submissionsSnapshot.empty) {
      console.log('ℹ️  No submissions found for this user\n');
      return;
    }

    console.log(`📊 Found ${submissionsSnapshot.size} submission(s) to delete\n`);

    const batch = db.batch();
    let deleteCount = 0;

    submissionsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      batch.delete(doc.ref);
      deleteCount++;
      console.log(`✅ Will delete: ${doc.id} - ${data.bookTitle || 'Unknown Book'}`);
    });

    await batch.commit();
    console.log(`\n✨ Deleted ${deleteCount} submission(s)\n`);
  } catch (error) {
    console.error('❌ Error deleting submissions:', error);
    throw error;
  }
}

async function verifyDeletion() {
  console.log('🔍 Verifying deletion...\n');

  const remainingSnapshot = await db
    .collection('reading_submissions')
    .where('participantId', '==', USER_ID)
    .get();

  console.log(`📊 Remaining submissions for user-hyunji: ${remainingSnapshot.size}\n`);

  if (remainingSnapshot.size === 0) {
    console.log('✅ All submissions successfully deleted!\n');
  } else {
    console.log('⚠️  Some submissions still remain:\n');
    remainingSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      console.log(`   - ${doc.id}: ${data.bookTitle}`);
    });
  }
}

async function main() {
  try {
    console.log('🚀 Starting user submissions reset...\n');
    console.log(`👤 Target User: ${USER_ID}\n`);

    await deleteUserSubmissions();
    await verifyDeletion();

    console.log('🎉 Reset completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during reset:', error);
    process.exit(1);
  }
}

main();
