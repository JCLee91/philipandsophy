#!/usr/bin/env node
/**
 * Admin 푸시 알림 테스트 스크립트
 *
 * 실제 전송 로직에 맞춰 3종류의 테스트 알림을 2초 간격으로 전송:
 * 1. DM 알림 (messages 컬렉션 생성)
 * 2. 공지사항 알림 (notices 컬렉션 생성)
 * 3. 매칭 알림 (HTTP POST - 실제로는 매칭 데이터 필요하므로 시뮬레이션)
 *
 * 실행 방법:
 * npm run test:send-push-admin
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

const db = admin.firestore().database('seoul');

/**
 * 딜레이 헬퍼
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 1. DM 알림 테스트
 */
async function sendTestDMNotification() {
  console.log('\n📨 1/3: DM 알림 전송 중...');

  try {
    // 실제 존재하는 참가자 찾기 (admin이 아닌 첫 번째 참가자)
    const participantsSnapshot = await db.collection('participants')
      .where('isAdministrator', '!=', true)
      .limit(1)
      .get();

    let senderId = 'admin'; // 기본값: admin 자신
    let senderName = 'JC';

    if (!participantsSnapshot.empty) {
      const firstParticipant = participantsSnapshot.docs[0];
      senderId = firstParticipant.id;
      senderName = firstParticipant.data().name || '참가자';
    }

    // messages 컬렉션에 테스트 메시지 생성
    const testMessageRef = db.collection('messages').doc();

    await testMessageRef.set({
      senderId,
      receiverId: 'admin', // admin 참가자 대상
      content: '[테스트] DM 푸시 알림 테스트 메시지입니다. 정상적으로 수신되었나요?',
      conversationId: `${senderId}-admin`,
      isRead: false,
      createdAt: admin.firestore.Timestamp.now(),
    });

    console.log(`   ✅ DM 알림 트리거 완료 (messageId: ${testMessageRef.id})`);
    console.log(`   → Firebase Functions onMessageCreated 트리거됨`);
    console.log(`   → 발신자: ${senderName} (${senderId})`);
  } catch (error) {
    console.error('   ❌ DM 알림 전송 실패:', error);
  }
}

/**
 * 2. 공지사항 알림 테스트
 */
async function sendTestNoticeNotification() {
  console.log('\n📢 2/3: 공지사항 알림 전송 중...');

  try {
    // admin의 cohortId 조회
    const adminDoc = await db.collection('participants').doc('admin').get();
    if (!adminDoc.exists) {
      throw new Error('admin 참가자를 찾을 수 없습니다');
    }

    const adminData = adminDoc.data()!;
    const cohortId = adminData.cohortId || '1';

    // notices 컬렉션에 테스트 공지 생성
    const testNoticeRef = db.collection('notices').doc();

    await testNoticeRef.set({
      cohortId,
      author: '시스템 테스트',
      content: '[테스트] 공지사항 푸시 알림 테스트입니다. 모든 참가자에게 전송되는 알림이 정상 작동하는지 확인 중입니다.',
      isPinned: false,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    });

    console.log(`   ✅ 공지사항 알림 트리거 완료 (noticeId: ${testNoticeRef.id})`);
    console.log(`   → Firebase Functions onNoticeCreated 트리거됨 (cohort: ${cohortId})`);
  } catch (error) {
    console.error('   ❌ 공지사항 알림 전송 실패:', error);
  }
}

/**
 * 3. 오늘의 프로필북 알림 테스트 (시뮬레이션)
 */
async function sendTestMatchingNotification() {
  console.log('\n📚 3/3: 오늘의 프로필북 알림 시뮬레이션 중...');

  try {
    // 실제 프로필북 알림은 HTTP POST로 보내지만, 여기서는 DM으로 시뮬레이션
    const testMessageRef = db.collection('messages').doc();

    await testMessageRef.set({
      senderId: 'admin', // admin을 발신자로 사용 (시스템 메시지처럼 표시)
      receiverId: 'admin', // admin 참가자 대상
      content: '[테스트] 새롭게 도착한 참가자들의 프로필 북을 확인해보세요',
      conversationId: 'admin-admin',
      isRead: false,
      createdAt: admin.firestore.Timestamp.now(),
    });

    console.log(`   ✅ 프로필북 알림 시뮬레이션 완료 (messageId: ${testMessageRef.id})`);
    console.log('   → 제목: "오늘의 프로필북이 도착했습니다"');
    console.log('   → 본문: "새롭게 도착한 참가자들의 프로필 북을 확인해보세요"');
    console.log('   ℹ️  실제 프로필북 알림은 sendMatchingNotifications HTTP 엔드포인트 사용');
  } catch (error) {
    console.error('   ❌ 프로필북 알림 전송 실패:', error);
  }
}

/**
 * 메인 테스트 함수
 */
async function runPushNotificationTests() {
  console.log('\n🚀 Admin 푸시 알림 테스트 시작');
  console.log('═'.repeat(60));
  console.log('대상: admin 참가자');
  console.log('간격: 2초');
  console.log('총 3가지 알림 타입 테스트');
  console.log('═'.repeat(60));

  try {
    // Admin 푸시 토큰 확인
    const adminDoc = await db.collection('participants').doc('admin').get();
    if (!adminDoc.exists) {
      console.error('\n❌ admin 참가자를 찾을 수 없습니다.');
      return;
    }

    const adminData = adminDoc.data()!;
    const pushTokensCount = adminData.pushTokens?.length || 0;
    const webPushCount = adminData.webPushSubscriptions?.length || 0;
    const isPushEnabled = adminData.pushNotificationEnabled;

    console.log('\n📊 Admin 푸시 상태:');
    console.log(`   FCM 토큰: ${pushTokensCount}개`);
    console.log(`   Web Push 구독: ${webPushCount}개`);
    console.log(`   알림 활성화: ${isPushEnabled ? '✅ 활성화됨' : '❌ 비활성화됨'}`);

    if (!isPushEnabled && pushTokensCount === 0 && webPushCount === 0) {
      console.log('\n⚠️  경고: admin이 푸시 알림을 활성화하지 않았습니다.');
      console.log('   앱에서 설정 → 푸시 알림 ON 후 다시 시도하세요.\n');
      return;
    }

    // 테스트 시작
    console.log('\n⏰ 테스트 시작...\n');

    // 1. DM 알림
    await sendTestDMNotification();
    await delay(2000);

    // 2. 공지사항 알림
    await sendTestNoticeNotification();
    await delay(2000);

    // 3. 매칭 알림 (시뮬레이션)
    await sendTestMatchingNotification();

    console.log('\n═'.repeat(60));
    console.log('✅ 모든 테스트 알림 전송 완료!');
    console.log('═'.repeat(60));
    console.log('\n💡 확인 방법:');
    console.log('   1. 휴대폰/디바이스에서 알림 3개 수신 확인');
    console.log('   2. 앱 내 채팅/공지사항에서 테스트 메시지 확인');
    console.log('   3. Firebase Console에서 Functions 로그 확인');
    console.log('\n');
  } catch (error) {
    console.error('\n❌ 테스트 실행 중 오류 발생:', error);
    process.exit(1);
  }
}

// 실행
runPushNotificationTests()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ 예상치 못한 오류:', error);
    process.exit(1);
  });
