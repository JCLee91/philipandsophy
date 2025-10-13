import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const serviceAccount = require('./firebase-service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

async function checkByPhone() {
  const phones = ['01000000001', '42633467921', '42627615193'];
  
  console.log('🔍 전화번호로 참가자 조회 (로그인 시뮬레이션):\n');
  
  for (const phone of phones) {
    const snapshot = await db.collection('participants')
      .where('phoneNumber', '==', phone)
      .get();
    
    if (snapshot.empty) {
      console.log(`❌ 전화번호 ${phone}: 찾을 수 없음 (로그인 실패!)`);
    } else {
      const doc = snapshot.docs[0];
      const data = doc.data();
      console.log(`✅ 전화번호 ${phone}:`);
      console.log(`   ID: ${doc.id}`);
      console.log(`   이름: ${data.name}`);
      console.log(`   cohortId: ${data.cohortId}`);
    }
    console.log('');
  }
  
  process.exit(0);
}

checkByPhone().catch(console.error);
