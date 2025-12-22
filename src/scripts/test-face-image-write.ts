
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const serviceAccount = require('../../firebase-service-account.json');

const app = initializeApp({
    credential: cert(serviceAccount),
});

const db = getFirestore(app);

async function testFaceImageWrite() {
    console.log('Testing write to faceImage field...');

    // Get the first participant
    const snapshot = await db.collection('participants').limit(1).get();
    if (snapshot.empty) {
        console.log('No participants found.');
        return;
    }

    const doc = snapshot.docs[0];
    const participantId = doc.id;
    const originalData = doc.data();

    console.log(`Target Participant: ${originalData.name} (${participantId})`);
    console.log(`Original faceImage: ${originalData.faceImage}`);

    const testUrl = 'https://example.com/test-face-image.jpg';

    try {
        await db.collection('participants').doc(participantId).update({
            faceImage: testUrl,
            updatedAt: new Date(),
        });
        console.log('Write successful.');

        // Read back
        const updatedDoc = await db.collection('participants').doc(participantId).get();
        const updatedData = updatedDoc.data();
        console.log(`Updated faceImage: ${updatedData?.faceImage}`);

        if (updatedData?.faceImage === testUrl) {
            console.log('VERIFICATION PASSED: Field was written and read back successfully.');

            // Revert
            /*
            await db.collection('participants').doc(participantId).update({
              faceImage: originalData.faceImage || null, // or deleteField()
              updatedAt: new Date(),
            });
            console.log('Reverted changes.');
            */
        } else {
            console.log('VERIFICATION FAILED: Field value does not match.');
        }

    } catch (error) {
        console.error('Write failed:', error);
    }
}

testFaceImageWrite().catch(console.error);
