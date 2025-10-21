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

async function checkAdmin() {
  console.log('\n👤 admin participant 문서:\n');
  const adminDoc = await db.collection('participants').doc('admin').get();

  if (adminDoc.exists) {
    console.log('Document ID:', adminDoc.id);
    console.log('Fields:', JSON.stringify(adminDoc.data(), null, 2));
  } else {
    console.log('admin document not found');
  }

  console.log('\n');
}

checkAdmin().then(() => process.exit(0));
