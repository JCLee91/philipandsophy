#!/usr/bin/env node
/**
 * Cleanup All Push Tokens (FCM + Web Push)
 *
 * Removes all push tokens and web push subscriptions from all participants
 * Useful for starting fresh with push notification testing
 *
 * Usage:
 *   node scripts/cleanup-push-tokens.mjs
 */

import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin with service account
if (admin.apps.length === 0) {
  const serviceAccountPath = join(__dirname, '..', 'firebase-service-account.json');

  try {
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log('✅ Firebase Admin SDK initialized');
  } catch (error) {
    console.error('❌ Failed to load firebase-service-account.json');
    console.error('   Make sure the file exists at:', serviceAccountPath);
    process.exit(1);
  }
}

const db = getFirestore();

/**
 * Cleanup all push tokens
 */
async function cleanupPushTokens() {
  try {
    console.log('\n🧹 Cleaning up all push tokens...\n');

    // Get all participants
    const participantsSnapshot = await db.collection('participants').get();

    if (participantsSnapshot.empty) {
      console.log('⚠️  No participants found');
      return;
    }

    console.log(`📊 Found ${participantsSnapshot.size} participant(s)\n`);

    let totalFCMTokens = 0;
    let totalWebPushSubs = 0;
    let updatedCount = 0;

    // Use batch for efficient updates
    const batch = db.batch();

    participantsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const participantId = doc.id;

      const fcmTokenCount = (data.pushTokens || []).length;
      const webPushCount = (data.webPushSubscriptions || []).length;

      // Only update if there are tokens to remove
      if (fcmTokenCount > 0 || webPushCount > 0 || data.pushNotificationEnabled === true) {
        console.log(`🔄 ${data.name || participantId}:`);
        console.log(`   FCM tokens: ${fcmTokenCount}`);
        console.log(`   Web Push: ${webPushCount}`);

        totalFCMTokens += fcmTokenCount;
        totalWebPushSubs += webPushCount;

        // Clear all push-related fields
        batch.update(doc.ref, {
          pushTokens: [],
          webPushSubscriptions: [],
          pushNotificationEnabled: false,
        });

        updatedCount++;
      }
    });

    if (updatedCount === 0) {
      console.log('✅ No push tokens found - database already clean!\n');
      return;
    }

    console.log('\n💾 Updating database...');
    await batch.commit();

    console.log('\n✅ Cleanup complete!');
    console.log(`   Removed ${totalFCMTokens} FCM token(s)`);
    console.log(`   Removed ${totalWebPushSubs} Web Push subscription(s)`);
    console.log(`   Updated ${updatedCount} participant(s)`);
    console.log('\n🎯 All push tokens have been cleared.\n');
    console.log('Next steps:');
    console.log('  1. Open the app on your iOS device');
    console.log('  2. Go to Settings');
    console.log('  3. Toggle push notifications ON');
    console.log('  4. Run: node scripts/test-push.mjs <participantId>\n');

  } catch (error) {
    console.error('\n❌ Error cleaning up push tokens:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Main
cleanupPushTokens()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
