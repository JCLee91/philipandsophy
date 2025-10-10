/**
 * 특정 참가자 정보 확인
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkParticipant(phoneNumber: string) {
  console.log('🔍 Checking participant with phone:', phoneNumber);
  console.log('━'.repeat(80));

  try {
    const participantsRef = collection(db, 'participants');
    const q = query(participantsRef, where('phoneNumber', '==', phoneNumber));

    const snapshot = await getDocs(q);

    console.log(`\n📊 Participants found: ${snapshot.size}\n`);

    if (snapshot.empty) {
      console.log('❌ No participant found with this phone number');
      return;
    }

    snapshot.forEach((doc) => {
      const data = doc.data();
      console.log('Participant Info:');
      console.log(`  Document ID: ${doc.id}`);
      console.log(`  ID field: ${data.id || 'N/A'}`);
      console.log(`  Name: ${data.name}`);
      console.log(`  Phone: ${data.phoneNumber}`);
      console.log(`  Cohort: ${data.cohortId}`);
      console.log(`  Is Admin: ${data.isAdmin || false}`);
      console.log('');
    });

    console.log('━'.repeat(80));
    console.log('\n✅ Check complete\n');

  } catch (error) {
    console.error('❌ Error checking participant:', error);
  }
}

const phoneNumber = process.argv[2];

if (!phoneNumber) {
  console.error('Usage: npm run check:participant <phoneNumber>');
  console.error('Example: npm run check:participant 42633467921');
  process.exit(1);
}

checkParticipant(phoneNumber).then(() => process.exit(0));
