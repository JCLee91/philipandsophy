import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin.firestore();
  }

  const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (serviceAccountEnv) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(serviceAccountEnv)),
    });
  } else {
    throw new Error('Firebase 인증 정보가 없습니다.');
  }
  return admin.firestore();
}

async function checkAdminCohorts() {
  const db = initializeFirebaseAdmin();
  const adminIds = ['admin', 'admin2', 'admin3'];

  console.log('관리자 cohortId 확인:\n');

  for (const adminId of adminIds) {
    const doc = await db.collection('participants').doc(adminId).get();
    if (doc.exists) {
      const data = doc.data();
      console.log(`${adminId} (${data.name}):`);
      console.log(`  cohortId: ${data.cohortId || '❌ 없음'}`);
      console.log(`  전화번호: ${data.phoneNumber}`);
      console.log('');
    }
  }

  process.exit(0);
}

checkAdminCohorts().catch(console.error);
