#!/usr/bin/env node
/**
 * Push Token Cleanup Script
 *
 * Cleans up legacy and invalid push tokens:
 * 1. Remove legacy `pushToken` single field
 * 2. Validate and clean `pushTokens` array (FCM)
 * 3. Validate and clean `webPushSubscriptions` array (Web Push)
 * 4. Remove expired/invalid tokens
 * 5. Recalculate `pushNotificationEnabled` flag
 *
 * 실행 방법:
 * npm run cleanup:push-tokens
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

interface PushTokenEntry {
  deviceId: string;
  type: 'fcm' | 'webpush';
  token: string;
  updatedAt: any;
  userAgent?: string;
  lastUsedAt?: any;
}

interface WebPushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  deviceId: string;
  userAgent: string;
  createdAt: any;
  lastUsedAt?: any;
}

/**
 * Check if token is expired (older than 90 days)
 */
function isTokenExpired(lastUsedAt: any): boolean {
  if (!lastUsedAt) return false;

  const timestamp = lastUsedAt.toDate ? lastUsedAt.toDate() : new Date(lastUsedAt);
  const daysSinceLastUse = (Date.now() - timestamp.getTime()) / (1000 * 60 * 60 * 24);

  return daysSinceLastUse > 90;
}

/**
 * Validate FCM token entry
 */
function isValidPushToken(entry: any): entry is PushTokenEntry {
  return (
    entry &&
    typeof entry.deviceId === 'string' &&
    typeof entry.token === 'string' &&
    (entry.type === 'fcm' || entry.type === 'webpush') &&
    entry.updatedAt
  );
}

/**
 * Validate Web Push subscription
 */
function isValidWebPushSubscription(sub: any): sub is WebPushSubscriptionData {
  return (
    sub &&
    typeof sub.endpoint === 'string' &&
    sub.keys &&
    typeof sub.keys.p256dh === 'string' &&
    typeof sub.keys.auth === 'string' &&
    typeof sub.deviceId === 'string' &&
    sub.createdAt
  );
}

/**
 * Main cleanup function
 */
async function cleanupPushTokens() {
  console.log('🧹 Starting push token cleanup...\n');

  const participantsRef = db.collection('participants');
  const snapshot = await participantsRef.get();

  let totalProcessed = 0;
  let totalUpdated = 0;
  let legacyTokensRemoved = 0;
  let invalidTokensRemoved = 0;
  let expiredTokensRemoved = 0;
  let invalidWebPushRemoved = 0;
  let expiredWebPushRemoved = 0;

  for (const doc of snapshot.docs) {
    totalProcessed++;
    const data = doc.data();
    const participantId = doc.id;

    let needsUpdate = false;
    const updates: any = {};

    // 1. Remove legacy pushToken field
    if (data.pushToken !== undefined) {
      updates.pushToken = admin.firestore.FieldValue.delete();
      updates.pushTokenUpdatedAt = admin.firestore.FieldValue.delete();
      legacyTokensRemoved++;
      needsUpdate = true;
      console.log(`  ❌ [${participantId}] Removing legacy pushToken field`);
    }

    // 2. Clean pushTokens array
    const pushTokens: PushTokenEntry[] = data.pushTokens || [];
    const validPushTokens = pushTokens.filter((entry) => {
      if (!isValidPushToken(entry)) {
        invalidTokensRemoved++;
        console.log(`  ❌ [${participantId}] Removing invalid token: ${entry.deviceId || 'unknown'}`);
        return false;
      }

      if (isTokenExpired(entry.lastUsedAt || entry.updatedAt)) {
        expiredTokensRemoved++;
        console.log(`  ⏰ [${participantId}] Removing expired token: ${entry.deviceId}`);
        return false;
      }

      return true;
    });

    if (validPushTokens.length !== pushTokens.length) {
      updates.pushTokens = validPushTokens;
      needsUpdate = true;
    }

    // 3. Clean webPushSubscriptions array
    const webPushSubs: WebPushSubscriptionData[] = data.webPushSubscriptions || [];
    const validWebPushSubs = webPushSubs.filter((sub) => {
      if (!isValidWebPushSubscription(sub)) {
        invalidWebPushRemoved++;
        console.log(`  ❌ [${participantId}] Removing invalid Web Push: ${sub.deviceId || 'unknown'}`);
        return false;
      }

      if (isTokenExpired(sub.lastUsedAt || sub.createdAt)) {
        expiredWebPushRemoved++;
        console.log(`  ⏰ [${participantId}] Removing expired Web Push: ${sub.deviceId}`);
        return false;
      }

      return true;
    });

    if (validWebPushSubs.length !== webPushSubs.length) {
      updates.webPushSubscriptions = validWebPushSubs;
      needsUpdate = true;
    }

    // 4. Recalculate pushNotificationEnabled
    const totalTokensRemaining = validPushTokens.length + validWebPushSubs.length;
    const shouldBeEnabled = totalTokensRemaining > 0;

    if (data.pushNotificationEnabled !== shouldBeEnabled) {
      updates.pushNotificationEnabled = shouldBeEnabled;
      needsUpdate = true;
      console.log(`  🔄 [${participantId}] Setting pushNotificationEnabled: ${shouldBeEnabled}`);
    }

    // Apply updates
    if (needsUpdate) {
      await doc.ref.update(updates);
      totalUpdated++;
      console.log(`  ✅ [${participantId}] Updated\n`);
    }
  }

  // Summary
  console.log('\n📊 Cleanup Summary:');
  console.log(`  Total participants processed: ${totalProcessed}`);
  console.log(`  Total participants updated: ${totalUpdated}`);
  console.log(`  Legacy pushToken fields removed: ${legacyTokensRemoved}`);
  console.log(`  Invalid FCM tokens removed: ${invalidTokensRemoved}`);
  console.log(`  Expired FCM tokens removed: ${expiredTokensRemoved}`);
  console.log(`  Invalid Web Push subscriptions removed: ${invalidWebPushRemoved}`);
  console.log(`  Expired Web Push subscriptions removed: ${expiredWebPushRemoved}`);
  console.log('\n✅ Cleanup complete!');
}

// Run cleanup
cleanupPushTokens()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  });
