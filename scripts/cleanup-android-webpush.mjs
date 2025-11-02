#!/usr/bin/env node
/**
 * Cleanup Web Push subscriptions from Android/Chrome users
 *
 * Removes webPushSubscriptions from participants who have FCM tokens
 * (they should use FCM only, not Web Push)
 *
 * Usage:
 *   node scripts/cleanup-android-webpush.mjs
 */

import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

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

const db = getFirestore().database('seoul');

/**
 * Cleanup Web Push subscriptions from FCM users
 */
const argv = yargs(hideBin(process.argv))
  .option('dry-run', {
    type: 'boolean',
    default: false,
    describe: 'Perform read-only cleanup simulation without writing changes',
  })
  .help()
  .alias('h', 'help')
  .parseSync();

async function cleanupAndroidWebPush() {
  const { dryRun } = argv;

  try {
    console.log('🧹 Cleaning up Web Push subscriptions from FCM users...\n');
    if (dryRun) {
      console.log('🔍 Dry-run mode enabled. No changes will be written.\n');
    }

    // Get all participants
    const participantsSnapshot = await db.collection('participants').get();

    if (participantsSnapshot.empty) {
      console.log('⚠️  No participants found');
      return;
    }

    console.log(`📊 Found ${participantsSnapshot.size} participant(s)\n`);

    let cleanupCount = 0;
    let totalWebPushRemoved = 0;

    const batch = db.batch();

    participantsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const participantId = doc.id;

      const pushTokens = data.pushTokens || [];
      const webPushSubs = data.webPushSubscriptions || [];

      // ✅ FCM 토큰이 있고 Web Push 구독도 있는 경우 → Web Push 제거
      if (pushTokens.length > 0 && webPushSubs.length > 0) {
        console.log(`🔄 ${data.name || participantId}:`);
        console.log(`   FCM tokens: ${pushTokens.length} ✅ (keep)`);
        console.log(`   Web Push: ${webPushSubs.length} ❌ (remove - redundant)`);

        if (!dryRun) {
          batch.update(doc.ref, {
            webPushSubscriptions: [],
          });
        }

        totalWebPushRemoved += webPushSubs.length;
        cleanupCount++;
      }
    });

    if (cleanupCount === 0) {
      console.log('✅ No redundant Web Push subscriptions found!\n');
      console.log('Database is clean - FCM users have no Web Push subscriptions.\n');
      return;
    }

    if (!dryRun) {
      console.log('\n💾 Updating database...');
      await batch.commit();
    }

    console.log('\n✅ Cleanup complete!');
    console.log(`   ${dryRun ? 'Would remove' : 'Removed'} ${totalWebPushRemoved} Web Push subscription(s)`);
    console.log(`   ${dryRun ? 'Would update' : 'Updated'} ${cleanupCount} participant(s)`);
    console.log('\n🎯 Android/Chrome users now use FCM only.\n');
    console.log('iOS Safari users will continue using Web Push API.\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Main
cleanupAndroidWebPush()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
