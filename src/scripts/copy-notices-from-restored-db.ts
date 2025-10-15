#!/usr/bin/env tsx

/**
 * restored-db에서 notices를 읽어서 (default) DB로 복사
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

const serviceAccountPath = path.join(process.cwd(), 'firebase-service-account.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const firestore = admin.firestore();

async function copyNotices() {
  console.log('📋 restored-db에서 notices 읽기 시작...\n');

  // restored-db에서 notices 조회 (별도 앱 초기화)
  const restoredApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  }, 'restored-app');

  const restoredDb = admin.firestore(restoredApp);
  restoredDb.settings({ databaseId: 'restored-db' });

  const noticesSnapshot = await restoredDb.collection('notices').get();

  console.log(`📊 restored-db에서 발견된 notices: ${noticesSnapshot.size}개\n`);

  if (noticesSnapshot.empty) {
    console.log('❌ restored-db에 notices가 없습니다.');
    return;
  }

  // (default) DB로 복사 (기본 앱 사용)
  const defaultDb = firestore; // 이미 초기화된 기본 앱
  let copiedCount = 0;

  for (const doc of noticesSnapshot.docs) {
    const data = doc.data();

    console.log(`📝 (default) DB로 복사 중: ${doc.id}`);
    console.log(`   Author: ${data.author}`);
    console.log(`   Content: ${data.content?.substring(0, 50)}...`);

    // (default) DB에 동일한 ID로 저장
    await defaultDb.collection('notices').doc(doc.id).set(data);

    console.log(`   ✅ (default) DB에 저장 완료\n`);
    copiedCount++;
  }

  console.log(`\n🎉 총 ${copiedCount}개의 notices를 (default) DB로 복구 완료!`);
}

copyNotices()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ 실패:', err);
    process.exit(1);
  });
