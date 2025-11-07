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

async function checkConversationIds() {
  console.log('\n💬 messages 컬렉션의 conversationId 패턴 분석:\n');

  const messagesSnapshot = await db.collection('messages')
    .orderBy('createdAt', 'desc')
    .limit(10)
    .get();

  const conversationIdSet = new Set<string>();

  messagesSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    conversationIdSet.add(data.conversationId);
    console.log(`Message ID: ${doc.id}`);
    console.log(`  conversationId: ${data.conversationId}`);
    console.log(`  senderId: ${data.senderId}`);
    console.log(`  receiverId: ${data.receiverId}`);
    console.log('');
  });

  console.log('\n고유 conversationId 목록:');
  Array.from(conversationIdSet).forEach(id => {
    console.log(`  - ${id}`);
  });

  console.log('\n');
}

checkConversationIds().then(() => process.exit(0));
