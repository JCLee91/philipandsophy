/**
 * Cohort별 참가자 상세 확인 (isAdmin 필드 포함)
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

async function debugParticipantsByCohort() {
  console.log('🔍 Cohort별 참가자 상세 확인 (isAdmin 필터링 시뮬레이션)\n');

  const db = initializeFirebaseAdmin();

  // 모든 cohort 조회
  const cohortsSnapshot = await db.collection('cohorts').get();
  console.log(`📚 총 ${cohortsSnapshot.size}개 Cohort 발견\n`);

  for (const cohortDoc of cohortsSnapshot.docs) {
    const cohortData = cohortDoc.data();
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🏷️  Cohort ID: ${cohortDoc.id}`);
    console.log(`   이름: ${cohortData.name || '(없음)'}`);
    console.log(`   접근 코드: ${cohortData.accessCode || '(없음)'}`);
    console.log(`   활성 상태: ${cohortData.isActive ? '✅ 활성' : '❌ 비활성'}`);

    // 해당 cohort의 참가자 조회
    const participantsSnapshot = await db
      .collection('participants')
      .where('cohortId', '==', cohortDoc.id)
      .get();

    console.log(`   전체 참가자: ${participantsSnapshot.size}명\n`);

    if (participantsSnapshot.size === 0) {
      console.log('   ⚠️  참가자가 없습니다.\n');
      continue;
    }

    // isAdmin 필터링 시뮬레이션
    const allParticipants: any[] = [];
    const adminParticipants: any[] = [];
    const regularParticipants: any[] = [];

    participantsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const participant = {
        id: doc.id,
        name: data.name,
        phoneNumber: data.phoneNumber,
        isAdmin: data.isAdmin === true,
        isAdministrator: data.isAdministrator === true,
      };

      allParticipants.push(participant);

      if (participant.isAdmin || participant.isAdministrator) {
        adminParticipants.push(participant);
      } else {
        regularParticipants.push(participant);
      }
    });

    console.log(`   📊 분류:`);
    console.log(`      관리자 (isAdmin=true 또는 isAdministrator=true): ${adminParticipants.length}명`);
    console.log(`      일반 참가자 (isAdmin=false && isAdministrator=false): ${regularParticipants.length}명\n`);

    if (adminParticipants.length > 0) {
      console.log(`   👔 관리자 목록:`);
      adminParticipants.forEach((p, index) => {
        console.log(`      ${index + 1}. ${p.name} (ID: ${p.id})`);
        console.log(`         전화번호: ${p.phoneNumber}`);
        console.log(`         isAdmin: ${p.isAdmin}, isAdministrator: ${p.isAdministrator}`);
      });
      console.log('');
    }

    if (regularParticipants.length > 0) {
      console.log(`   👥 일반 참가자 목록 (filter((p) => !p.isAdmin) 결과):`);
      regularParticipants.forEach((p, index) => {
        console.log(`      ${index + 1}. ${p.name} (ID: ${p.id})`);
      });
    } else {
      console.log(`   ⚠️  필터링 후 일반 참가자가 0명입니다!`);
      console.log(`      이 경우 모바일에서 참가자 리스트가 비어 보입니다.`);
    }

    console.log('');
  }

  console.log('✅ 확인 완료');
  process.exit(0);
}

debugParticipantsByCohort().catch((error) => {
  console.error('❌ 오류:', error);
  process.exit(1);
});
