/**
 * Migration: Add programStartDate to existing cohorts
 *
 * This script adds the programStartDate field to all existing cohorts
 * that don't have it, using startDate as the default value.
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { readFileSync } from 'fs';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Initialize Firebase Admin
if (getApps().length === 0) {
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json';

  try {
    const serviceAccount = JSON.parse(
      readFileSync(path.resolve(process.cwd(), serviceAccountPath), 'utf-8')
    );

    initializeApp({
      credential: cert(serviceAccount),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });

    console.log('✅ Firebase Admin initialized');
  } catch (error) {
    console.error('❌ Firebase Admin initialization failed:', error);
    process.exit(1);
  }
}

const db = getFirestore();

async function migrateCohorts() {
  try {
    console.log('🔄 Starting migration: Add programStartDate to cohorts...\n');

    // Get all cohorts
    const cohortsSnapshot = await db.collection('cohorts').get();

    if (cohortsSnapshot.empty) {
      console.log('⚠️ No cohorts found');
      return;
    }

    console.log(`📊 Found ${cohortsSnapshot.size} cohort(s)\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    // Process each cohort
    for (const cohortDoc of cohortsSnapshot.docs) {
      const cohortId = cohortDoc.id;
      const cohortData = cohortDoc.data();

      console.log(`\n🔍 Checking cohort: ${cohortId} (${cohortData.name})`);

      // Check if programStartDate already exists
      if (cohortData.programStartDate) {
        console.log(`  ✅ programStartDate already set: ${cohortData.programStartDate}`);
        skippedCount++;
        continue;
      }

      // Add programStartDate = startDate
      const programStartDate = cohortData.startDate;

      if (!programStartDate) {
        console.log(`  ⚠️ WARNING: No startDate found, skipping`);
        skippedCount++;
        continue;
      }

      // Update document
      await cohortDoc.ref.update({
        programStartDate,
        updatedAt: FieldValue.serverTimestamp(),
      });

      console.log(`  ✅ Added programStartDate: ${programStartDate}`);
      updatedCount++;
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ Migration completed!');
    console.log(`📊 Summary:`);
    console.log(`   - Updated: ${updatedCount} cohort(s)`);
    console.log(`   - Skipped: ${skippedCount} cohort(s)`);
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration
migrateCohorts()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
