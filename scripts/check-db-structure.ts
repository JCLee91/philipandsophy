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

async function checkDBStructure() {
  // Check Notice structure
  console.log('\n📢 공지사항 (notices) 구조:\n');
  const noticeSnapshot = await db.collection('notices')
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get();

  if (!noticeSnapshot.empty) {
    const noticeDoc = noticeSnapshot.docs[0];
    console.log('Document ID:', noticeDoc.id);
    console.log('Fields:', JSON.stringify(noticeDoc.data(), null, 2));
  }

  // Check Message structure
  console.log('\n\n💬 메시지 (messages) 구조:\n');
  const messageSnapshot = await db.collection('messages')
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get();

  if (!messageSnapshot.empty) {
    const messageDoc = messageSnapshot.docs[0];
    console.log('Document ID:', messageDoc.id);
    console.log('Fields:', JSON.stringify(messageDoc.data(), null, 2));
  } else {
    console.log('No messages found in DB');
  }

  console.log('\n');
}

checkDBStructure().then(() => process.exit(0));
