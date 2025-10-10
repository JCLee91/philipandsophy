/**
 * DB Migration Script: Real Users
 *
 * 1. Delete all existing data (except admin)
 * 2. Add real users from parsed CSV
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '@/lib/logger';
import { MIGRATION_CONFIG } from '@/constants/migration';

// Load service account from environment variable
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json';
const serviceAccount = require(path.resolve(process.cwd(), serviceAccountPath));

// Initialize Firebase Admin
if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();

// Load parsed user data
const parsedUsersPath = path.join(process.cwd(), 'parsed-users.json');
const parsedUsers = JSON.parse(fs.readFileSync(parsedUsersPath, 'utf-8'));

interface ParsedUser {
  id: string;
  name: string;
  phoneNumber: string;
  occupation: string;
  profileImage: string;
}

/**
 * Step 1: Delete all existing participants (except admin)
 */
async function deleteExistingParticipants() {
  logger.info('🗑️  Step 1: Deleting existing participants (except admin)...\n');

  const snapshot = await db.collection('participants').get();
  const deletePromises: Promise<any>[] = [];

  snapshot.forEach(doc => {
    // Skip admin participant
    if (doc.id === 'admin' || doc.data().isAdmin === true) {
      logger.info(`✅ Skipping admin participant: ${doc.id}`);
      return;
    }

    logger.info(`❌ Deleting: ${doc.id} (${doc.data().name})`);
    deletePromises.push(doc.ref.delete());
  });

  // Process in batches to avoid hitting Firebase limits
  const batchSize = MIGRATION_CONFIG.BATCH_SIZE;
  for (let i = 0; i < deletePromises.length; i += batchSize) {
    const batch = deletePromises.slice(i, i + batchSize);
    await Promise.all(batch);
    logger.info(`   Processed ${Math.min(i + batchSize, deletePromises.length)}/${deletePromises.length} deletions`);
  }

  logger.info(`\n✨ Deleted ${deletePromises.length} participants (admin preserved)\n`);
}

/**
 * Step 2: Delete all reading submissions
 */
async function deleteAllSubmissions() {
  logger.info('🗑️  Step 2: Deleting all reading submissions...\n');

  const snapshot = await db.collection('reading_submissions').get();
  const deletePromises: Promise<any>[] = [];

  snapshot.forEach(doc => {
    logger.info(`❌ Deleting submission: ${doc.id}`);
    deletePromises.push(doc.ref.delete());
  });

  // Process in batches
  const batchSize = MIGRATION_CONFIG.BATCH_SIZE;
  for (let i = 0; i < deletePromises.length; i += batchSize) {
    const batch = deletePromises.slice(i, i + batchSize);
    await Promise.all(batch);
    logger.info(`   Processed ${Math.min(i + batchSize, deletePromises.length)}/${deletePromises.length} deletions`);
  }

  logger.info(`\n✨ Deleted ${deletePromises.length} submissions\n`);
}

/**
 * Step 3: Delete all notices
 */
async function deleteAllNotices() {
  logger.info('🗑️  Step 3: Deleting all notices...\n');

  const snapshot = await db.collection('notices').get();
  const deletePromises: Promise<any>[] = [];

  snapshot.forEach(doc => {
    logger.info(`❌ Deleting notice: ${doc.id}`);
    deletePromises.push(doc.ref.delete());
  });

  // Process in batches
  const batchSize = MIGRATION_CONFIG.BATCH_SIZE;
  for (let i = 0; i < deletePromises.length; i += batchSize) {
    const batch = deletePromises.slice(i, i + batchSize);
    await Promise.all(batch);
    logger.info(`   Processed ${Math.min(i + batchSize, deletePromises.length)}/${deletePromises.length} deletions`);
  }

  logger.info(`\n✨ Deleted ${deletePromises.length} notices\n`);
}

/**
 * Step 4: Delete all messages
 */
async function deleteAllMessages() {
  logger.info('🗑️  Step 4: Deleting all messages...\n');

  const snapshot = await db.collection('messages').get();
  const deletePromises: Promise<any>[] = [];

  snapshot.forEach(doc => {
    logger.info(`❌ Deleting message: ${doc.id}`);
    deletePromises.push(doc.ref.delete());
  });

  // Process in batches
  const batchSize = MIGRATION_CONFIG.BATCH_SIZE;
  for (let i = 0; i < deletePromises.length; i += batchSize) {
    const batch = deletePromises.slice(i, i + batchSize);
    await Promise.all(batch);
    logger.info(`   Processed ${Math.min(i + batchSize, deletePromises.length)}/${deletePromises.length} deletions`);
  }

  logger.info(`\n✨ Deleted ${deletePromises.length} messages\n`);
}

/**
 * Step 5: Update cohort (keep cohort ID '1' but update dates)
 */
async function updateCohort() {
  logger.info('📝 Step 5: Updating cohort...\n');

  const cohortRef = db.collection('cohorts').doc('1');

  await cohortRef.set({
    name: '1기',
    startDate: '2025-10-01',
    endDate: '2025-10-31',
    isActive: true,
    dailyFeaturedParticipants: {},
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  logger.info('✅ Cohort updated: 1기 (2025-10-01 ~ 2025-10-31)\n');
}

/**
 * Step 6: Add real users
 */
async function addRealUsers() {
  logger.info(`🌱 Step 6: Adding ${parsedUsers.length} real users...\n`);

  for (let i = 0; i < parsedUsers.length; i++) {
    const user = parsedUsers[i] as ParsedUser;
    const participantRef = db.collection('participants').doc(user.id);

    const participantData = {
      cohortId: '1', // All users in cohort '1'
      name: user.name,
      phoneNumber: user.phoneNumber,
      occupation: user.occupation || '',
      profileImage: user.profileImage || '',
      isAdmin: false,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    // Remove empty strings
    const cleanData = Object.fromEntries(
      Object.entries(participantData).filter(([_, value]) => value !== '')
    );

    await participantRef.set(cleanData);
    logger.info(`✅ Added: ${user.name} (${user.phoneNumber})`);
  }

  logger.info(`\n✨ Successfully added ${parsedUsers.length} real users\n`);
}

/**
 * Main migration function
 */
async function main() {
  try {
    logger.info('🚀 Starting DB migration...\n');
    logger.warn('⚠️  WARNING: This will delete all existing data (except admin)!\n');

    // Wait for safety delay to allow cancellation
    logger.info(`⏳ Starting in ${MIGRATION_CONFIG.SAFETY_DELAY / 1000} seconds... (Press Ctrl+C to cancel)\n`);
    await new Promise(resolve => setTimeout(resolve, MIGRATION_CONFIG.SAFETY_DELAY));

    // Execute migration steps
    await deleteExistingParticipants();
    await deleteAllSubmissions();
    await deleteAllNotices();
    await deleteAllMessages();
    await updateCohort();
    await addRealUsers();

    logger.info('🎉 Migration completed successfully!');
    logger.info(`\n📊 Summary:`);
    logger.info(`   - Cohort: 1기 (updated)`);
    logger.info(`   - Admin: preserved`);
    logger.info(`   - Real users: ${parsedUsers.length} added`);
    logger.info(`   - All other data: deleted`);

    process.exit(0);
  } catch (error) {
    logger.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

main();
