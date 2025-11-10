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

async function checkMatchingData() {
  console.log('\n📍 Checking matching data in cohort document field...');
  console.log('=' + '='.repeat(50));

  try {
    // 1. cohort 문서 가져오기
    const cohortRef = db.collection('cohorts').doc('default');
    const cohortDoc = await cohortRef.get();

    if (!cohortDoc.exists) {
      console.log('❌ Cohort "default" not found');
      return;
    }

    const cohortData = cohortDoc.data();
    console.log('✅ Found cohort "default" document');

    // 2. dailyFeaturedParticipants 필드 확인
    const dailyFeatured = cohortData?.dailyFeaturedParticipants;

    if (!dailyFeatured) {
      console.log('❌ No dailyFeaturedParticipants field found');
      return;
    }

    const dates = Object.keys(dailyFeatured).sort().reverse();
    console.log(`\n✅ Found ${dates.length} days of matching data`);

    // 3. 최근 5개 날짜의 데이터 표시
    const recentDates = dates.slice(0, 5);
    console.log('\n📅 Recent matching dates:');

    recentDates.forEach((date, index) => {
      const matchingData = dailyFeatured[date];
      console.log('\n' + '-'.repeat(50));
      console.log(`${index + 1}. Date: ${date}`);

      if (matchingData.assignments) {
        const participantIds = Object.keys(matchingData.assignments);
        console.log(`   Participants: ${participantIds.length}`);

        // 첫 번째 참가자 샘플 확인
        if (participantIds.length > 0) {
          const sampleId = participantIds[0];
          const sampleAssignment = matchingData.assignments[sampleId];

          console.log(`\n   Sample participant: ${sampleId.substring(0, 20)}...`);

          // v2.0 Random matching (assigned)
          if (sampleAssignment.assigned) {
            console.log(`   ✅ v2.0 Random Matching`);
            console.log(`      - Assigned: ${sampleAssignment.assigned.length} profiles`);
            console.log(`      - IDs: ${sampleAssignment.assigned.slice(0, 3).join(', ')}${sampleAssignment.assigned.length > 3 ? '...' : ''}`);
          }

          // v1.0 AI matching (similar/opposite)
          if (sampleAssignment.similar || sampleAssignment.opposite) {
            console.log(`   ⚠️  v1.0 AI Matching`);
            if (sampleAssignment.similar) {
              console.log(`      - Similar: ${sampleAssignment.similar.length} profiles`);
            }
            if (sampleAssignment.opposite) {
              console.log(`      - Opposite: ${sampleAssignment.opposite.length} profiles`);
            }
          }
        }
      }

      // matchingVersion 확인
      if (matchingData.matchingVersion) {
        console.log(`   Matching Version: ${matchingData.matchingVersion}`);
      }
    });

    // 4. matching_results 백업 컬렉션도 확인
    console.log('\n\n📦 Checking backup in matching_results collection...');
    const backupSnapshot = await db.collection('matching_results')
      .orderBy('date', 'desc')
      .limit(3)
      .get();

    if (!backupSnapshot.empty) {
      console.log(`Found ${backupSnapshot.size} backup records:`);
      backupSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`   - ${doc.id}: ${data.date} (${data.totalParticipants} participants)`);
      });
    } else {
      console.log('No backup records found in matching_results');
    }

  } catch (error) {
    console.error('\n❌ Error checking matching data:', error);
  }
}

// 스크립트 실행
checkMatchingData()
  .then(() => {
    console.log('\n' + '='.repeat(50));
    console.log('✅ Check completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Script error:', error);
    process.exit(1);
  });