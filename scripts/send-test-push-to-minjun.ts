#!/usr/bin/env node
/**
 * 김민준 푸시 알림 테스트 스크립트
 *
 * 실행 방법:
 * npx tsx scripts/send-test-push-to-minjun.ts
 */

import * as admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { join } from 'path';

// Firebase Admin SDK 초기화
const serviceAccount = JSON.parse(
  readFileSync(join(process.cwd(), 'firebase-service-account.json'), 'utf-8')
);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendTestNotifications() {
  console.log('\n🚀 김민준 푸시 알림 테스트 시작');
  console.log('═'.repeat(60));

  const targetUserId = '김민준-5678';

  try {
    // 김민준 유저 확인
    const userDoc = await db.collection('participants').doc(targetUserId).get();
    if (!userDoc.exists) {
      console.error(`\n❌ ${targetUserId} 유저를 찾을 수 없습니다.`);
      return;
    }

    const userData = userDoc.data()!;
    const pushTokensCount = userData.pushTokens?.length || 0;
    const webPushCount = userData.webPushSubscriptions?.length || 0;
    const isPushEnabled = userData.pushNotificationEnabled;

    console.log(`\n대상: ${userData.name} (${targetUserId})`);
    console.log(`\n📊 푸시 상태:`);
    console.log(`   FCM 토큰: ${pushTokensCount}개`);
    console.log(`   Web Push 구독: ${webPushCount}개`);
    console.log(`   알림 활성화: ${isPushEnabled ? '✅ 활성화됨' : '❌ 비활성화됨'}`);

    if (!isPushEnabled && pushTokensCount === 0 && webPushCount === 0) {
      console.log('\n⚠️  경고: 푸시 알림이 활성화되지 않았습니다.');
      console.log('   앱에서 설정 → 푸시 알림 ON 후 다시 시도하세요.\n');
      return;
    }

    console.log('\n⏰ 테스트 시작...\n');

    // 1. DM 알림 (admin이 발신)
    console.log('📨 1/3: DM 알림 전송 중...');
    const dmRef = db.collection('messages').doc();
    await dmRef.set({
      senderId: 'admin',
      receiverId: targetUserId,
      content: '[테스트] DM 푸시 알림 테스트 메시지입니다. 정상적으로 수신되었나요?',
      conversationId: `admin-${targetUserId}`,
      isRead: false,
      createdAt: admin.firestore.Timestamp.now(),
    });
    console.log(`   ✅ DM 알림 트리거 완료 (messageId: ${dmRef.id})`);
    console.log('   → 발신자: JC (admin)\n');

    await delay(2000);

    // 2. 공지사항 알림
    console.log('📢 2/3: 공지사항 알림 전송 중...');
    const cohortId = userData.cohortId || '1';
    const noticeRef = db.collection('notices').doc();
    await noticeRef.set({
      cohortId,
      author: '시스템 테스트',
      content: '[테스트] 공지사항 푸시 알림 테스트입니다. 모든 참가자에게 전송되는 알림이 정상 작동하는지 확인 중입니다.',
      isPinned: false,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    });
    console.log(`   ✅ 공지사항 알림 트리거 완료 (noticeId: ${noticeRef.id})`);
    console.log(`   → cohort: ${cohortId}\n`);

    await delay(2000);

    // 3. 프로필북 알림 (DM으로 시뮬레이션)
    console.log('📚 3/3: 오늘의 프로필북 알림 시뮬레이션 중...');
    const profileBookRef = db.collection('messages').doc();
    await profileBookRef.set({
      senderId: 'admin',
      receiverId: targetUserId,
      content: '[테스트] 새롭게 도착한 참가자들의 프로필 북을 확인해보세요',
      conversationId: `admin-${targetUserId}`,
      isRead: false,
      createdAt: admin.firestore.Timestamp.now(),
    });
    console.log(`   ✅ 프로필북 알림 시뮬레이션 완료 (messageId: ${profileBookRef.id})`);
    console.log('   → 제목: "오늘의 프로필북이 도착했습니다"');
    console.log('   → 본문: "새롭게 도착한 참가자들의 프로필 북을 확인해보세요"\n');

    console.log('═'.repeat(60));
    console.log('✅ 모든 테스트 알림 전송 완료!');
    console.log('═'.repeat(60));
    console.log('\n💡 확인 방법:');
    console.log('   1. 휴대폰/디바이스에서 알림 3개 수신 확인');
    console.log('   2. 앱 내 채팅/공지사항에서 테스트 메시지 확인');
    console.log('   3. Firebase Console에서 Functions 로그 확인\n');

  } catch (error) {
    console.error('\n❌ 테스트 실행 중 오류 발생:', error);
    process.exit(1);
  }
}

sendTestNotifications()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ 예상치 못한 오류:', error);
    process.exit(1);
  });
