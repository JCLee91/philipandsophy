#!/usr/bin/env node
/**
 * Test All Push Notification Types to All Enabled Users
 *
 * Sends all 3 types of push notifications with 1 second interval
 * to ALL participants who have push notifications enabled
 *
 * Usage:
 *   node scripts/test-all-push-types.mjs
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

const db = getFirestore();

/**
 * Sleep function
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Get all participants with push notifications enabled
 */
async function getEnabledParticipants() {
  const snapshot = await db.collection('participants').get();
  const enabledParticipants = [];

  snapshot.forEach((doc) => {
    const data = doc.data();
    const pushTokens = data.pushTokens || [];

    // Include if pushNotificationEnabled is true (or undefined/null for backward compatibility)
    // AND has at least one push token
    if (data.pushNotificationEnabled !== false && pushTokens.length > 0) {
      enabledParticipants.push({
        id: doc.id,
        name: data.name,
        pushTokens: pushTokens,
      });
    }
  });

  return enabledParticipants;
}

/**
 * Send push notification to all tokens
 */
async function sendPushToAll(participants, payload, type) {
  try {
    // Collect all tokens from all participants
    const allTokens = [];
    participants.forEach((participant) => {
      const tokens = participant.pushTokens.map((entry) => entry.token);
      allTokens.push(...tokens);
    });

    if (allTokens.length === 0) {
      console.log(`⚠️  No FCM tokens found\n`);
      return;
    }

    const message = {
      tokens: allTokens,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: {
        url: payload.url || '/app/chat',
        type: type,
      },
      // ✅ Android: 각 알림 타입마다 고유한 태그 설정 (덮어쓰기 방지)
      android: {
        notification: {
          tag: `${type}-${Date.now()}`, // 고유한 태그로 알림이 쌓임
          icon: payload.icon || '/image/app-icon-192.png',
          color: '#000000',
        },
      },
      webpush: {
        notification: {
          icon: payload.icon || '/image/app-icon-192.png',
          badge: payload.badge || '/image/badge-icon.webp',
          requireInteraction: false,
          tag: `${type}-${Date.now()}`, // Web도 동일하게 고유 태그
        },
        fcmOptions: {
          link: payload.url || '/app/chat',
        },
      },
    };

    const response = await admin.messaging().sendEachForMulticast(message);

    console.log(`✅ ${type.toUpperCase()} Push Sent!`);
    console.log(`   Success: ${response.successCount} device(s)`);
    console.log(`   Failed: ${response.failureCount} device(s)\n`);

    if (response.failureCount > 0) {
      console.log('❌ Failures:');
      response.responses.forEach((resp, index) => {
        if (!resp.success) {
          console.log(`   Token ${index + 1}: ${resp.error?.code} - ${resp.error?.message}`);
        }
      });
      console.log();
    }

  } catch (error) {
    console.error(`❌ Error sending ${type} push:`, error.message);
  }
}

/**
 * Main function
 */
async function testAllPushTypes() {
  try {
    console.log('🔔 Sending all push notification types to ALL enabled users...\n');

    // Get all participants with push enabled
    const participants = await getEnabledParticipants();

    if (participants.length === 0) {
      console.error('❌ No participants with push notifications enabled found\n');
      process.exit(1);
    }

    console.log(`📱 Found ${participants.length} participant(s) with push enabled:\n`);
    participants.forEach((p, index) => {
      console.log(`   ${index + 1}. ${p.name} (${p.id}) - ${p.pushTokens.length} token(s)`);
    });
    console.log();

    const totalTokens = participants.reduce((sum, p) => sum + p.pushTokens.length, 0);
    console.log(`📤 Sending to ${totalTokens} total device(s)\n`);

    // 1. DM (Direct Message) Push
    console.log('📨 [1/3] Sending DM notification...');
    await sendPushToAll(participants, {
      title: '💬 새 메시지',
      body: '문준영님이 메시지를 보냈습니다',
      url: '/app/chat',
      icon: '/image/app-icon-192.png',
    }, 'dm');

    await sleep(2000);

    // 2. Notice Push
    console.log('📢 [2/3] Sending Notice notification...');
    await sendPushToAll(participants, {
      title: '📢 새 공지사항',
      body: '10기 첫 모임 일정이 공지되었습니다',
      url: '/app/chat',
      icon: '/image/app-icon-192.png',
    }, 'notice');

    await sleep(2000);

    // 3. Matching Push
    console.log('📖 [3/3] Sending Matching notification...');
    await sendPushToAll(participants, {
      title: '📖 프로필북 도착',
      body: '오늘의 프로필북이 도착했습니다',
      url: '/app/chat',
      icon: '/image/app-icon-192.png',
    }, 'matching');

    console.log('✨ All push notifications sent to all enabled users!\n');
    console.log('Check devices for all 3 notifications 📱\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Main
testAllPushTypes()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
