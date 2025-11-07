#!/usr/bin/env node
/**
 * Reset All Push Notifications for All Users
 *
 * This script performs 3 tasks:
 * 1. Remove legacy push fields (pushToken, pushTokenUpdatedAt)
 * 2. Clear all push tokens and subscriptions
 * 3. Set pushNotificationEnabled to false for all users
 *
 * After running this, all users will see push notification prompt on next login.
 *
 * Usage:
 *   node scripts/reset-all-push.mjs
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
    console.log('✅ Firebase Admin SDK initialized\n');
  } catch (error) {
    console.error('❌ Failed to load firebase-service-account.json');
    process.exit(1);
  }
}

const db = getFirestore(admin.app(), 'seoul');

/**
 * Reset push notifications for all users
 */
async function resetAllPush() {
  try {
    console.log('🔄 Resetting push notifications for ALL users...\n');
    console.log('This will:');
    console.log('  1. Remove legacy push fields (pushToken, pushTokenUpdatedAt)');
    console.log('  2. Clear all push tokens and subscriptions');
    console.log('  3. Set pushNotificationEnabled to false');
    console.log('\n');

    // Get all participants
    const participantsSnapshot = await db.collection('participants').get();

    if (participantsSnapshot.empty) {
      console.log('⚠️  No participants found');
      return;
    }

    console.log(`📊 Found ${participantsSnapshot.size} participant(s)\n`);

    let legacyFieldCount = 0;
    let fcmTokenCount = 0;
    let webPushCount = 0;
    let enabledCount = 0;

    const batch = db.batch();

    participantsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const participantId = doc.id;

      // Count statistics
      const hasPushToken = !!data.pushToken;
      const fcmTokens = (data.pushTokens || []).length;
      const webPushSubs = (data.webPushSubscriptions || []).length;
      const isEnabled = data.pushNotificationEnabled === true;

      if (hasPushToken) legacyFieldCount++;
      fcmTokenCount += fcmTokens;
      webPushCount += webPushSubs;
      if (isEnabled) enabledCount++;

      console.log(`🔄 ${data.name || participantId}:`);
      if (hasPushToken) console.log(`   ✂️  Remove legacy pushToken`);
      if (fcmTokens > 0) console.log(`   🗑️  Clear ${fcmTokens} FCM token(s)`);
      if (webPushSubs > 0) console.log(`   🗑️  Clear ${webPushSubs} Web Push subscription(s)`);
      if (isEnabled) console.log(`   🔕 Disable push notifications`);

      // Update participant
      batch.update(doc.ref, {
        // 1. Remove legacy fields
        pushToken: admin.firestore.FieldValue.delete(),
        pushTokenUpdatedAt: admin.firestore.FieldValue.delete(),
        // 2. Clear all tokens
        pushTokens: [],
        webPushSubscriptions: [],
        // 3. Disable push notifications
        pushNotificationEnabled: false,
      });
    });

    console.log('\n💾 Updating database...');
    await batch.commit();

    console.log('\n✅ Reset complete!\n');
    console.log('📊 Statistics:');
    console.log(`   Legacy fields removed: ${legacyFieldCount}`);
    console.log(`   FCM tokens cleared: ${fcmTokenCount}`);
    console.log(`   Web Push subscriptions cleared: ${webPushCount}`);
    console.log(`   Push enabled users reset: ${enabledCount}`);
    console.log(`   Total users processed: ${participantsSnapshot.size}`);

    console.log('\n🎯 Next Steps:');
    console.log('   1. All users will see push notification prompt on next login');
    console.log('   2. Only PWA users (not Chrome browser tabs) can enable push');
    console.log('   3. Android will use FCM only');
    console.log('   4. iOS will use Web Push only');
    console.log('\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Main
console.log('\n⚠️  WARNING: This will reset push notifications for ALL users!\n');
console.log('Press Ctrl+C to cancel, or wait 3 seconds to continue...\n');

setTimeout(() => {
  resetAllPush()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}, 3000);
