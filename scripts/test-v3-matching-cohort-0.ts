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

/**
 * Helper to create dummy submissions
 */
function createDummySubmissions(count: number): DailySubmission[] {
    return Array.from({ length: count }, (_, i) => ({
        participantId: `test-user-${String(i + 1).padStart(2, '0')}`,
        participantName: `테스트유저${i + 1}`,
        gender: i % 2 === 0 ? 'male' : 'female',
        bookTitle: i % 3 === 0 ? '데미안' : i % 3 === 1 ? '코스모스' : '총 균 쇠',
        bookAuthor: '저자',
        review: `오늘의 감상평입니다. 삶의 의미와 존재에 대해 깊이 생각해보게 되었습니다. ${i}번째 참가자의 생각입니다.`,
        dailyQuestion: '당신의 삶에서 가장 중요한 가치는 무엇인가요?',
        dailyAnswer: `저는 주체적인 삶과 자유를 가장 중요하게 생각합니다. 스스로 선택하고 책임지는 삶이 진정한 삶이라고 믿습니다. (${i})`
    }));
}

async function runScenario(name: string, count: number, dateStr: string) {
    console.log(`\n============================================================`);
    console.log(`🧪 Scenario: ${name} (${count} participants)`);
    console.log(`============================================================`);

    const submissions = createDummySubmissions(count);

    try {
        const result = await matchParticipantsWithClusters(submissions, dateStr);

        console.log(`✅ Matching Successful!`);
        console.log(`   Clusters Created: ${Object.keys(result.clusters).length}`);

        Object.values(result.clusters).forEach(c => {
            console.log(`\n[${c.emoji} ${c.name}]`);
            console.log(`   Theme: ${c.theme}`);
            console.log(`   Members (${c.memberIds.length}): ${c.memberIds.join(', ')}`);
        });

        // Validation Checks
        if (count <= 7) {
            if (Object.keys(result.clusters).length !== 1) console.error('❌ FAIL: Should be 1 cluster for small group');
            else console.log('✅ PASS: Correctly created 1 cluster');
        } else if (count === 8 || count === 9) {
            if (Object.keys(result.clusters).length !== 2) console.error('❌ FAIL: Should be 2 clusters for edge case');
            else console.log('✅ PASS: Correctly created 2 clusters');
        } else {
            // Multi-cluster check (approximate)
            console.log(`ℹ️  Multi-cluster count: ${Object.keys(result.clusters).length} (Expected approx ${Math.round(count / 6)})`);
        }

        return result;
    } catch (error) {
        console.error(`❌ Scenario Failed:`, error);
        throw error;
    }
}

async function main() {
    console.log('🚀 Starting Comprehensive V3 Matching Verification...');

    // Date for strategy (Day 0 = Focused/Value)
    const dateStr = '2025-11-19';

    try {
        // 1. Small Group Scenario (3 users) -> Should be 1 cluster
        await runScenario('Small Group', 3, dateStr);

        // 2. Edge Case Scenario (8 users) -> Should be 2 clusters (4+4)
        await runScenario('Edge Case (8)', 8, dateStr);

        // 3. Multi-Cluster Scenario (12 users) -> Should be ~2 clusters (6+6)
        const finalResult = await runScenario('Multi Cluster (12)', 12, dateStr);

        // Save the final result (12 users) to Firestore for UI verification
        console.log(`\n💾 Saving "Multi Cluster" result to Cohort 0 in Firestore...`);
        await db.collection('cohorts').doc('0').set({
            dailyFeaturedParticipants: finalResult
        }, { merge: true });
        console.log('✅ Successfully updated Cohort 0 dailyFeaturedParticipants.');

    } catch (error) {
        console.error('💥 Verification Failed:', error);
        process.exit(1);
    }
}

main();
