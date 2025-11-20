import * as admin from 'firebase-admin';
import dotenv from 'dotenv';
import path from 'path';
import { matchParticipantsWithClusters } from '../functions/src/lib/cluster/index';
import { DailySubmission } from '../functions/src/lib/cluster/types';

// Load both root and functions environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), 'functions/.env') });

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
    admin.initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
}

const db = admin.firestore();

async function main() {
    console.log('🚀 Running Real Cluster Matching for Cohort 0...');

    const dateStr = '2025-11-19'; // Target date
    const cohortId = '0';

    try {
        // 1. Fetch all participants from Cohort 0
        console.log('\n📋 Fetching participants from Cohort 0...');
        const participantsSnapshot = await db.collection('participants')
            .where('cohortId', '==', cohortId)
            .get();

        const participants = participantsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        console.log(`✅ Found ${participants.length} participants`);

        // 2. Fetch reading submissions for the target date
        console.log(`\n📚 Fetching reading submissions for ${dateStr}...`);
        const submissionsSnapshot = await db.collection('reading_submissions')
            .where('cohortId', '==', cohortId)
            .where('submissionDate', '==', dateStr)
            .where('status', '==', 'approved')
            .get();

        const submissions: DailySubmission[] = submissionsSnapshot.docs.map(doc => {
            const data = doc.data();
            const participant = participants.find(p => p.id === data.participantId);

            return {
                participantId: data.participantId,
                participantName: participant?.name || 'Unknown',
                gender: participant?.gender || 'other',
                bookTitle: data.bookTitle || '',
                bookAuthor: data.bookAuthor || '',
                review: data.review || '',
                dailyQuestion: data.dailyQuestion || '',
                dailyAnswer: data.dailyAnswer || ''
            };
        });

        console.log(`✅ Found ${submissions.length} submissions`);

        if (submissions.length === 0) {
            console.log('\n⚠️  No submissions found for this date. Cannot run matching.');
            console.log('Try a different date or create some test submissions first.');
            return;
        }

        console.log('\n👥 Participants with submissions:');
        submissions.forEach(s => console.log(`   - ${s.participantName} (${s.participantId})`));

        // 3. Run cluster matching
        console.log(`\n🤖 Running AI cluster matching...`);
        const result = await matchParticipantsWithClusters(submissions, dateStr);

        console.log(`\n✅ Matching Successful!`);
        console.log(`   Clusters Created: ${Object.keys(result.clusters).length}`);

        Object.values(result.clusters).forEach(c => {
            console.log(`\n[${c.emoji} ${c.name}]`);
            console.log(`   Theme: ${c.theme}`);
            console.log(`   Members (${c.memberIds.length}): ${c.memberIds.join(', ')}`);
        });

        // 4. Save to Firestore
        console.log(`\n💾 Saving result to Cohort 0 in Firestore...`);
        await db.collection('cohorts').doc(cohortId).set({
            dailyFeaturedParticipants: {
                [dateStr]: {
                    matchingVersion: 'cluster',
                    clusters: result.clusters,
                    assignments: result.assignments
                }
            }
        }, { merge: true });

        console.log(`✅ Successfully updated Cohort 0 dailyFeaturedParticipants for ${dateStr}.`);
        console.log('\n🎉 Done! You can now check "Today\'s Library" in the app.');

    } catch (error) {
        console.error('💥 Matching Failed:', error);
        process.exit(1);
    }
}

main();
