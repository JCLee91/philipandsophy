/**
 * Production Database Cleanup Script
 *
 * Purpose: Clean all data except admin and real user accounts for production launch
 *
 * What it preserves:
 * - Cohorts collection (all cohorts)
 * - Admin participants: admin, admin2, admin3
 * - Real user participants: user-junyoung, user-hyunji
 *
 * What it deletes:
 * - All notices
 * - All reading submissions
 * - All direct messages
 * - All dummy participants (except admin and real users)
 *
 * Usage:
 *   tsx src/scripts/production-cleanup.ts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Initialize Firebase Admin
if (!getApps().length) {
  const serviceAccount = require('../../firebase-service-account.json');

  initializeApp({
    credential: cert(serviceAccount),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
}

const db = getFirestore();

// Participants to preserve (only admins)
const PRESERVED_PARTICIPANTS = [
  'admin',       // 운영자 (01000000001)
  'admin2',      // 문준영 관리자 (42633467921)
  'admin3',      // 김현지 관리자 (42627615193)
];

async function deleteCollection(collectionName: string, preserveIds: string[] = []) {
  console.log(`\n🗑️  Cleaning collection: ${collectionName}`);

  const collectionRef = db.collection(collectionName);
  const snapshot = await collectionRef.get();

  if (snapshot.empty) {
    console.log(`   ℹ️  Collection is already empty`);
    return;
  }

  let deleted = 0;
  let preserved = 0;
  const batch = db.batch();
  let batchCount = 0;

  for (const doc of snapshot.docs) {
    if (preserveIds.includes(doc.id)) {
      preserved++;
      console.log(`   ✅ Preserving: ${doc.id}`);
      continue;
    }

    batch.delete(doc.ref);
    batchCount++;
    deleted++;

    // Firestore batch limit is 500 operations
    if (batchCount === 500) {
      await batch.commit();
      console.log(`   🔄 Committed batch of 500 deletions`);
      batchCount = 0;
    }
  }

  // Commit remaining operations
  if (batchCount > 0) {
    await batch.commit();
  }

  console.log(`   ✅ Deleted: ${deleted} documents`);
  if (preserved > 0) {
    console.log(`   ✅ Preserved: ${preserved} documents`);
  }
}

async function cleanupSubcollections(collectionName: string, preserveParentIds: string[]) {
  console.log(`\n🗑️  Cleaning subcollections in: ${collectionName}`);

  const collectionRef = db.collection(collectionName);
  const snapshot = await collectionRef.get();

  for (const doc of snapshot.docs) {
    if (preserveParentIds.includes(doc.id)) {
      // For preserved participants, clean their submissions and messages
      const submissions = await doc.ref.collection('submissions').get();
      const messages = await doc.ref.collection('messages').get();

      let deletedSubs = 0;
      let deletedMsgs = 0;

      if (!submissions.empty) {
        const batch = db.batch();
        submissions.docs.forEach(subDoc => {
          batch.delete(subDoc.ref);
          deletedSubs++;
        });
        await batch.commit();
      }

      if (!messages.empty) {
        const batch = db.batch();
        messages.docs.forEach(msgDoc => {
          batch.delete(msgDoc.ref);
          deletedMsgs++;
        });
        await batch.commit();
      }

      if (deletedSubs > 0 || deletedMsgs > 0) {
        console.log(`   🧹 Cleaned ${doc.id}: ${deletedSubs} submissions, ${deletedMsgs} messages`);
      }
    }
  }
}

async function displayCurrentState() {
  console.log('\n📊 Current Database State:');
  console.log('═══════════════════════════════════════════════════════\n');

  const collections = ['cohorts', 'participants', 'notices', 'reading_submissions', 'messages'];

  for (const collectionName of collections) {
    const snapshot = await db.collection(collectionName).get();
    console.log(`   ${collectionName}: ${snapshot.size} documents`);

    if (collectionName === 'participants' && snapshot.size > 0) {
      console.log('   Participant IDs:');
      snapshot.docs.forEach(doc => {
        const preserved = PRESERVED_PARTICIPANTS.includes(doc.id) ? '✅' : '❌';
        console.log(`     ${preserved} ${doc.id}`);
      });
    }
  }

  console.log('\n═══════════════════════════════════════════════════════');
}

async function runCleanup() {
  console.log('🚀 Production Database Cleanup Script');
  console.log('═══════════════════════════════════════════════════════');
  console.log('⚠️  WARNING: This will permanently delete data!');
  console.log('');
  console.log('✅ Preserved accounts:');
  PRESERVED_PARTICIPANTS.forEach(id => console.log(`   - ${id}`));
  console.log('');
  console.log('❌ Will delete:');
  console.log('   - All notices');
  console.log('   - All reading submissions');
  console.log('   - All direct messages');
  console.log('   - All dummy participants');
  console.log('   - Subcollections (submissions/messages) for preserved accounts');
  console.log('═══════════════════════════════════════════════════════\n');

  // Display current state
  await displayCurrentState();

  // Wait for user confirmation
  console.log('\n⏳ Starting cleanup in 5 seconds... (Press Ctrl+C to cancel)');
  await new Promise(resolve => setTimeout(resolve, 5000));

  try {
    // Step 1: Delete all notices
    await deleteCollection('notices');

    // Step 2: Delete all reading submissions
    await deleteCollection('reading_submissions');

    // Step 3: Delete all messages
    await deleteCollection('messages');

    // Step 4: Clean subcollections for preserved participants
    await cleanupSubcollections('participants', PRESERVED_PARTICIPANTS);

    // Step 5: Delete dummy participants (preserve admins and real users)
    await deleteCollection('participants', PRESERVED_PARTICIPANTS);

    console.log('\n\n✅ Cleanup completed successfully!');
    console.log('═══════════════════════════════════════════════════════');

    // Display final state
    await displayCurrentState();

    console.log('\n🎉 Database is ready for production!');
    console.log('\nPreserved accounts can now:');
    console.log('  - Start fresh with no old data');
    console.log('  - Login with their existing credentials');
    console.log('  - Begin using the production system\n');

  } catch (error) {
    console.error('\n❌ Error during cleanup:', error);
    throw error;
  }
}

// Run the cleanup
runCleanup()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
