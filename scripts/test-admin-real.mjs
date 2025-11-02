#!/usr/bin/env node
/**
 * Test Push to All Enabled Users (Real Production Logic)
 *
 * Sends push notifications using ACTUAL production logic:
 * - Android: FCM tokens
 * - iOS: Web Push subscriptions
 *
 * Usage:
 *   node scripts/test-admin-real.mjs
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

const db = getFirestore().database('seoul');

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

  try {
    const response = await admin.messaging().sendEachForMulticast(message);

    console.log(`   FCM: ${response.successCount} sent, ${response.failureCount} failed`);

    if (response.failureCount > 0) {
      response.responses.forEach((resp, index) => {
        if (!resp.success) {
          console.log(`      Token ${index + 1}: ${resp.error?.code} - ${resp.error?.message}`);
        }
      });
    }

    return response.successCount;
  } catch (error) {
    console.error(`   FCM Error: ${error.message}`);
    return 0;
  }
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

    // ✅ 운영 로직과 동일: FCM 있으면 Web Push 건너뜀
    const tokens = pushTokens.map(entry => entry.token);
    const shouldSendWebPush = tokens.length === 0;

    let fcmCount = 0;
    let webPushCount = 0;

    // Send via FCM
    if (tokens.length > 0) {
      fcmCount = await sendViaFCM(tokens, title, body, url, type);
    }

    // Send via Web Push (FCM 없을 때만)
    if (shouldSendWebPush && webPushSubs.length > 0) {
      webPushCount = await sendViaWebPush(webPushSubs, title, body, url, type);
    } else if (webPushSubs.length > 0) {
      console.log(`   Skipping Web Push (FCM already sent)\n`);
    }

    const total = fcmCount + webPushCount;
    console.log(`   ✅ Total: ${total} notification(s) sent\n`);

    return total;
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}\n`);
    return 0;
  }
}

/**
 * Get all enabled participants
 */
async function getAllEnabledParticipants() {
  const snapshot = await db.collection('participants').get();
  const enabledParticipants = [];

  snapshot.forEach((doc) => {
    const data = doc.data();
    const pushTokens = data.pushTokens || [];
    const webPushSubs = data.webPushSubscriptions || [];

    // Include if has any tokens/subscriptions
    if (pushTokens.length > 0 || webPushSubs.length > 0) {
      enabledParticipants.push({
        id: doc.id,
        name: data.name,
        pushTokens: pushTokens.length,
        webPushSubs: webPushSubs.length,
      });
    }
  });

  return enabledParticipants;
}

/**
 * Main
 */
async function testAllEnabledUsers() {
  try {
    console.log('🧪 Testing Real Push Logic to ALL Enabled Users\n');
    console.log('This uses the same logic as production:\n');
    console.log('  - Android: FCM tokens');
    console.log('  - iOS: Web Push (Apple Push Service)\n');

    // Get all enabled participants
    const participants = await getAllEnabledParticipants();

    if (participants.length === 0) {
      console.error('❌ No participants with push enabled found\n');
      process.exit(1);
    }

    console.log(`📱 Found ${participants.length} participant(s) with push enabled:\n`);
    participants.forEach((p, index) => {
      console.log(`   ${index + 1}. ${p.name} (${p.id})`);
      console.log(`      FCM: ${p.pushTokens}, Web Push: ${p.webPushSubs}`);
    });
    console.log('\n' + '='.repeat(60));
    console.log('\n');

    // Send to each participant
    for (const participant of participants) {
      console.log(`📤 Sending to ${participant.name} (${participant.id})...\n`);

      // 1. DM (실제 운영 텍스트)
      await sendPushToParticipant(
        participant.id,
        '문준영',
        '안녕하세요! 독서 모임에서 뵙게 되어 반갑습니다.',
        '/app/chat',
        'dm'
      );

      await sleep(1000);

      // 2. Notice (실제 운영 텍스트)
      await sendPushToParticipant(
        participant.id,
        '새로운 공지가 등록되었습니다',
        '10기 첫 모임이 10월 26일 토요일 오후 2시에 진행됩니다. 장소는 강남역 인근 카페이며, 자세한 내용은 채팅방에서 확인해주세요.',
        '/app/chat',
        'notice'
      );

      await sleep(1000);

      // 3. Matching (실제 운영 텍스트)
      await sendPushToParticipant(
        participant.id,
        '오늘의 프로필북이 도착했습니다',
        '새롭게 도착한 참가자들의 프로필 북을 확인해보세요',
        '/app/chat/today-library',
        'matching'
      );

      console.log('---\n');
    }

    console.log('='.repeat(60));
    console.log('\n✨ All test notifications sent to all enabled users!\n');
    console.log('Check all devices for 3 notifications each 📱\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testAllEnabledUsers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
