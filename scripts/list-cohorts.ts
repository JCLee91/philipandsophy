import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

// Firebase Admin SDK 초기화
if (!admin.apps.length) {
  const serviceAccountPath = path.join(__dirname, '../firebase-service-account.json');

  if (!fs.existsSync(serviceAccountPath)) {
    console.error('❌ firebase-service-account.json not found at:', serviceAccountPath);
    process.exit(1);
  }

  try {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: 'https://philipandsophy-default-rtdb.asia-southeast1.firebasedatabase.app'
    });
    console.log('✅ Firebase Admin SDK initialized');
  } catch (error) {
    console.error('❌ Failed to read service account JSON:', error);
    process.exit(1);
  }
}

// 서울 리전 Firestore 데이터베이스 설정
const db = admin.firestore();
db.settings({
  databaseId: 'seoul',  // 서울 데이터베이스 사용
  preferRest: false
});

async function listCohorts() {
  console.log('\n📋 Listing all cohorts in Seoul DB...');
  console.log('=' + '='.repeat(50));

  try {
    const cohortsSnapshot = await db.collection('cohorts').get();

    if (cohortsSnapshot.empty) {
      console.log('❌ No cohorts found in the database');
      return;
    }

    console.log(`✅ Found ${cohortsSnapshot.size} cohort(s):\n`);

    cohortsSnapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`📁 Cohort ID: "${doc.id}"`);
      console.log(`   - Name: ${data.name || 'N/A'}`);
      console.log(`   - Code: ${data.code || 'N/A'}`);
      console.log(`   - Start Date: ${data.startDate?.toDate ? data.startDate.toDate().toLocaleDateString('ko-KR') : data.startDate || 'N/A'}`);
      console.log(`   - End Date: ${data.endDate?.toDate ? data.endDate.toDate().toLocaleDateString('ko-KR') : data.endDate || 'N/A'}`);
      console.log(`   - Status: ${data.status || 'N/A'}`);

      // dailyFeaturedParticipants 필드 확인
      if (data.dailyFeaturedParticipants) {
        const dates = Object.keys(data.dailyFeaturedParticipants);
        console.log(`   - Daily Featured Participants: ${dates.length} days`);
        if (dates.length > 0) {
          const recentDates = dates.sort().reverse().slice(0, 3);
          console.log(`     Recent dates: ${recentDates.join(', ')}`);
        }
      } else {
        console.log(`   - Daily Featured Participants: None`);
      }

      console.log('');
    });

    // matching_results 컬렉션도 확인
    console.log('\n📦 Checking matching_results collection...');
    const matchingResultsSnapshot = await db.collection('matching_results').limit(5).get();

    if (!matchingResultsSnapshot.empty) {
      console.log(`Found ${matchingResultsSnapshot.size} document(s):`);
      matchingResultsSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`   - ${doc.id}: cohort=${data.cohortId}, date=${data.date}`);
      });
    } else {
      console.log('No documents in matching_results collection');
    }

  } catch (error) {
    console.error('\n❌ Error listing cohorts:', error);
  }
}

// 스크립트 실행
listCohorts()
  .then(() => {
    console.log('\n' + '='.repeat(50));
    console.log('✅ Check completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Script error:', error);
    process.exit(1);
  });