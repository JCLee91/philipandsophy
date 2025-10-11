/**
 * List all files in Firebase Storage
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Initialize Firebase Admin
if (!getApps().length) {
  const serviceAccount = require('../../firebase-service-account.json');

  initializeApp({
    credential: cert(serviceAccount),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

const storage = getStorage();
const bucket = storage.bucket();

async function listStorageFiles() {
  console.log('📁 Listing all files in Firebase Storage...\n');

  try {
    const [files] = await bucket.getFiles({ prefix: 'profile_images/' });

    console.log(`Found ${files.length} files in profile_images/:\n`);

    files.forEach((file, index) => {
      const size = Number(file.metadata.size) || 0;
      const sizeKB = (size / 1024).toFixed(1);
      console.log(`${index + 1}. ${file.name} (${sizeKB} KB)`);
    });

  } catch (error) {
    console.error('Error listing files:', error);
  }
}

listStorageFiles()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
