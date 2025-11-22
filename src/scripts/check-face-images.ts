
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const serviceAccount = require('../../firebase-service-account.json');

const app = initializeApp({
    credential: cert(serviceAccount),
});

// Use Seoul database instead of default
const db = getFirestore(app, 'seoul');

async function checkFaceImages() {
    console.log('Checking participants for faceImage field...');

    const snapshot = await db.collection('participants').get();
    let count = 0;
    let faceImageCount = 0;

    snapshot.forEach(doc => {
        const data = doc.data();
        count++;
        if ('faceImage' in data) {
            faceImageCount++;
            console.log(`[FOUND] ${data.name} (${doc.id}): "${data.faceImage}" (Type: ${typeof data.faceImage})`);
        }
    });

    console.log(`\nTotal participants: ${count}`);
    console.log(`Participants with faceImage: ${faceImageCount}`);
}

checkFaceImages().catch(console.error);
