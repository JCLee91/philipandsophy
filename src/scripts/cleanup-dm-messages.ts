/**
 * Firebase DM Messages Cleanup Script
 * Removes all DM messages from Firebase
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

async function deleteAllMessages() {
  console.log('🗑️  Deleting all DM messages...\n');

  try {
    const messagesSnapshot = await db.collection('messages').get();

    if (messagesSnapshot.empty) {
      console.log('ℹ️  No messages found to delete\n');
      return;
    }

    console.log(`📬 Found ${messagesSnapshot.size} messages to delete\n`);

    const batch = db.batch();
    let deleteCount = 0;

    messagesSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      batch.delete(doc.ref);
      deleteCount++;
      console.log(`✅ Will delete message: ${doc.id} (${data.conversationId})`);
    });

    await batch.commit();
    console.log(`\n✨ Deleted ${deleteCount} messages\n`);
  } catch (error) {
    console.error('❌ Error deleting messages:', error);
  }
}

async function verifyMessagesCleared() {
  console.log('🔍 Verifying messages cleared...\n');

  const messagesSnapshot = await db.collection('messages').get();
  console.log(`📊 Remaining messages: ${messagesSnapshot.size}\n`);

  if (messagesSnapshot.size === 0) {
    console.log('✅ All messages successfully cleared!\n');
  } else {
    console.log('⚠️  Some messages still remain:\n');
    messagesSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      console.log(`   - ${doc.id}: ${data.conversationId}`);
    });
  }
}

async function main() {
  try {
    console.log('🚀 Starting DM messages cleanup...\n');

    await deleteAllMessages();
    await verifyMessagesCleared();

    console.log('🎉 Cleanup completed successfully!');
    console.log('💡 모든 DM 메시지가 삭제되었습니다. 이제 다시 테스트할 수 있습니다.\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

main();
