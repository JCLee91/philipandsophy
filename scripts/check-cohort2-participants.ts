/**
 * 2기 참가자 확인 스크립트
 */

import * as admin from 'firebase-admin';

// Firebase Admin 초기화
if (!admin.apps.length) {
  const serviceAccount = require('../firebase-service-account.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore().database('seoul');

async function main() {
  console.log('🔍 2기 참가자 확인...\n');

  // 1. 2기 코호트 ID 조회
  const cohortsSnapshot = await db.collection('cohorts').where('name', '==', '2기').get();

  if (cohortsSnapshot.empty) {
    console.error('❌ 2기 코호트를 찾을 수 없습니다.');
    return;
  }

  const cohort2Id = cohortsSnapshot.docs[0].id;
  console.log(`✅ 2기 코호트 ID: ${cohort2Id}\n`);

  // 2. 2기 참가자 조회
  const participantsSnapshot = await db
    .collection('participants')
    .where('cohortId', '==', cohort2Id)
    .get();

  console.log(`✅ 2기 참가자 수: ${participantsSnapshot.size}\n`);

  // 3. 참가자 이름 출력
  console.log('📋 2기 참가자 목록:\n');
  participantsSnapshot.docs.forEach((doc, index) => {
    const data = doc.data();
    console.log(`${index + 1}. ID: ${doc.id}, 이름: ${data.name}`);
  });
}

main().catch(console.error);
