/**
 * Cohort별 참가자 확인 스크립트
 */

import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin.firestore();
  }

  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (serviceAccountEnv) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(serviceAccountEnv)),
    });
  } else if (serviceAccountPath) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccountPath),
    });
  } else {
    throw new Error('Firebase 인증 정보가 없습니다.');
  }

  return admin.firestore();
}

async function checkCohortParticipants() {
  console.log('🔍 Cohort별 참가자 확인 시작...\n');

  const db = initializeFirebaseAdmin();

  // 모든 cohort 조회
  const cohortsSnapshot = await db.collection('cohorts').get();
  console.log(`📚 총 ${cohortsSnapshot.size}개 Cohort 발견\n`);

  for (const cohortDoc of cohortsSnapshot.docs) {
    const cohortData = cohortDoc.data();
    console.log(`🏷️  Cohort: ${cohortDoc.id}`);
    console.log(`   이름: ${cohortData.name || '(없음)'}`);
    console.log(`   접근 코드: ${cohortData.accessCode || '(없음)'}`);

    // 해당 cohort의 참가자 조회
    const participantsSnapshot = await db
      .collection('participants')
      .where('cohortId', '==', cohortDoc.id)
      .get();

    console.log(`   참가자 수: ${participantsSnapshot.size}명`);

    if (participantsSnapshot.size > 0) {
      console.log(`   참가자 목록:`);
      participantsSnapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`     ${index + 1}. ${data.name} (ID: ${doc.id})`);
      });
    }

    console.log('');
  }

  console.log('✅ 확인 완료');
  process.exit(0);
}

checkCohortParticipants().catch((error) => {
  console.error('❌ 오류:', error);
  process.exit(1);
});
