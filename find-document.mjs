import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./firebase-service-account.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function findDocument() {
  const docId = 'oMSyCM378FuykeQLkNZL';
  console.log(`=== 문서 ID ${docId} 전체 검색 ===\n`);

  // Seoul DB의 모든 컬렉션 확인
  console.log('Seoul 데이터베이스 전체 컬렉션 검색:');
  const seoulDb = admin.firestore(admin.app(), 'seoul');

  const collections = [
    'reading_submissions',
    'participants',
    'cohorts',
    'notices',
    'messages',
    'dailyQuestions',
    'submissions'  // 혹시 다른 이름으로 있을 수도
  ];

  for (const collectionName of collections) {
    try {
      const doc = await seoulDb.collection(collectionName).doc(docId).get();
      if (doc.exists) {
        console.log(`\n✅ 발견! 컬렉션: ${collectionName}`);
        const data = doc.data();
        console.log('문서 데이터:');
        console.log(JSON.stringify(data, null, 2).substring(0, 500) + '...');
        return;
      }
    } catch (error) {
      // 컬렉션이 없을 수 있음
    }
  }

  console.log('\n❌ Seoul DB의 어떤 컬렉션에서도 찾을 수 없음\n');

  // Default DB의 모든 컬렉션 확인
  console.log('Default 데이터베이스 전체 컬렉션 검색:');
  const defaultDb = admin.firestore();

  for (const collectionName of collections) {
    try {
      const doc = await defaultDb.collection(collectionName).doc(docId).get();
      if (doc.exists) {
        console.log(`\n✅ 발견! 컬렉션: ${collectionName}`);
        const data = doc.data();
        console.log('문서 데이터:');
        console.log(JSON.stringify(data, null, 2).substring(0, 500) + '...');
        return;
      }
    } catch (error) {
      // 컬렉션이 없을 수 있음
    }
  }

  console.log('\n❌ Default DB의 어떤 컬렉션에서도 찾을 수 없음');

  // 11월 3일, 4일 데이터 다시 확인
  console.log('\n\n=== 11월 3일, 4일 데이터 재확인 ===\n');

  const dates = [
    '2024-11-03', '2024-11-04',
    '2025-11-03', '2025-11-04',
    '11/03/2024', '11/04/2024',
    '11/03/2025', '11/04/2025',
    '03-11-2024', '04-11-2024',
    '03-11-2025', '04-11-2025'
  ];

  console.log('Seoul DB 확인:');
  for (const date of dates) {
    const query = await seoulDb.collection('reading_submissions')
      .where('submissionDate', '==', date)
      .limit(1)
      .get();

    if (!query.empty) {
      console.log(`✅ "${date}" 형식으로 데이터 발견!`);
      const doc = query.docs[0];
      const data = doc.data();
      console.log(`  문서 ID: ${doc.id}`);
      console.log(`  참가자: ${data.participantId}`);
    }
  }

  console.log('\nDefault DB 확인:');
  for (const date of dates) {
    const query = await defaultDb.collection('reading_submissions')
      .where('submissionDate', '==', date)
      .limit(1)
      .get();

    if (!query.empty) {
      console.log(`✅ "${date}" 형식으로 데이터 발견!`);
      const doc = query.docs[0];
      const data = doc.data();
      console.log(`  문서 ID: ${doc.id}`);
      console.log(`  참가자: ${data.participantId}`);
    }
  }

  process.exit(0);
}

findDocument().catch(console.error);