#!/usr/bin/env node
/**
 * Test Push to Participant (Real Production Logic)
 *
 * Sends push notifications using ACTUAL production logic:
 * - Android: FCM tokens
 * - iOS: Web Push subscriptions
 *
 * Usage:
 *   node scripts/test-admin-real.mjs [participantId]
 *   Default: admin
 */

import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import webpush from 'web-push';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin
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

const db = getFirestore();

// Web Push VAPID keys
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_WEBPUSH_VAPID_KEY;
const VAPID_PRIVATE_KEY = process.env.WEBPUSH_VAPID_PRIVATE_KEY;

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.error('❌ VAPID keys not found in .env.local');
  process.exit(1);
}

webpush.setVapidDetails(
  'mailto:contact@philipandsophy.kr',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Send via FCM (Android)
 */
async function sendViaFCM(tokens, title, body, url, type) {
  if (tokens.length === 0) {
    console.log('   No FCM tokens, skipping FCM\n');
    return 0;
  }

  const message = {
    tokens,
    data: {
      title,
      body,
      icon: '/image/app-icon-192.png',
      badge: '/image/badge-icon.webp',
      url,
      type,
      tag: `${type}-${Date.now()}`,
    },
    android: {
      priority: 'high',
    },
    webpush: {
      headers: {
        Urgency: 'high',
      },
    },
  };

  const response = await admin.messaging().sendEachForMulticast(message);

  console.log(`   FCM: ${response.successCount} sent, ${response.failureCount} failed`);
  return response.successCount;
}

/**
 * Send via Web Push (iOS)
 */
async function sendViaWebPush(subscriptions, title, body, url, type) {
  if (subscriptions.length === 0) {
    console.log('   No Web Push subscriptions, skipping Web Push\n');
    return 0;
  }

  // Filter iOS only
  const iosSubscriptions = subscriptions.filter((sub) =>
    sub.endpoint.includes('web.push.apple.com')
  );

  if (iosSubscriptions.length === 0) {
    console.log('   No iOS Web Push subscriptions\n');
    return 0;
  }

  let successCount = 0;

  for (const subscription of iosSubscriptions) {
    try {
      const payload = JSON.stringify({
        title,
        body,
        icon: '/image/app-icon-192.png',
        badge: '/image/badge-icon.webp',
        data: {
          url,
          type,
        },
      });

      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth,
          },
        },
        payload
      );

      successCount++;
    } catch (error) {
      console.error(`   Web Push failed: ${error.message}`);
    }
  }

  console.log(`   Web Push (iOS): ${successCount} sent\n`);
  return successCount;
}

/**
 * Send push to participant (FCM + Web Push)
 */
async function sendPushToParticipant(participantId, title, body, url, type) {
  try {
    const participantRef = db.collection('participants').doc(participantId);
    const participantSnap = await participantRef.get();

    if (!participantSnap.exists) {
      throw new Error(`Participant ${participantId} not found`);
    }

    const data = participantSnap.data();
    const pushTokens = data.pushTokens || [];
    const webPushSubs = data.webPushSubscriptions || [];

    console.log(`📤 ${type.toUpperCase()}:`);
    console.log(`   FCM tokens: ${pushTokens.length}`);
    console.log(`   Web Push subs: ${webPushSubs.length}`);

    // Send via FCM
    const tokens = pushTokens.map(entry => entry.token);
    const fcmCount = await sendViaFCM(tokens, title, body, url, type);

    // Send via Web Push
    const webPushCount = await sendViaWebPush(webPushSubs, title, body, url, type);

    const total = fcmCount + webPushCount;
    console.log(`   ✅ Total: ${total} notification(s) sent\n`);

    return total;
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}\n`);
    return 0;
  }
}

/**
 * Main
 */
async function testParticipantReal(participantId) {
  try {
    console.log(`🧪 Testing Real Push Logic to ${participantId}\n`);
    console.log('This uses the same logic as production:\n');
    console.log('  - Android: FCM tokens');
    console.log('  - iOS: Web Push (Apple Push Service)\n');
    console.log('='.repeat(60));
    console.log('\n');

    // 1. DM
    await sendPushToParticipant(
      participantId,
      '💬 새 메시지',
      '문준영님이 메시지를 보냈습니다',
      '/app/chat',
      'dm'
    );

    await sleep(1000);

    // 2. Notice
    await sendPushToParticipant(
      participantId,
      '📢 새 공지사항',
      '10기 첫 모임 일정이 공지되었습니다',
      '/app/chat',
      'notice'
    );

    await sleep(1000);

    // 3. Matching
    await sendPushToParticipant(
      participantId,
      '📖 프로필북 도착',
      '새로운 매칭 상대가 공개되었습니다!',
      '/app/chat',
      'matching'
    );

    console.log('='.repeat(60));
    console.log('\n✨ All test notifications sent!\n');
    console.log(`Check ${participantId} device for 3 notifications 📱\n`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Get participant ID from command line (default: admin)
const participantId = process.argv[2] || 'admin';

testParticipantReal(participantId)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
