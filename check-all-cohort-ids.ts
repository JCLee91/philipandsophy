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

async function checkAllCohortIds() {
  try {
    console.log('=== 모든 유저의 cohortId 확인 ===\n');

    const usersSnapshot = await db.collection('users').get();
    console.log(`총 유저 수: ${usersSnapshot.size}명\n`);

    const cohortCounts: { [key: string]: number } = {};

    usersSnapshot.forEach(doc => {
      const data = doc.data();
      const cohortId = data.cohortId || 'undefined';

      if (!cohortCounts[cohortId]) {
        cohortCounts[cohortId] = 0;
      }
      cohortCounts[cohortId]++;
    });

    console.log('CohortId 별 인원 분포:');
    Object.entries(cohortCounts).sort((a, b) => b[1] - a[1]).forEach(([cohortId, count]) => {
      console.log(`  ${cohortId}: ${count}명`);
    });

    // 샘플 유저 몇 명 출력
    console.log('\n샘플 유저 정보 (처음 10명):');
    usersSnapshot.docs.slice(0, 10).forEach(doc => {
      const data = doc.data();
      console.log(`  ${data.name || 'No Name'} - cohortId: ${data.cohortId || 'undefined'}`);
    });

  } catch (error) {
    console.error('오류:', error);
  } finally {
    process.exit(0);
  }
}

checkAllCohortIds();
