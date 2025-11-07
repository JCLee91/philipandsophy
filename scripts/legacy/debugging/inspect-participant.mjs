#!/usr/bin/env node
/**
 * Inspect Participant Data
 *
 * Fetches and displays all fields of a participant document
 *
 * Usage:
 *   node scripts/inspect-participant.mjs <participantId>
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
  } catch (error) {
    console.error('❌ Failed to load firebase-service-account.json');
    process.exit(1);
  }
}

const db = getFirestore(admin.app(), 'seoul');

async function inspectParticipant(participantId) {
  try {
    const participantRef = db.collection('participants').doc(participantId);
    const participantSnap = await participantRef.get();

    if (!participantSnap.exists) {
      console.error('❌ Participant not found:', participantId);
      process.exit(1);
    }

    const data = participantSnap.data();

    console.log('\n📋 Participant Data Inspection\n');
    console.log('='.repeat(80));
    console.log(`Participant ID: ${participantId}`);
    console.log('='.repeat(80));

    // Pretty print all fields
    console.log('\n📌 FULL DATA (JSON):\n');
    console.log(JSON.stringify(data, null, 2));

    console.log('\n');
    console.log('='.repeat(80));
    console.log('🔍 FIELD ANALYSIS');
    console.log('='.repeat(80));

    // Analyze each field
    const fields = Object.keys(data).sort();

    fields.forEach((field) => {
      const value = data[field];
      const type = Array.isArray(value) ? 'array' : typeof value;
      const length = Array.isArray(value) ? value.length : (typeof value === 'string' ? value.length : '-');

      console.log(`\n📎 ${field}`);
      console.log(`   Type: ${type}`);
      if (Array.isArray(value)) {
        console.log(`   Length: ${length} items`);
        if (length > 0) {
          console.log(`   Items:`);
          value.forEach((item, index) => {
            if (typeof item === 'object') {
              console.log(`      ${index + 1}. ${JSON.stringify(item, null, 10)}`);
            } else {
              console.log(`      ${index + 1}. ${item}`);
            }
          });
        }
      } else if (typeof value === 'object' && value !== null) {
        console.log(`   Value: ${JSON.stringify(value, null, 6)}`);
      } else {
        console.log(`   Value: ${value}`);
      }
    });

    // Check for issues
    console.log('\n');
    console.log('='.repeat(80));
    console.log('⚠️  POTENTIAL ISSUES');
    console.log('='.repeat(80));

    const issues = [];

    // Check pushTokens duplicates
    const pushTokens = data.pushTokens || [];
    if (pushTokens.length > 1) {
      const deviceIds = pushTokens.map(t => t.deviceId);
      const uniqueDeviceIds = [...new Set(deviceIds)];
      const tokens = pushTokens.map(t => t.token);
      const uniqueTokens = [...new Set(tokens)];

      if (deviceIds.length !== uniqueDeviceIds.length) {
        issues.push(`Duplicate deviceIds in pushTokens: ${deviceIds.length} tokens, ${uniqueDeviceIds.length} unique devices`);
      }
      if (tokens.length !== uniqueTokens.length) {
        issues.push(`Duplicate tokens in pushTokens: ${tokens.length} tokens, ${uniqueTokens.length} unique values`);
      }
    }

    // Check webPushSubscriptions duplicates
    const webPushSubs = data.webPushSubscriptions || [];
    if (webPushSubs.length > 1) {
      const endpoints = webPushSubs.map(s => s.endpoint);
      const uniqueEndpoints = [...new Set(endpoints)];

      if (endpoints.length !== uniqueEndpoints.length) {
        issues.push(`Duplicate endpoints in webPushSubscriptions: ${endpoints.length} subs, ${uniqueEndpoints.length} unique`);
      }
    }

    // Check if FCM and Web Push both exist (should only have one)
    if (pushTokens.length > 0 && webPushSubs.length > 0) {
      issues.push(`Both FCM tokens (${pushTokens.length}) AND Web Push (${webPushSubs.length}) exist - should use only one`);
    }

    // Check legacy fields
    if (data.pushToken) {
      issues.push(`Legacy 'pushToken' field exists (use pushTokens array instead)`);
    }

    if (issues.length === 0) {
      console.log('\n✅ No issues found!\n');
    } else {
      console.log('\n');
      issues.forEach((issue, index) => {
        console.log(`${index + 1}. ⚠️  ${issue}`);
      });
      console.log('\n');
    }

    console.log('='.repeat(80));
    console.log('\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

const participantId = process.argv[2];

if (!participantId) {
  console.error('❌ Usage: node scripts/inspect-participant.mjs <participantId>\n');
  process.exit(1);
}

inspectParticipant(participantId)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
