import * as admin from 'firebase-admin';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

if (!admin.apps.length) {
    admin.initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
}

const db = admin.firestore();
db.settings({ databaseId: 'seoul' });

async function main() {
    console.log('🔍 Checking ALL dates in Seoul DB...\n');

    try {
        const cohortDoc = await db.collection('cohorts').doc('0').get();

        if (!cohortDoc.exists) {
            console.log('❌ Cohort 0 not found!');
            return;
        }

        const data = cohortDoc.data();
        const dailyFeatured = data?.dailyFeaturedParticipants;

        if (!dailyFeatured) {
            console.log('❌ No dailyFeaturedParticipants!');
            return;
        }

        console.log('📅 All dates in dailyFeaturedParticipants:\n');

        Object.keys(dailyFeatured).sort().forEach(key => {
            const dateData = dailyFeatured[key];

            console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
            console.log(`📅 Date: ${key}`);
            console.log(`   Type: ${dateData.matchingVersion || 'N/A'}`);

            if (dateData.clusters) {
                console.log(`   Clusters (${Object.keys(dateData.clusters).length}):`);
                Object.values(dateData.clusters).forEach((c: any) => {
                    console.log(`      ${c.emoji || '•'} ${c.name || 'Unnamed'}`);
                    console.log(`         Members (${c.memberIds?.length || 0}): ${c.memberIds?.join(', ') || 'none'}`);
                });
            }

            if (dateData.assignments) {
                const assignmentCount = Object.keys(dateData.assignments).length;
                console.log(`   Assignments: ${assignmentCount} participants`);

                const testUser01 = dateData.assignments['test-user-01'];
                if (testUser01) {
                    const hasSelf = testUser01.assigned?.includes('test-user-01');
                    console.log(`   test-user-01: ${testUser01.assigned?.length || 0} profiles ${hasSelf ? '(✅ includes self)' : '(❌ NO self)'}`);
                }
            }
            console.log('');
        });

    } catch (error) {
        console.error('💥 Error:', error);
    }
}

main();
