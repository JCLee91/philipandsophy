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

async function main() {
    console.log('🔍 Checking Cohort 0 data in Firestore...\n');

    try {
        const cohortDoc = await db.collection('cohorts').doc('0').get();

        if (!cohortDoc.exists) {
            console.log('❌ Cohort 0 document not found!');
            return;
        }

        const data = cohortDoc.data();
        const dailyFeatured = data?.dailyFeaturedParticipants;

        if (!dailyFeatured) {
            console.log('❌ No dailyFeaturedParticipants field!');
            return;
        }

        console.log('📅 Available dates:');
        Object.keys(dailyFeatured).forEach(date => {
            console.log(`   - ${date}`);
        });

        const targetDate = '2025-11-19';
        const dateData = dailyFeatured[targetDate];

        if (!dateData) {
            console.log(`\n❌ No data for ${targetDate}`);
            return;
        }

        console.log(`\n✅ Data for ${targetDate}:`);
        console.log(`   Matching Version: ${dateData.matchingVersion}`);
        console.log(`   Clusters: ${Object.keys(dateData.clusters || {}).length}`);

        if (dateData.clusters) {
            Object.values(dateData.clusters).forEach((c: any) => {
                console.log(`\n   [${c.emoji} ${c.name}]`);
                console.log(`      Theme: ${c.theme}`);
                console.log(`      Members: ${c.memberIds?.join(', ')}`);
            });
        }

        if (dateData.assignments) {
            const testUser01 = dateData.assignments['test-user-01'];
            if (testUser01) {
                console.log(`\n✅ test-user-01 assignment:`);
                console.log(`   Cluster: ${testUser01.clusterId}`);
                console.log(`   Assigned profiles: ${testUser01.assigned?.join(', ')}`);
            } else {
                console.log(`\n❌ test-user-01 not found in assignments`);
            }
        }

    } catch (error) {
        console.error('💥 Error:', error);
    }
}

main();
