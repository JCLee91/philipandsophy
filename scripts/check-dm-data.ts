import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const app = initializeApp({
  credential: applicationDefault(),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
});

const db = getFirestore(app, 'seoul');

async function checkDmData() {
  const messages = await db.collection('messages').get();

  console.log(`총 메시지: ${messages.size}건\n`);

  messages.docs.forEach(doc => {
    const data = doc.data();
    const createdAt = data.createdAt;

    console.log(`\nMessage ID: ${doc.id}`);
    console.log(`  senderId: ${data.senderId}`);
    console.log(`  receiverId: ${data.receiverId}`);
    console.log(`  createdAt type: ${typeof createdAt}`);
    console.log(`  createdAt value:`, createdAt);
    console.log(`  has toDate(): ${typeof createdAt?.toDate === 'function'}`);

    if (createdAt && typeof createdAt.toDate !== 'function') {
      console.log(`  ⚠️ PROBLEM: createdAt is not a Timestamp!`);
    }
  });

  process.exit(0);
}

checkDmData();
