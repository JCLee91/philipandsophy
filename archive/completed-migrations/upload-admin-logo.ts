/**
 * Upload Admin Logo to Firebase Storage
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import * as path from 'path';
import { logger } from '@/lib/logger';
import { MIGRATION_CONFIG, IMAGE_CONFIG } from '@/constants/migration';

// Load service account from environment variable
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json';
const serviceAccount = require(path.resolve(process.cwd(), serviceAccountPath));

// Initialize Firebase Admin
if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'philipandsophy.firebasestorage.app',
  });
}

const db = getFirestore();
const storage = getStorage();

async function uploadAdminLogo() {
  try {
    logger.info('🚀 Uploading admin logo to Firebase Storage...\n');

    const localPath = path.join(process.cwd(), 'public/pns-logo.webp');
    const storagePath = `${IMAGE_CONFIG.STORAGE_PATHS.PROFILES}/admin${IMAGE_CONFIG.EXTENSIONS.WEBP}`;

    const bucket = storage.bucket();

    // Upload
    await bucket.upload(localPath, {
      destination: storagePath,
      metadata: {
        contentType: 'image/webp',
        cacheControl: `public, max-age=${MIGRATION_CONFIG.CACHE_MAX_AGE}`,
      },
    });

    // Make public
    const file = bucket.file(storagePath);
    await file.makePublic();

    // Get URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
    logger.info(`✅ Uploaded: ${publicUrl}\n`);

    // Update Firestore
    await db.collection('participants').doc('admin').update({
      profileImage: publicUrl,
      updatedAt: new Date(),
    });

    logger.info('💾 Updated admin participant in Firestore');
    logger.info('\n✨ Done!');

    process.exit(0);
  } catch (error) {
    logger.error('❌ Error:', error);
    process.exit(1);
  }
}

uploadAdminLogo();
