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

async function checkFirebaseUid() {
  console.log('\n🔍 Participant FirebaseUid 확인:\n');

  const participantIds = ['김민준-5678', '이윤지-4321', 'admin'];

  for (const id of participantIds) {
    const doc = await db.collection('participants').doc(id).get();

    if (doc.exists) {
      const data = doc.data();
      console.log(`${id}:`);
      console.log(`  firebaseUid: ${data?.firebaseUid || '❌ 없음'}`);
      console.log(`  isAdministrator: ${data?.isAdministrator || false}`);
      console.log('');
    } else {
      console.log(`${id}: ❌ 문서 없음\n`);
    }
  }
}

checkFirebaseUid().then(() => process.exit(0));
