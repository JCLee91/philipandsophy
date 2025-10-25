/**
 * 2기 멤버 이미지 업로드 검증 스크립트
 */

import * as admin from 'firebase-admin';

// Firebase Admin 초기화
if (!admin.apps.length) {
  const serviceAccount = require('../firebase-service-account.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function main() {
  console.log('🔍 2기 멤버 이미지 검증...\n');

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

  // 3. 이미지 URL 확인
  console.log('📋 이미지 업로드 상태:\n');

  let profileImageCount = 0;
  let circleImageCount = 0;
  let missingProfileImages: string[] = [];
  let missingCircleImages: string[] = [];

  participantsSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    const name = data.name;
    const profileImage = data.profileImage;
    const profileImageCircle = data.profileImageCircle;

    console.log(`👤 ${name} (${doc.id})`);

    if (profileImage) {
      console.log(`  ✅ 프로필 이미지: ${profileImage.substring(0, 80)}...`);
      profileImageCount++;
    } else {
      console.log(`  ❌ 프로필 이미지 없음`);
      missingProfileImages.push(name);
    }

    if (profileImageCircle) {
      console.log(`  ✅ 원형 이미지: ${profileImageCircle.substring(0, 80)}...`);
      circleImageCount++;
    } else {
      console.log(`  ❌ 원형 이미지 없음`);
      missingCircleImages.push(name);
    }

    console.log();
  });

  // 4. 결과 요약
  console.log('📊 업로드 결과 요약:\n');
  console.log(`총 참가자: ${participantsSnapshot.size}`);
  console.log(`프로필 이미지: ${profileImageCount}/${participantsSnapshot.size} (${((profileImageCount / participantsSnapshot.size) * 100).toFixed(1)}%)`);
  console.log(`원형 이미지: ${circleImageCount}/${participantsSnapshot.size} (${((circleImageCount / participantsSnapshot.size) * 100).toFixed(1)}%)\n`);

  if (missingProfileImages.length > 0) {
    console.log('⚠️  프로필 이미지 누락:');
    missingProfileImages.forEach(name => console.log(`  - ${name}`));
    console.log();
  }

  if (missingCircleImages.length > 0) {
    console.log('⚠️  원형 이미지 누락:');
    missingCircleImages.forEach(name => console.log(`  - ${name}`));
    console.log();
  }

  if (missingProfileImages.length === 0 && missingCircleImages.length === 0) {
    console.log('🎉 모든 이미지가 정상적으로 업로드되었습니다!');
  }
}

main().catch(console.error);
