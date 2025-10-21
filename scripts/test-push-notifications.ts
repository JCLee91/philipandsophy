#!/usr/bin/env node
/**
 * Push Notification Test Script
 *
 * Tests push notification system:
 * 1. Verify platform detection (Android = FCM, iOS = Web Push)
 * 2. Test token storage locations
 * 3. Verify multi-device support
 * 4. Check duplicate notification prevention
 * 5. Validate pushNotificationEnabled flag consistency
 *
 * 실행 방법:
 * npm run test:push-system
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

interface TestResult {
  category: string;
  test: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  participantId?: string;
}

const results: TestResult[] = [];

/**
 * Add test result
 */
function addResult(category: string, test: string, status: 'PASS' | 'FAIL' | 'WARN', message: string, participantId?: string) {
  results.push({ category, test, status, message, participantId });
}

/**
 * Print test results
 */
function printResults() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📋 PUSH NOTIFICATION SYSTEM TEST RESULTS');
  console.log('═══════════════════════════════════════════════════════════\n');

  const categories = [...new Set(results.map((r) => r.category))];

  for (const category of categories) {
    console.log(`\n${category}`);
    console.log('─'.repeat(60));

    const categoryResults = results.filter((r) => r.category === category);

    for (const result of categoryResults) {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
      console.log(`${icon} ${result.test}`);
      console.log(`   ${result.message}`);
      if (result.participantId) {
        console.log(`   Participant: ${result.participantId}`);
      }
    }
  }

  // Summary
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  const warned = results.filter((r) => r.status === 'WARN').length;

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📊 SUMMARY');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚠️  Warnings: ${warned}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  if (failed === 0) {
    console.log('🎉 All tests passed!\n');
  } else {
    console.log('🚨 Some tests failed. Please review the results above.\n');
  }
}

/**
 * Test 1: Schema Validation
 */
async function testSchemaValidation() {
  const category = '1️⃣  SCHEMA VALIDATION';

  const participantsRef = db.collection('participants');
  const snapshot = await participantsRef.get();

  let validCount = 0;
  let invalidCount = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const participantId = doc.id;

    // Check for legacy fields
    if (data.pushToken !== undefined) {
      addResult(
        category,
        'Legacy pushToken field found',
        'FAIL',
        'Should be migrated to pushTokens array',
        participantId
      );
      invalidCount++;
    }

    // Validate pushTokens array
    if (data.pushTokens && Array.isArray(data.pushTokens)) {
      for (const token of data.pushTokens) {
        if (!token.deviceId || !token.token || !token.type || !token.updatedAt) {
          addResult(
            category,
            'Invalid pushTokens entry',
            'FAIL',
            'Missing required fields (deviceId, token, type, updatedAt)',
            participantId
          );
          invalidCount++;
        }

        if (token.type !== 'fcm' && token.type !== 'webpush') {
          addResult(
            category,
            'Invalid token type',
            'FAIL',
            `Type must be 'fcm' or 'webpush', got '${token.type}'`,
            participantId
          );
          invalidCount++;
        }
      }
    }

    // Validate webPushSubscriptions array
    if (data.webPushSubscriptions && Array.isArray(data.webPushSubscriptions)) {
      for (const sub of data.webPushSubscriptions) {
        if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth || !sub.deviceId || !sub.createdAt) {
          addResult(
            category,
            'Invalid webPushSubscriptions entry',
            'FAIL',
            'Missing required fields (endpoint, keys, deviceId, createdAt)',
            participantId
          );
          invalidCount++;
        }
      }
    }

    validCount++;
  }

  if (invalidCount === 0) {
    addResult(category, 'All schemas valid', 'PASS', `Validated ${validCount} participants`);
  }
}

/**
 * Test 2: Storage Location Validation
 */
async function testStorageLocations() {
  const category = '2️⃣  STORAGE LOCATION';

  const participantsRef = db.collection('participants');
  const snapshot = await participantsRef.get();

  let fcmInPushTokens = 0;
  let webPushInWebPushSubs = 0;
  let wrongLocation = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const participantId = doc.id;

    // Check pushTokens contains only FCM
    if (data.pushTokens && Array.isArray(data.pushTokens)) {
      for (const token of data.pushTokens) {
        if (token.type === 'fcm') {
          fcmInPushTokens++;
        } else if (token.type === 'webpush') {
          addResult(
            category,
            'Web Push in wrong location',
            'FAIL',
            'Web Push token found in pushTokens (should be in webPushSubscriptions)',
            participantId
          );
          wrongLocation++;
        }
      }
    }

    // Check webPushSubscriptions exists
    if (data.webPushSubscriptions && Array.isArray(data.webPushSubscriptions)) {
      webPushInWebPushSubs += data.webPushSubscriptions.length;
    }
  }

  if (wrongLocation === 0) {
    addResult(
      category,
      'Storage locations correct',
      'PASS',
      `FCM in pushTokens: ${fcmInPushTokens}, Web Push in webPushSubscriptions: ${webPushInWebPushSubs}`
    );
  }
}

