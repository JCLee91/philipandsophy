import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  const serviceAccount = require('../firebase-service-account.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function check() {
  // 이름으로만 검색
  const byName = await db.collection('participants').where('name', '==', '정양원').get();
  console.log('이름으로 검색:', byName.size, '건');
  byName.docs.forEach(doc => {
    console.log('  -', doc.id, doc.data());
  });

  // 전화번호로 검색
  const byPhone = await db.collection('participants').where('phoneNumber', '==', '01086642851').get();
  console.log('\n전화번호로 검색:', byPhone.size, '건');
  byPhone.docs.forEach(doc => {
    console.log('  -', doc.id, doc.data());
  });
}

check().catch(console.error);
