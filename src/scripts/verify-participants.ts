import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

if (!getApps().length) {
  const serviceAccount = require('../../firebase-service-account.json');
  initializeApp({
    credential: cert(serviceAccount),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
}

const db = getFirestore();

async function verifyParticipants() {
  const snapshot = await db.collection('participants').get();

  console.log('\n📊 Participants in Database:\n');
  console.log('═══════════════════════════════════════════════════════\n');

  snapshot.docs.forEach((doc, i) => {
    const data = doc.data();
    console.log(`${i + 1}. ${doc.id}`);
    console.log(`   Name: ${data.name}`);
    console.log(`   Phone: ${data.phoneNumber}`);
    console.log(`   Gender: ${data.gender || 'N/A'}`);
    console.log(`   Occupation: ${data.occupation || 'N/A'}`);
    console.log(`   Admin: ${data.isAdmin ? 'Yes' : 'No'}`);
    console.log('');
  });

  console.log('═══════════════════════════════════════════════════════');
  console.log(`Total: ${snapshot.size} participants\n`);
}

verifyParticipants()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
