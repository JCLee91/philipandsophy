import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./firebase-service-account.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function findSujinSubmissions() {
  console.log('=== cohort2-수진 참가자의 모든 제출물 확인 ===\n');

  // 1. Seoul DB 확인
  console.log('1. Seoul 데이터베이스:');
  const seoulDb = admin.firestore(admin.app(), 'seoul');

  const seoulQuery = await seoulDb.collection('reading_submissions')
    .where('participantId', '==', 'cohort2-수진')
    .get();

  console.log(`Seoul DB에서 발견: ${seoulQuery.size}개 문서\n`);

  if (seoulQuery.size > 0) {
    const sorted = seoulQuery.docs.sort((a, b) => {
      const dateA = a.data().submissionDate;
      const dateB = b.data().submissionDate;
      return dateB.localeCompare(dateA);
    });

    sorted.forEach(doc => {
      const data = doc.data();
      console.log(`📅 문서 ID: ${doc.id}`);
      console.log(`  - submissionDate: ${data.submissionDate}`);
      console.log(`  - status: ${data.status}`);
      console.log(`  - bookTitle: ${data.bookTitle}`);

      if (data.createdAt) {
        const createdDate = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt._seconds * 1000);
        console.log(`  - createdAt: ${createdDate.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`);
      }
      console.log('');
    });
  }

  // 2. Default DB 확인
  console.log('\n2. Default 데이터베이스:');
  const defaultDb = admin.firestore();

  const defaultQuery = await defaultDb.collection('reading_submissions')
    .where('participantId', '==', 'cohort2-수진')
    .get();

  console.log(`Default DB에서 발견: ${defaultQuery.size}개 문서\n`);

  if (defaultQuery.size > 0) {
    const sorted = defaultQuery.docs.sort((a, b) => {
      const dateA = a.data().submissionDate;
      const dateB = b.data().submissionDate;
      return dateB.localeCompare(dateA);
    });

    sorted.forEach(doc => {
      const data = doc.data();
      console.log(`📅 문서 ID: ${doc.id}`);
      console.log(`  - submissionDate: ${data.submissionDate}`);
      console.log(`  - status: ${data.status}`);
      console.log(`  - bookTitle: ${data.bookTitle}`);

      if (data.createdAt) {
        const createdDate = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt._seconds * 1000);
        console.log(`  - createdAt: ${createdDate.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`);
      }
      console.log('');
    });
  }

  // 3. 특정 문서 ID 직접 조회
  console.log('\n3. 특정 문서 ID 직접 조회:');
  const docIds = ['oMSyCM378FuykeQLkNZL', 'JIfJqKPZyA2R13cMSHa4'];

  for (const docId of docIds) {
    console.log(`\n문서 ID: ${docId}`);

    // Seoul DB
    try {
      const seoulDoc = await seoulDb.collection('reading_submissions').doc(docId).get();
      if (seoulDoc.exists) {
        const data = seoulDoc.data();
        console.log(`✅ Seoul DB에서 발견!`);
        console.log(`  - participantId: ${data.participantId}`);
        console.log(`  - submissionDate: ${data.submissionDate}`);
        console.log(`  - status: ${data.status}`);
      } else {
        console.log(`❌ Seoul DB에 없음`);
      }
    } catch (error) {
      console.log(`❌ Seoul DB 오류: ${error.message}`);
    }

    // Default DB
    try {
      const defaultDoc = await defaultDb.collection('reading_submissions').doc(docId).get();
      if (defaultDoc.exists) {
        const data = defaultDoc.data();
        console.log(`✅ Default DB에서 발견!`);
        console.log(`  - participantId: ${data.participantId}`);
        console.log(`  - submissionDate: ${data.submissionDate}`);
        console.log(`  - status: ${data.status}`);
      } else {
        console.log(`❌ Default DB에 없음`);
      }
    } catch (error) {
      console.log(`❌ Default DB 오류: ${error.message}`);
    }
  }

  process.exit(0);
}

findSujinSubmissions().catch(console.error);