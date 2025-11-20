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
 * Helper to create dummy submissions for REAL participants
 */
function createDummySubmissionsForParticipants(participants: any[]): DailySubmission[] {
    const books = [
        { title: '데미안', author: '헤르만 헤세' },
        { title: '코스모스', author: '칼 세이건' },
        { title: '총 균 쇠', author: '제레드 다이아몬드' },
        { title: '사피엔스', author: '유발 하라리' },
        { title: '이방인', author: '알베르 카뮈' }
    ];

    const reviews = [
        '오늘의 감상평입니다. 삶의 의미와 존재에 대해 깊이 생각해보게 되었습니다.',
        '책을 읽으며 인간의 본질에 대해 다시 한번 고민하게 되었습니다.',
        '주체적인 삶이란 무엇인지 되돌아보는 시간이었습니다.',
        '자유와 책임의 관계에 대해 새롭게 깨달았습니다.',
        '진정한 행복이 무엇인지 생각하게 만드는 책이었습니다.'
    ];

    const answers = [
        '저는 주체적인 삶과 자유를 가장 중요하게 생각합니다. 스스로 선택하고 책임지는 삶이 진정한 삶이라고 믿습니다.',
        '진정성 있는 삶을 살아가는 것이 가장 중요하다고 생각합니다. 타인의 시선이 아닌 내 가치관대로 사는 것이죠.',
        '성장과 배움을 멈추지 않는 것입니다. 끊임없이 발전하며 더 나은 사람이 되고자 노력합니다.',
        '타인과의 진실한 관계를 가장 중요하게 여깁니다. 진심으로 소통하고 이해하는 것이 삶의 행복이라 믿습니다.',
        '현재를 충실히 사는 것입니다. 과거에 얽매이지 않고 미래를 두려워하지 않으며 지금 이 순간에 집중합니다.'
    ];

    return participants.map((participant, i) => {
        const book = books[i % books.length];
        const review = reviews[i % reviews.length];
        const answer = answers[i % answers.length];

        return {
            participantId: participant.id,
            participantName: participant.name,
            gender: participant.gender || 'other',
            bookTitle: book.title,
            bookAuthor: book.author,
            review: `${review} (${participant.name})`,
            dailyQuestion: '당신의 삶에서 가장 중요한 가치는 무엇인가요?',
            dailyAnswer: `${answer} - ${participant.name}`
        };
    });
}

async function main() {
    console.log('🚀 Setting up Cohort 0 Test Data with Real Participants...');

    const dateStr = '2025-11-19'; // Target date
    const cohortId = '0';

    try {
        // 1. Fetch all participants from Cohort 0
        console.log('\n📋 Fetching participants from Cohort 0...');
        const participantsSnapshot = await db.collection('participants')
            .where('cohortId', '==', cohortId)
            .get();

        const allParticipants = participantsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        console.log(`✅ Found ${allParticipants.length} participants in Cohort 0`);

        if (allParticipants.length === 0) {
            console.log('❌ No participants found in Cohort 0!');
            return;
        }

        // Filter out super admins and ghosts if needed
        const participants = allParticipants.filter(p => !p.isSuperAdmin && !p.isGhost);

        console.log(`✅ Using ${participants.length} participants (excluding admins/ghosts)`);
        console.log('\n👥 Participants:');
        participants.forEach((p, i) => console.log(`   ${i + 1}. ${p.name} (${p.id})`));

        // 2. Create dummy submissions for these real participants
        console.log('\n📝 Creating dummy submissions...');
        const submissions = createDummySubmissionsForParticipants(participants);

        console.log(`✅ Created ${submissions.length} dummy submissions`);

        // 3. Run cluster matching
        console.log(`\n🤖 Running AI cluster matching for ${dateStr}...`);
        const result = await matchParticipantsWithClusters(submissions, dateStr);

        console.log(`\n✅ Matching Successful!`);
        console.log(`   Clusters Created: ${Object.keys(result.clusters).length}`);

        Object.values(result.clusters).forEach(c => {
            console.log(`\n[${c.emoji} ${c.name}]`);
            console.log(`   Theme: ${c.theme}`);
            const memberNames = c.memberIds.map(id => {
                const p = participants.find(p => p.id === id);
                return p ? p.name : id;
            });
            console.log(`   Members (${c.memberIds.length}): ${memberNames.join(', ')}`);
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
        console.log(`📅 Make sure to log in with a date where submissions exist (${dateStr})`);

    } catch (error) {
        console.error('💥 Setup Failed:', error);
        process.exit(1);
    }
}

main();