/**
 * Test 3: Duplicate Detection
 */
async function testDuplicateDetection() {
  const category = '3️⃣  DUPLICATE DETECTION';

  const participantsRef = db.collection('participants');
  const snapshot = await participantsRef.get();

  let duplicatesFound = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const participantId = doc.id;

    // Check for duplicate FCM tokens (same deviceId)
    if (data.pushTokens && Array.isArray(data.pushTokens)) {
      const deviceIds = data.pushTokens.map((t: any) => t.deviceId);
      const uniqueDeviceIds = new Set(deviceIds);

      if (deviceIds.length !== uniqueDeviceIds.size) {
        addResult(
          category,
          'Duplicate FCM tokens detected',
          'FAIL',
          `Found ${deviceIds.length - uniqueDeviceIds.size} duplicate deviceIds in pushTokens`,
          participantId
        );
        duplicatesFound++;
      }
    }

    // Check for duplicate Web Push subscriptions (same deviceId)
    if (data.webPushSubscriptions && Array.isArray(data.webPushSubscriptions)) {
      const deviceIds = data.webPushSubscriptions.map((s: any) => s.deviceId);
      const uniqueDeviceIds = new Set(deviceIds);

      if (deviceIds.length !== uniqueDeviceIds.size) {
        addResult(
          category,
          'Duplicate Web Push subscriptions detected',
          'FAIL',
          `Found ${deviceIds.length - uniqueDeviceIds.size} duplicate deviceIds in webPushSubscriptions`,
          participantId
        );
        duplicatesFound++;
      }
    }

    // Check for cross-contamination (same deviceId in both arrays)
    if (data.pushTokens && data.webPushSubscriptions) {
      const fcmDeviceIds = new Set(data.pushTokens.map((t: any) => t.deviceId));
      const webPushDeviceIds = new Set(data.webPushSubscriptions.map((s: any) => s.deviceId));

      const overlap = [...fcmDeviceIds].filter((id) => webPushDeviceIds.has(id));

      if (overlap.length > 0) {
        addResult(
          category,
          'Cross-contamination detected',
          'WARN',
          `Same deviceId found in both pushTokens and webPushSubscriptions: ${overlap.join(', ')}`,
          participantId
        );
      }
    }
  }

  if (duplicatesFound === 0) {
    addResult(category, 'No duplicates found', 'PASS', 'All deviceIds are unique per array');
  }
}

/**
 * Test 4: Flag Consistency
 */
async function testFlagConsistency() {
  const category = '4️⃣  FLAG CONSISTENCY';

  const participantsRef = db.collection('participants');
  const snapshot = await participantsRef.get();

  let inconsistentCount = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const participantId = doc.id;

    const pushTokensCount = data.pushTokens?.length || 0;
    const webPushSubsCount = data.webPushSubscriptions?.length || 0;
    const totalTokens = pushTokensCount + webPushSubsCount;

    const shouldBeEnabled = totalTokens > 0;
    const isEnabled = data.pushNotificationEnabled === true;

    if (shouldBeEnabled !== isEnabled) {
      addResult(
        category,
        'pushNotificationEnabled flag inconsistent',
        'FAIL',
        `Flag is ${isEnabled} but should be ${shouldBeEnabled} (${totalTokens} total tokens)`,
        participantId
      );
      inconsistentCount++;
    }
  }

  if (inconsistentCount === 0) {
    addResult(category, 'All flags consistent', 'PASS', 'pushNotificationEnabled matches token count');
  }
}

/**
 * Test 5: Multi-Device Support
 */
async function testMultiDeviceSupport() {
  const category = '5️⃣  MULTI-DEVICE SUPPORT';

  const participantsRef = db.collection('participants');
  const snapshot = await participantsRef.get();

  let singleDevice = 0;
  let multiDevice = 0;
  let mixedPlatform = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();

    const pushTokensCount = data.pushTokens?.length || 0;
    const webPushSubsCount = data.webPushSubscriptions?.length || 0;
    const totalDevices = pushTokensCount + webPushSubsCount;

    if (totalDevices === 0) {
      // No devices
    } else if (totalDevices === 1) {
      singleDevice++;
    } else if (totalDevices > 1) {
      multiDevice++;

      if (pushTokensCount > 0 && webPushSubsCount > 0) {
        mixedPlatform++;
      }
    }
  }

  addResult(
    category,
    'Multi-device statistics',
    'PASS',
    `Single device: ${singleDevice}, Multi-device: ${multiDevice}, Mixed platform: ${mixedPlatform}`
  );

  if (mixedPlatform > 0) {
    addResult(
      category,
      'Mixed platform users detected',
      'WARN',
      `${mixedPlatform} users have both Android (FCM) and iOS (Web Push) devices`
    );
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('\n🧪 Starting Push Notification System Tests...\n');

  try {
    await testSchemaValidation();
    await testStorageLocations();
    await testDuplicateDetection();
    await testFlagConsistency();
    await testMultiDeviceSupport();

    printResults();
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  }
}

// Run tests
runTests()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
