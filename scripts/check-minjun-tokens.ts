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

async function checkTokens() {
  const doc = await db.collection('participants').doc('김민준-5678').get();
  const data = doc.data()!;

  console.log('\n📋 김민준-5678 푸시 토큰 상세 정보:\n');

  console.log('FCM Tokens:', data.pushTokens?.length || 0);
  if (data.pushTokens) {
    data.pushTokens.forEach((token: any, i: number) => {
      console.log(`\n  Token ${i + 1}:`);
      console.log(`    deviceId: ${token.deviceId}`);
      console.log(`    type: ${token.type}`);
      console.log(`    userAgent: ${token.userAgent || 'N/A'}`);
      console.log(`    token: ${token.token.substring(0, 30)}...`);
    });
  }

  console.log('\n\nWeb Push Subscriptions:', data.webPushSubscriptions?.length || 0);
  if (data.webPushSubscriptions) {
    data.webPushSubscriptions.forEach((sub: any, i: number) => {
      console.log(`\n  Sub ${i + 1}:`);
      console.log(`    deviceId: ${sub.deviceId}`);
      console.log(`    userAgent: ${sub.userAgent || 'N/A'}`);
      console.log(`    endpoint: ${sub.endpoint.substring(0, 50)}...`);
    });
  }

  console.log('\n');
}

checkTokens().then(() => process.exit(0));
