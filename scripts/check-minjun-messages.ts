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

const db = admin.firestore();

async function checkMinjunMessages() {
  console.log('\n💬 김민준-5678 관련 메시지 상세 확인:\n');

  // 1. 클라이언트가 조회할 conversationId
  const expectedConversationId = '김민준-5678-admin';
  console.log(`✅ 클라이언트가 조회하는 conversationId: "${expectedConversationId}"\n`);

  // 2. 해당 conversationId로 메시지 조회
  const expectedSnapshot = await db.collection('messages')
    .where('conversationId', '==', expectedConversationId)
    .get();

  console.log(`📊 "${expectedConversationId}" 메시지: ${expectedSnapshot.size}개`);
  expectedSnapshot.docs.forEach((doc, i) => {
    const data = doc.data();
    console.log(`  ${i + 1}. senderId: ${data.senderId}, receiverId: ${data.receiverId}`);
    console.log(`     내용: ${data.content.substring(0, 40)}...`);
  });

  // 3. 잘못된 conversationId 확인
  const wrongConversationId = 'admin-김민준-5678';
  console.log(`\n❌ 잘못된 conversationId: "${wrongConversationId}"\n`);

  const wrongSnapshot = await db.collection('messages')
    .where('conversationId', '==', wrongConversationId)
    .get();

  console.log(`📊 "${wrongConversationId}" 메시지: ${wrongSnapshot.size}개`);
  wrongSnapshot.docs.forEach((doc, i) => {
    const data = doc.data();
    console.log(`  ${i + 1}. [ID: ${doc.id}] senderId: ${data.senderId}, receiverId: ${data.receiverId}`);
    console.log(`     내용: ${data.content.substring(0, 40)}...`);
  });

  console.log('\n🔍 결론:');
  console.log(`  - 클라이언트는 "${expectedConversationId}"만 조회`);
  console.log(`  - "${wrongConversationId}" 메시지는 안 보임`);
  console.log(`  - DB 수정 필요: ${wrongSnapshot.size}개 메시지의 conversationId 변경\n`);
}

checkMinjunMessages().then(() => process.exit(0));
