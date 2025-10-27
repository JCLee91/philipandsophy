/**
 * Check admin push notification tokens
 * 관리자 계정의 푸시 토큰 상태 확인
 */

import * as admin from 'firebase-admin';
import * as serviceAccount from '../firebase-service-account.json';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
});

const db = admin.firestore();

async function checkAdminPushTokens() {
  console.log('🔍 관리자 푸시 토큰 상태 확인\n');

  // Check admin, admin2, admin3
  const adminIds = ['admin', 'admin2', 'admin3'];

  for (const adminId of adminIds) {
    try {
      const doc = await db.collection('participants').doc(adminId).get();

      if (!doc.exists) {
        console.log(`❌ ${adminId}: 문서를 찾을 수 없음`);
        continue;
      }

      const data = doc.data();
      console.log(`\n📱 ${adminId} (${data?.name || 'Unknown'}):`);
      console.log(`  - cohortId: ${data?.cohortId ?? 'undefined'}`);
      console.log(`  - isAdministrator: ${data?.isAdministrator ?? 'undefined'}`);
      console.log(`  - isSuperAdmin: ${data?.isSuperAdmin ?? 'undefined'}`);
      console.log(`  - pushNotificationEnabled: ${data?.pushNotificationEnabled ?? 'undefined'}`);
      console.log(`  - pushTokens: ${data?.pushTokens?.length || 0}개`);
      console.log(`  - webPushSubscriptions: ${data?.webPushSubscriptions?.length || 0}개`);

      if (data?.pushTokens && data.pushTokens.length > 0) {
        data.pushTokens.forEach((entry: any, index: number) => {
          console.log(`    [${index + 1}] ${entry.token.substring(0, 30)}... (${entry.deviceId})`);
        });
      }

      if (data?.webPushSubscriptions && data.webPushSubscriptions.length > 0) {
        data.webPushSubscriptions.forEach((sub: any, index: number) => {
          console.log(`    [WP${index + 1}] ${sub.endpoint.substring(0, 50)}... (${sub.deviceId})`);
        });
      }

      if (
        (!data?.pushTokens || data.pushTokens.length === 0) &&
        (!data?.webPushSubscriptions || data.webPushSubscriptions.length === 0)
      ) {
        console.log(`  ⚠️  푸시 토큰이 없습니다! 공지 알람을 받을 수 없습니다.`);
      }
    } catch (error) {
      console.error(`❌ ${adminId} 확인 중 오류:`, error);
    }
  }

  console.log('\n✅ 확인 완료');
  process.exit(0);
}

checkAdminPushTokens().catch((error) => {
  console.error('❌ 오류 발생:', error);
  process.exit(1);
});
