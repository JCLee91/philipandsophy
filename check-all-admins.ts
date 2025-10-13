import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const serviceAccount = require('./firebase-service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

async function checkAllAdmins() {
  console.log('🔍 모든 관리자 계정 확인:\n');
  
  const adminIds = ['admin', 'admin2', 'admin3'];
  
  for (const adminId of adminIds) {
    const doc = await db.collection('participants').doc(adminId).get();
    if (doc.exists) {
      const data = doc.data();
      console.log(`✅ ${adminId} 존재:`);
      console.log(`   이름: ${data.name}`);
      console.log(`   전화번호: ${data.phoneNumber}`);
      console.log('');
    } else {
      console.log(`❌ ${adminId} 없음!\n`);
    }
  }
  
  process.exit(0);
}

checkAllAdmins().catch(console.error);
