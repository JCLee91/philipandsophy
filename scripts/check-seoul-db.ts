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
db.settings({ databaseId: 'seoul' }); // Use Seoul DB

async function main() {
    console.log('🔍 Checking Seoul DB - Cohort 0 data...\n');

    try {
        const cohortDoc = await db.collection('cohorts').doc('0').get();

        if (!cohortDoc.exists) {
            console.log('❌ Cohort 0 document not found in Seoul DB!');
            return;
        }

        const data = cohortDoc.data();
        const dailyFeatured = data?.dailyFeaturedParticipants;

        if (!dailyFeatured) {
            console.log('❌ No dailyFeaturedParticipants field!');
            return;
        }

        const targetDate = '2025-11-19';
        const dateData = dailyFeatured[targetDate];

        if (!dateData) {
            console.log(`❌ No data for ${targetDate}`);
            return;
        }

        console.log(`✅ Data for ${targetDate} in Seoul DB:`);
        console.log(`   Matching Version: ${dateData.matchingVersion}`);

        if (dateData.clusters) {
            Object.values(dateData.clusters).forEach((c: any) => {
                console.log(`\n   [${c.emoji} ${c.name}]`);
                console.log(`      Members: ${c.memberIds?.join(', ')}`);
            });
        }

        if (dateData.assignments) {
            const testUser01 = dateData.assignments['test-user-01'];
            if (testUser01) {
                console.log(`\n✅ test-user-01 assignment:`);
                console.log(`   Cluster: ${testUser01.clusterId}`);
                console.log(`   Assigned count: ${testUser01.assigned?.length || 0}`);
                console.log(`   Assigned IDs: ${testUser01.assigned?.join(', ') || 'none'}`);

                // Check if self is included
                const hasSelf = testUser01.assigned?.includes('test-user-01');
                console.log(`   🔍 Includes self: ${hasSelf ? '✅ YES' : '❌ NO (OLD VERSION!)'}`);
            } else {
                console.log(`\n❌ test-user-01 not found in assignments`);
            }
        }

    } catch (error) {
        console.error('💥 Error:', error);
    }
}

main();
