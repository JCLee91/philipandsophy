/**
 * Remove legacy push token fields from all participants
 *
 * Legacy fields to remove:
 * - pushToken (string)
 * - pushTokenUpdatedAt (Timestamp)
 *
 * Modern fields (keep):
 * - pushTokens[] (array)
 * - webPushSubscriptions[] (array)
 */

import * as admin from 'firebase-admin';

// Firebase Admin 초기화
const serviceAccount = require('../firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function removeLegacyPushFields() {
  console.log('🧹 Legacy push token 필드 제거 시작...\n');

  const participantsRef = db.collection('participants');
  const snapshot = await participantsRef.get();

  console.log(`📊 전체 참가자: ${snapshot.size}명\n`);

  let removedCount = 0;
  let skippedCount = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const participantId = doc.id;

    // Legacy 필드 존재 여부 확인
    const hasLegacyPushToken = data.pushToken !== undefined;
    const hasLegacyUpdatedAt = data.pushTokenUpdatedAt !== undefined;

    if (!hasLegacyPushToken && !hasLegacyUpdatedAt) {
      skippedCount++;
      continue;
    }

    // Legacy 필드 제거
    const updates: Record<string, any> = {};

    if (hasLegacyPushToken) {
      updates.pushToken = admin.firestore.FieldValue.delete();
    }

    if (hasLegacyUpdatedAt) {
      updates.pushTokenUpdatedAt = admin.firestore.FieldValue.delete();
    }

    await doc.ref.update(updates);

    removedCount++;
    console.log(`✅ ${participantId}: Legacy 필드 제거 (${Object.keys(updates).join(', ')})`);
  }

  console.log('\n📊 결과:');
  console.log(`  제거: ${removedCount}명`);
  console.log(`  스킵: ${skippedCount}명 (이미 없음)`);
  console.log('\n✅ Legacy push token 필드 제거 완료!\n');
}

removeLegacyPushFields()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ 에러 발생:', error);
    process.exit(1);
  });
