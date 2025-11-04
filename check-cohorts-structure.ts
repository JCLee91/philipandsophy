import * as admin from 'firebase-admin';
import * as fs from 'fs';

const serviceAccount = JSON.parse(
  fs.readFileSync('./firebase-service-account.json', 'utf8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://philipandsophy.firebaseio.com'
});

const db = admin.firestore();

async function checkCohortsStructure() {
  try {
    console.log('=== Cohorts 컬렉션 구조 확인 ===\n');

    const cohortsSnapshot = await db.collection('cohorts').get();
    console.log(`총 cohort 문서 수: ${cohortsSnapshot.size}개\n`);

    cohortsSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`문서 ID: ${doc.id}`);
      console.log(`데이터:`, JSON.stringify(data, null, 2));
      console.log('---\n');
    });

    // 모든 유저의 cohort 정보도 확인
    console.log('\n=== 유저별 Cohort 정보 샘플 (첫 5명) ===\n');
    const usersSnapshot = await db.collection('users').limit(5).get();

    usersSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`유저 ID: ${doc.id}`);
      console.log(`이름: ${data.name}`);
      console.log(`Cohort ID: ${data.cohortId}`);
      console.log('---\n');
    });

  } catch (error) {
    console.error('오류:', error);
  } finally {
    process.exit(0);
  }
}

checkCohortsStructure();
