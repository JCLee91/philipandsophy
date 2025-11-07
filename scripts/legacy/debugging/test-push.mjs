#!/usr/bin/env node
/**
 * Test Push Notification Sender
 *
 * Usage:
 *   node scripts/test-push.mjs <participantId>
 *
 * Example:
 *   node scripts/test-push.mjs user-hyunji
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

const db = getFirestore(admin.app(), 'seoul');

/**
 * Send test push notification
 */
async function sendTestPush(participantId) {
  try {
    console.log(`\n🔔 Sending test push to participant: ${participantId}\n`);

    // Get participant data
    const participantRef = db.collection('participants').doc(participantId);
    const participantSnap = await participantRef.get();

    if (!participantSnap.exists) {
      console.error('❌ Participant not found:', participantId);
      process.exit(1);
    }

    const data = participantSnap.data();
    console.log('✅ Participant found:', data.name);

    // Check push notification status
    if (data.pushNotificationEnabled === false) {
      console.warn('⚠️  Push notifications are DISABLED for this participant');
      console.log('    Please enable push notifications in the app first.\n');
      process.exit(1);
    }

    // Get push tokens
    const pushTokens = data.pushTokens || [];
    const webPushSubs = data.webPushSubscriptions || [];

    console.log('\n📱 Device Status:');
    console.log(`   FCM Tokens: ${pushTokens.length} device(s)`);
    console.log(`   Web Push: ${webPushSubs.length} subscription(s)`);

    if (pushTokens.length === 0 && webPushSubs.length === 0) {
      console.error('\n❌ No push tokens found');
      console.log('   Please enable push notifications in the app first.\n');
      process.exit(1);
    }

    // Display tokens
    console.log('\n🔑 Push Tokens:');
    pushTokens.forEach((entry, index) => {
      console.log(`   ${index + 1}. Device: ${entry.deviceId}`);
      console.log(`      Token: ${entry.token.substring(0, 50)}...`);
    });

    webPushSubs.forEach((entry, index) => {
      console.log(`   ${index + 1}. Web Push endpoint: ${entry.endpoint.substring(0, 50)}...`);
    });

    // Send test push notification
    console.log('\n📤 Sending test push notification...');

    const tokens = pushTokens.map(entry => entry.token);

    if (tokens.length === 0) {
      console.log('⚠️  No FCM tokens - Web Push will be used by browser automatically');
      console.log('✅ Test notification would be delivered via Web Push API\n');
      return;
    }

    const message = {
      tokens,
      notification: {
        title: '🧪 테스트 알림',
        body: '필립앤소피 푸시 알림이 정상 작동합니다! ✅',
      },
      data: {
        url: '/app/chat',
        type: 'test',
      },
      webpush: {
        notification: {
          icon: '/image/app-icon-192.png',
          badge: '/image/badge-icon.webp',
          requireInteraction: false,
        },
        fcmOptions: {
          link: '/app/chat',
        },
      },
    };

    const response = await admin.messaging().sendEachForMulticast(message);

    console.log('\n✅ Push Notification Sent!');
    console.log(`   Success: ${response.successCount} device(s)`);
    console.log(`   Failed: ${response.failureCount} device(s)`);

    if (response.failureCount > 0) {
      console.log('\n❌ Failures:');
      response.responses.forEach((resp, index) => {
        if (!resp.success) {
          console.log(`   Device ${index + 1}: ${resp.error?.code} - ${resp.error?.message}`);
        }
      });
    }

    console.log('\n✨ Check your device for the test notification!\n');
  } catch (error) {
    console.error('\n❌ Error sending test push:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Main
const participantId = process.argv[2];

if (!participantId) {
  console.error('❌ Usage: node scripts/test-push.mjs <participantId>');
  console.error('\nExample:');
  console.error('  node scripts/test-push.mjs user-hyunji');
  console.error('  node scripts/test-push.mjs admin\n');
  process.exit(1);
}

sendTestPush(participantId)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
