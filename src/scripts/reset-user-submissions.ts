/**
 * Reset reading submissions for a specific user
 * Usage: npx tsx src/scripts/reset-user-submissions.ts <participantId>
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

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

async function resetUserSubmissions(participantId: string) {
  console.log(`🗑️  Resetting submissions for participant: ${participantId}`);

  try {
    // Get all submissions for this participant
    const submissionsRef = collection(db, 'reading_submissions');
    const q = query(submissionsRef, where('participantId', '==', participantId));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.log('✅ No submissions found for this participant');
      return;
    }

    console.log(`📊 Found ${snapshot.size} submission(s) to delete`);

    // Delete all submissions
    let deleteCount = 0;
    for (const doc of snapshot.docs) {
      const data = doc.data();
      console.log(`  - Deleting: ${data.bookTitle} (${data.submissionDate})`);
      await deleteDoc(doc.ref);
      deleteCount++;
    }

    console.log(`✅ Successfully deleted ${deleteCount} submission(s)`);
  } catch (error) {
    console.error('❌ Error resetting submissions:', error);
    throw error;
  }
}

// Get participantId from command line args
const participantId = process.argv[2];

if (!participantId) {
  console.error('❌ Error: Please provide participantId');
  console.log('Usage: npx tsx src/scripts/reset-user-submissions.ts <participantId>');
  console.log('Example: npx tsx src/scripts/reset-user-submissions.ts user-hyunji');
  process.exit(1);
}

resetUserSubmissions(participantId)
  .then(() => {
    console.log('🎉 Reset completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Reset failed:', error);
    process.exit(1);
  });
