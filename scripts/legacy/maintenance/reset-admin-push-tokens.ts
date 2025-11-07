#!/usr/bin/env node
/**
 * Admin 푸시 토큰 제거 스크립트
 *
 * admin 참가자의 모든 푸시 관련 필드를 제거합니다:
 * - pushToken (legacy)
 * - pushTokenUpdatedAt (legacy)
 * - pushTokens (FCM 배열)
 * - webPushSubscriptions (Web Push 배열)
 * - pushNotificationEnabled (플래그)
 *
 * 실행 방법:
 * npm run reset:admin-push
 */

import * as admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { join } from 'path';
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

const db = admin.firestore().database('seoul');

const argv = yargs(hideBin(process.argv))
  .option('dry-run', {
    type: 'boolean',
    default: false,
    describe: 'Perform read-only checks without updating Firestore',
  })
  .help()
  .alias('h', 'help')
  .parseSync();

async function resetAdminPushTokens() {
  const { dryRun } = argv;

  console.log('\n🧹 Admin 푸시 토큰 제거 시작...\n');
  if (dryRun) {
    console.log('🔍 Dry-run mode enabled. No changes will be written.\n');
  }

  try {
    // admin 참가자 찾기 (ID로 직접 조회)
    const adminDoc = await db.collection('participants').doc('admin').get();

    if (!adminDoc.exists) {
      console.log('❌ admin 참가자를 찾을 수 없습니다.');
      return;
    }

    const adminId = adminDoc.id;
    const adminData = adminDoc.data()!;

    console.log(`📋 Admin 참가자 발견: ${adminId}`);
    console.log(`   이름: ${adminData.name}`);
    console.log(`   전화번호: ${adminData.phoneNumber}\n`);

    // 현재 상태 확인
    console.log('📊 현재 푸시 토큰 상태:');
    console.log(`   pushToken (legacy): ${adminData.pushToken ? '있음' : '없음'}`);
    console.log(`   pushTokens (FCM): ${adminData.pushTokens?.length || 0}개`);
    console.log(`   webPushSubscriptions: ${adminData.webPushSubscriptions?.length || 0}개`);
    console.log(`   pushNotificationEnabled: ${adminData.pushNotificationEnabled || false}\n`);

    // 모든 푸시 관련 필드 제거
    const updates: any = {
      pushNotificationEnabled: false,
      pushTokens: [],
      webPushSubscriptions: [],
    };

    // 레거시 필드가 있으면 제거
    if (adminData.pushToken !== undefined) {
      updates.pushToken = admin.firestore.FieldValue.delete();
      updates.pushTokenUpdatedAt = admin.firestore.FieldValue.delete();
    }

    if (!dryRun) {
      await adminDoc.ref.update(updates);
    }

    console.log('✅ Admin 푸시 토큰 제거 완료!');
    console.log('\n📋 제거된 내용:');
    if (adminData.pushToken) {
      console.log('   - pushToken (legacy) 제거됨');
      console.log('   - pushTokenUpdatedAt (legacy) 제거됨');
    }
    if (adminData.pushTokens?.length > 0) {
      console.log(`   - pushTokens ${adminData.pushTokens.length}개 제거됨`);
    }
    if (adminData.webPushSubscriptions?.length > 0) {
      console.log(`   - webPushSubscriptions ${adminData.webPushSubscriptions.length}개 제거됨`);
    }
    console.log('   - pushNotificationEnabled = false\n');

    console.log('🎉 이제 앱에서 admin으로 로그인하여 푸시 알림을 새로 활성화할 수 있습니다.\n');
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  }
}

// 실행
resetAdminPushTokens()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ 예상치 못한 오류:', error);
    process.exit(1);
  });
