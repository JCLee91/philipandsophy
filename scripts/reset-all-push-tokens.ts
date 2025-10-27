#!/usr/bin/env node
/**
 * Reset All Push Tokens Script
 *
 * 모든 유저의 푸시 알림 토큰을 완전히 제거합니다.
 * 이 스크립트를 실행하면:
 * 1. 모든 pushTokens 배열 제거
 * 2. 모든 webPushSubscriptions 배열 제거
 * 3. 레거시 pushToken 필드 제거
 * 4. pushNotificationEnabled = false로 설정
 * 5. 관련 타임스탬프 필드 제거
 *
 * 실행 후 모든 유저는 최초 진입 시 푸시 알림 프롬프트를 다시 보게 됩니다.
 *
 * 실행 방법:
 * npm run reset:push-tokens
 *
 * ⚠️ 주의: 이 작업은 되돌릴 수 없습니다!
 */

import * as admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as readline from 'readline';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

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

/**
 * 사용자 확인 프롬프트
 */
async function confirmReset(): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(
      '\n⚠️  경고: 모든 유저의 푸시 알림 토큰을 제거합니다.\n' +
        '   이 작업은 되돌릴 수 없으며, 모든 유저가 푸시 알림을 다시 설정해야 합니다.\n' +
        '   계속하시겠습니까? (yes/no): ',
      (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === 'yes');
      }
    );
  });
}

/**
 * 모든 푸시 토큰 리셋
 */
const argv = yargs(hideBin(process.argv))
  .option('dry-run', {
    type: 'boolean',
    default: false,
    describe: 'Perform a read-only run without writing changes to Firestore',
  })
  .option('force', {
    type: 'boolean',
    default: false,
    describe: 'Skip confirmation prompt even outside dry-run mode',
  })
  .help()
  .alias('h', 'help')
  .parseSync();

async function resetAllPushTokens() {
  const { dryRun, force } = argv;

  console.log('🔄 Starting push token reset...\n');

  if (!force) {
    const confirmed = await confirmReset();

    if (!confirmed) {
      console.log('\n❌ Reset cancelled by user.');
      return;
    }
  }

  if (dryRun) {
    console.log('\n🔍 Dry-run mode enabled. No changes will be written.\n');
  } else {
    console.log('\n✅ Confirmed. Starting reset process...\n');
  }

  const participantsRef = db.collection('participants');
  const snapshot = await participantsRef.get();

  let totalProcessed = 0;
  let totalReset = 0;
  let tokensRemoved = 0;
  let webPushRemoved = 0;
  let legacyFieldsRemoved = 0;

  for (const doc of snapshot.docs) {
    totalProcessed++;
    const data = doc.data();
    const participantId = doc.id;

    let needsUpdate = false;
    const updates: any = {};

    // 1. pushTokens 배열 확인 및 제거
    const pushTokens = data.pushTokens || [];
    if (Array.isArray(pushTokens) && pushTokens.length > 0) {
      updates.pushTokens = [];
      tokensRemoved += pushTokens.length;
      needsUpdate = true;
      console.log(`  🗑️  [${participantId}] Removing ${pushTokens.length} FCM token(s)`);
    }

    // 2. webPushSubscriptions 배열 확인 및 제거
    const webPushSubs = data.webPushSubscriptions || [];
    if (Array.isArray(webPushSubs) && webPushSubs.length > 0) {
      updates.webPushSubscriptions = [];
      webPushRemoved += webPushSubs.length;
      needsUpdate = true;
      console.log(`  🗑️  [${participantId}] Removing ${webPushSubs.length} Web Push subscription(s)`);
    }

    // 3. 레거시 필드 제거
    if (data.pushToken !== undefined || data.pushTokenUpdatedAt !== undefined) {
      updates.pushToken = admin.firestore.FieldValue.delete();
      updates.pushTokenUpdatedAt = admin.firestore.FieldValue.delete();
      legacyFieldsRemoved++;
      needsUpdate = true;
      console.log(`  🗑️  [${participantId}] Removing legacy pushToken field`);
    }

    // 4. pushNotificationEnabled 비활성화
    if (data.pushNotificationEnabled !== false) {
      updates.pushNotificationEnabled = false;
      needsUpdate = true;
      console.log(`  🔄 [${participantId}] Setting pushNotificationEnabled = false`);
    }

    // 업데이트 적용
    if (needsUpdate) {
      if (!dryRun) {
        await doc.ref.update(updates);
      }
      totalReset++;
      console.log(`  ✅ [${participantId}] ${dryRun ? 'Would reset (dry-run)' : 'Reset complete'}\n`);
    } else {
      console.log(`  ⏭️  [${participantId}] No tokens to reset\n`);
    }
  }

  // 요약
  console.log('\n📊 Reset Summary:');
  console.log(`  Total participants processed: ${totalProcessed}`);
  console.log(`  Total participants reset: ${totalReset}`);
  console.log(`  FCM tokens removed: ${tokensRemoved}`);
  console.log(`  Web Push subscriptions removed: ${webPushRemoved}`);
  console.log(`  Legacy fields removed: ${legacyFieldsRemoved}`);
  console.log('\n✅ Reset complete!');
  console.log('\n💡 모든 유저는 다음 앱 진입 시 푸시 알림 프롬프트를 다시 보게 됩니다.\n');
}

// 스크립트 실행
resetAllPushTokens()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Reset failed:', error);
    process.exit(1);
  });
