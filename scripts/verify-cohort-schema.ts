
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const serviceAccountPath = path.resolve(process.cwd(), 'firebase-service-account.json');

// Initialize Firebase Admin
let app;
try {
    app = initializeApp({
        credential: cert(serviceAccountPath),
        projectId: 'philipandsophy'
    });
} catch (e) {
    // If already initialized, use existing app
    app = require('firebase-admin/app').getApp();
}

const db = getFirestore(app);

async function verifySchemaCompatibility() {
    console.log('🧪 Verifying schema compatibility for hyphenated cohort IDs...');

    const testCohortId = 'test-4-1';
    const testParticipantId = `cohort${testCohortId}-testuser`;

    try {
        // 1. Create a test cohort with hyphenated ID
        console.log(`\n1. Creating test cohort with ID: ${testCohortId}`);
        await db.collection('cohorts').doc(testCohortId).set({
            name: 'Test Cohort 4-1',
            startDate: '2025-01-01',
            endDate: '2025-01-31',
            programStartDate: '2025-01-01',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        console.log('✅ Cohort created successfully');

        // 2. Create a participant linked to this cohort
        console.log(`\n2. Creating participant linked to cohort: ${testCohortId}`);
        await db.collection('participants').doc(testParticipantId).set({
            cohortId: testCohortId,
            name: 'Test User',
            phoneNumber: '010-0000-0000',
            createdAt: new Date(),
            updatedAt: new Date()
        });
        console.log('✅ Participant created successfully');

        // 3. Query participant by cohortId
        console.log(`\n3. Querying participant by cohortId: ${testCohortId}`);
        const participantsSnapshot = await db.collection('participants')
            .where('cohortId', '==', testCohortId)
            .get();

        if (participantsSnapshot.empty) {
            throw new Error('❌ Failed to find participant by cohortId');
        }
        console.log(`✅ Found ${participantsSnapshot.size} participant(s)`);

        const participantData = participantsSnapshot.docs[0].data();
        if (participantData.cohortId !== testCohortId) {
            throw new Error(`❌ Mismatch in cohortId: expected ${testCohortId}, got ${participantData.cohortId}`);
        }
        console.log('✅ Data integrity verified');

        // 4. Clean up
        console.log('\n4. Cleaning up test data...');
        await db.collection('cohorts').doc(testCohortId).delete();
        await db.collection('participants').doc(testParticipantId).delete();
        console.log('✅ Cleanup complete');

        console.log('\n✨ VERIFICATION SUCCESSFUL: Schema is compatible with hyphenated cohort IDs.');

    } catch (error) {
        console.error('\n❌ VERIFICATION FAILED:', error);

        // Attempt cleanup even on failure
        try {
            await db.collection('cohorts').doc(testCohortId).delete();
            await db.collection('participants').doc(testParticipantId).delete();
        } catch (cleanupError) {
            console.error('Cleanup failed:', cleanupError);
        }

        process.exit(1);
    }
}

verifySchemaCompatibility();
