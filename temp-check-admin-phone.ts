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

async function checkAdminPhones() {
  const db = initializeFirebaseAdmin();
  
  const adminIds = ['admin', 'admin2', 'admin3'];
  
  console.log('🔍 관리자 전화번호 확인:\n');
  
  for (const adminId of adminIds) {
    const doc = await db.collection('participants').doc(adminId).get();
    if (doc.exists) {
      const data = doc.data();
      console.log(`${adminId}:`);
      console.log(`  이름: ${data?.name}`);
      console.log(`  전화번호: "${data?.phoneNumber}"`);
      console.log(`  전화번호 길이: ${data?.phoneNumber?.length || 0}`);
      console.log(`  isAdmin: ${data?.isAdmin}`);
      console.log('');
    } else {
      console.log(`${adminId}: 문서 없음\n`);
    }
  }
  
  process.exit(0);
}

checkAdminPhones().catch(console.error);
