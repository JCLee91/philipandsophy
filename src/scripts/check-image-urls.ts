/**
 * Check Image URLs in Firestore
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as path from 'path';
import { logger } from '@/lib/logger';

// Load service account from environment variable
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json';
const serviceAccount = require(path.resolve(process.cwd(), serviceAccountPath));

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();

async function checkImageUrls() {
  try {
    const snapshot = await db.collection('participants').get();

    logger.info('📸 Current Profile Image URLs:\n');

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const isFirebaseStorage = data.profileImage?.includes('storage.googleapis.com');
      const emoji = isFirebaseStorage ? '✅' : '❌';

      logger.info(`${emoji} ${data.name}`);
      logger.info(`   ${data.profileImage || '(no image)'}\n`);
    });

    const firebaseCount = snapshot.docs.filter(doc =>
      doc.data().profileImage?.includes('storage.googleapis.com')
    ).length;

    logger.info('='.repeat(60));
    logger.info(`✅ Firebase Storage: ${firebaseCount}/${snapshot.size}`);
    logger.info('='.repeat(60));

    process.exit(0);
  } catch (error) {
    logger.error('❌ Failed to check image URLs:', error);
    process.exit(1);
  }
}

checkImageUrls();
