#!/usr/bin/env node
import * as admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { join } from 'path';

const serviceAccount = JSON.parse(
  readFileSync(join(process.cwd(), 'firebase-service-account.json'), 'utf-8')
);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore().database('seoul');

async function checkYoonji() {
  console.log('\n👤 이윤지-4321 participant 확인:\n');

  const participantDoc = await db.collection('participants').doc('이윤지-4321').get();

  if (participantDoc.exists) {
    console.log('✅ participant 존재함');
    console.log('ID:', participantDoc.id);
    const data = participantDoc.data();
    console.log('Name:', data?.name);
    console.log('isAdministrator:', data?.isAdministrator);
    console.log('isSuperAdmin:', data?.isSuperAdmin);
  } else {
    console.log('❌ participant 문서 없음');
  }

  console.log('\n💬 이윤지-4321의 메시지 (conversationId 확인):\n');

  // 발신자로서
  const sentSnapshot = await db.collection('messages')
    .where('senderId', '==', '이윤지-4321')
    .get();

  console.log(`발신 메시지: ${sentSnapshot.size}개`);
  sentSnapshot.docs.forEach(doc => {
    const data = doc.data();
    console.log(`  conversationId: ${data.conversationId}`);
    console.log(`  receiverId: ${data.receiverId}`);
  });

  // 수신자로서
  const receivedSnapshot = await db.collection('messages')
    .where('receiverId', '==', '이윤지-4321')
    .get();

  console.log(`\n수신 메시지: ${receivedSnapshot.size}개`);
  receivedSnapshot.docs.forEach(doc => {
    const data = doc.data();
    console.log(`  conversationId: ${data.conversationId}`);
    console.log(`  senderId: ${data.senderId}`);
  });

  console.log('\n');
}

checkYoonji().then(() => process.exit(0));
