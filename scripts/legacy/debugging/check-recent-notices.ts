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

async function checkRecent() {
  const noticesSnapshot = await db.collection('notices')
    .orderBy('createdAt', 'desc')
    .limit(5)
    .get();

  console.log('\n📢 최근 공지사항 5개:\n');
  noticesSnapshot.docs.forEach((doc, index) => {
    const data = doc.data();
    const createdAt = data.createdAt.toDate();
    console.log(`${index + 1}. ${doc.id}`);
    console.log(`   시간: ${createdAt.toLocaleString('ko-KR')}`);
    console.log(`   내용: ${data.content.substring(0, 60)}...`);
    console.log('');
  });
}

checkRecent().then(() => process.exit(0));
