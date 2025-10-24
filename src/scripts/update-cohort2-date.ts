/**
 * Update Cohort 2 (2기) dates
 *
 * 2기 시작일을 2025-10-25로 변경
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Initialize Firebase Admin
if (getApps().length === 0) {
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json';

  try {
    const serviceAccount = require(path.resolve(process.cwd(), serviceAccountPath));

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

async function updateCohort2() {
  try {
    console.log('🔄 Updating Cohort 2 dates...\n');

    const cohortRef = db.collection('cohorts').doc('2');
    const cohortDoc = await cohortRef.get();

    if (!cohortDoc.exists) {
      console.error('❌ Cohort 2 not found');
      process.exit(1);
    }

    const currentData = cohortDoc.data();
    console.log('현재 데이터:');
    console.log(`  - startDate: ${currentData?.startDate}`);
    console.log(`  - endDate: ${currentData?.endDate}`);
    console.log(`  - programStartDate: ${currentData?.programStartDate}`);

    // Update dates
    await cohortRef.update({
      startDate: '2025-10-25',
      endDate: '2025-11-07', // 14일 프로그램
      programStartDate: '2025-10-25',
      updatedAt: FieldValue.serverTimestamp(),
    });

    console.log('\n✅ 업데이트 완료:');
    console.log('  - startDate: 2025-10-25');
    console.log('  - endDate: 2025-11-07');
    console.log('  - programStartDate: 2025-10-25');

  } catch (error) {
    console.error('❌ Update failed:', error);
    throw error;
  }
}

// Run update
updateCohort2()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
