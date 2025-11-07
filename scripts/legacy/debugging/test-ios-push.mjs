#!/usr/bin/env node
/**
 * Test iOS Web Push (uses sendPushToUser from Next.js)
 *
 * This script directly calls the Next.js sendPushToUser function
 * which handles both FCM and Web Push automatically
 *
 * Usage:
 *   node scripts/test-ios-push.mjs
 */

import { sendPushToUser } from '../src/lib/push/send-notification.ts';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function testIosPush() {
  try {
    console.log('🔔 Testing iOS Web Push to admin...\n');

    const participantId = 'admin';

    // 1. DM
    console.log('📨 [1/3] Sending DM notification...');
    await sendPushToUser(participantId, {
      title: '💬 새 메시지',
      body: '문준영님이 메시지를 보냈습니다',
      url: '/app/chat',
      type: 'dm',
    });

    await sleep(1000);

    // 2. Notice
    console.log('📢 [2/3] Sending Notice notification...');
    await sendPushToUser(participantId, {
      title: '📢 새 공지사항',
      body: '10기 첫 모임 일정이 공지되었습니다',
      url: '/app/chat',
      type: 'notice',
    });

    await sleep(1000);

    // 3. Matching
    console.log('📖 [3/3] Sending Matching notification...');
    await sendPushToUser(participantId, {
      title: '📖 프로필북 도착',
      body: '새로운 매칭 상대가 공개되었습니다!',
      url: '/app/chat',
      type: 'matching',
    });

    console.log('\n✨ All notifications sent! Check your iOS device 📱\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testIosPush()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
