import * as admin from 'firebase-admin';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
}

const db = admin.firestore();

async function main() {
    console.log('🔍 Checking participants in Firestore...\n');

    try {
        const snapshot = await db.collection('participants').limit(20).get();

        if (snapshot.empty) {
            console.log('❌ No participants found in the database!');
            return;
        }

        console.log(`✅ Found ${snapshot.size} participants (showing first 20):\n`);

        snapshot.forEach((doc, i) => {
            const data = doc.data();
            console.log(`${i + 1}. ${data.name || 'Unnamed'}`);
            console.log(`   ID: ${doc.id}`);
            console.log(`   Cohort: ${data.cohortId || 'N/A'}`);
            console.log(`   Admin: ${data.isAdministrator ? 'Yes' : 'No'}, Super: ${data.isSuperAdmin ? 'Yes' : 'No'}, Ghost: ${data.isGhost ? 'Yes' : 'No'}`);
            console.log('');
        });

    } catch (error) {
        console.error('💥 Error:', error);
        process.exit(1);
    }
}

main();
