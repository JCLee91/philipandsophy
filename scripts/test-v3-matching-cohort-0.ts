
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { subDays, format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

// Import matching logic from functions
// @ts-ignore
import { matchParticipantsWithClusters, DailySubmission } from '../functions/src/lib/cluster-matching';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const app = initializeApp({
    credential: applicationDefault(),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
});

const db = getFirestore(app, 'seoul');

async function testMatchingCohort0() {
    console.log('🧪 Testing v3 Cluster Matching on Cohort 0...');

    // 1. Get "Yesterday" date
    const now = new Date();
    const kstNow = toZonedTime(now, 'Asia/Seoul');
    const yesterday = subDays(kstNow, 1);
    const yesterdayStr = format(yesterday, 'yyyy-MM-dd');

    console.log(`📅 Target Date: ${yesterdayStr}`);

    // 2. Fetch Submissions for Cohort 0
    const submissionsSnapshot = await db
        .collection('reading_submissions')
        .where('cohortId', '==', '0')
        .where('submissionDate', '==', yesterdayStr)
        .where('status', '==', 'approved')
        .get();

    if (submissionsSnapshot.empty) {
        console.log('❌ No submissions found for Cohort 0. Run setup script first.');
        return;
    }

    console.log(`📚 Found ${submissionsSnapshot.size} submissions.`);

    // 3. Fetch Participant Details
    const participantIds = submissionsSnapshot.docs.map(doc => doc.data().participantId);
    const participantsSnapshot = await db
        .collection('participants')
        .where('__name__', 'in', participantIds)
        .get();

    const participantsMap = new Map();
    participantsSnapshot.docs.forEach(doc => {
        participantsMap.set(doc.id, doc.data());
    });

    // 4. Prepare Data for Matching
    const dailySubmissions: DailySubmission[] = submissionsSnapshot.docs.map(doc => {
        const data = doc.data();
        const p = participantsMap.get(data.participantId);
        return {
            participantId: data.participantId,
            participantName: p?.name || 'Unknown',
            gender: p?.gender,
            bookTitle: data.bookTitle || '',
            bookAuthor: data.bookAuthor,
            review: data.review || '',
            dailyQuestion: data.dailyQuestion || '',
            dailyAnswer: data.dailyAnswer || '',
        };
    });

    // 5. Run Matching
    console.log('🧠 Running AI Clustering...');
    try {
        const result = await matchParticipantsWithClusters(dailySubmissions, yesterdayStr);

        console.log('\n✨ Matching Completed Successfully!');
        console.log(`   Clusters: ${Object.keys(result.clusters).length}`);
        console.log(`   Assignments: ${Object.keys(result.assignments).length}`);

        console.log('\n🔍 Cluster Details:');
        Object.values(result.clusters).forEach((c: any) => {
            console.log(`\n[${c.emoji} ${c.name}]`);
            console.log(`   Theme: ${c.theme}`);
            console.log(`   Reasoning: ${c.reasoning}`);
            console.log(`   Members: ${c.memberIds.join(', ')}`);
        });

        console.log('\n🔍 Assignment Sample (First 3):');
        Object.entries(result.assignments).slice(0, 3).forEach(([id, assign]: [string, any]) => {
            console.log(`   ${id} -> Assigned to ${assign.assigned.length} people (Cluster: ${assign.clusterId})`);
        });

        // 6. Save to Real Firestore (Cohort 0 ONLY)
        console.log('\n💾 Saving result to Cohort 0 in Firestore...');

        const cohortRef = db.collection('cohorts').doc('0');

        // Create the entry format expected by the app
        const matchingEntry = {
            clusters: result.clusters,
            assignments: result.assignments,
            matchingVersion: 'cluster',
            timestamp: new Date(),
            formula: 'v3-cluster-test'
        };

        await db.runTransaction(async (transaction) => {
            const doc = await transaction.get(cohortRef);
            if (!doc.exists) throw new Error('Cohort 0 does not exist');

            const data = doc.data();
            const dailyFeaturedParticipants = data?.dailyFeaturedParticipants || {};

            // Update for the target date
            dailyFeaturedParticipants[yesterdayStr] = matchingEntry;

            transaction.update(cohortRef, {
                dailyFeaturedParticipants,
                updatedAt: new Date()
            });
        });

        console.log('✅ Successfully updated Cohort 0 dailyFeaturedParticipants.');
        console.log('   You can now view this in the UI if you are in Cohort 0.');

    } catch (error) {
        console.error('❌ Matching Failed:', error);
    }
}

testMatchingCohort0().catch(console.error);
