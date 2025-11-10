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

async function checkCohort3Matching() {
  const cohortId = '3';
  const targetDate = '2025-11-10';

  console.log(`\n📍 Checking matching data for Cohort ${cohortId} on ${targetDate}...`);
  console.log('=' + '='.repeat(50));

  try {
    // 1. cohort 문서 가져오기
    const cohortRef = db.collection('cohorts').doc(cohortId);
    const cohortDoc = await cohortRef.get();

    if (!cohortDoc.exists) {
      console.log(`❌ Cohort "${cohortId}" not found`);
      return;
    }

    const cohortData = cohortDoc.data();
    console.log(`✅ Found cohort "${cohortId}" (${cohortData?.name || '3기'})`);

    // 2. dailyFeaturedParticipants 필드에서 오늘자 데이터 확인
    const dailyFeatured = cohortData?.dailyFeaturedParticipants;

    if (!dailyFeatured) {
      console.log('❌ No dailyFeaturedParticipants field found');
      return;
    }

    const todayMatching = dailyFeatured[targetDate];

    if (!todayMatching) {
      console.log(`❌ No matching data for ${targetDate}`);
      return;
    }

    console.log(`\n✅ Found matching data for ${targetDate}!`);
    console.log(`   - Matching Version: ${todayMatching.matchingVersion || 'not specified'}`);

    // 3. assignments 데이터 분석
    if (todayMatching.assignments) {
      const participantIds = Object.keys(todayMatching.assignments);
      console.log(`\n📊 Matching Statistics:`);
      console.log(`   - Total participants: ${participantIds.length}`);

      // 매칭 타입 분석
      let v2Count = 0;  // assigned 필드 사용 (랜덤 매칭)
      let v1Count = 0;  // similar/opposite 필드 사용 (AI 매칭)

      participantIds.forEach(id => {
        const assignment = todayMatching.assignments[id];
        if (assignment.assigned) v2Count++;
        if (assignment.similar || assignment.opposite) v1Count++;
      });

      console.log(`   - v2.0 Random Matching: ${v2Count} participants`);
      console.log(`   - v1.0 AI Matching: ${v1Count} participants`);

      // 샘플 데이터 표시
      console.log(`\n📋 Sample Data (first 5 participants):`);
      participantIds.slice(0, 5).forEach((id, index) => {
        const assignment = todayMatching.assignments[id];
        console.log(`\n   ${index + 1}. ${id.substring(0, 30)}...`);

        if (assignment.assigned) {
          console.log(`      ✅ Random Matching (v2.0)`);
          console.log(`      - Assigned profiles: ${assignment.assigned.length}`);
          console.log(`      - Profile IDs: ${assignment.assigned.join(', ')}`);
        }

        if (assignment.similar || assignment.opposite) {
          console.log(`      ⚠️  AI Matching (v1.0)`);
          if (assignment.similar) {
            console.log(`      - Similar: ${assignment.similar.join(', ')}`);
          }
          if (assignment.opposite) {
            console.log(`      - Opposite: ${assignment.opposite.join(', ')}`);
          }
        }

        console.log(`      - Date: ${assignment.date}`);
        console.log(`      - Is Admin: ${assignment.isAdmin || false}`);
      });
    }

    // 4. matching_results 백업 확인
    console.log(`\n\n📦 Checking backup in matching_results...`);
    const backupDoc = await db.collection('matching_results').doc(`${cohortId}-${targetDate}`).get();

    if (backupDoc.exists) {
      const backupData = backupDoc.data();
      console.log(`✅ Backup found: ${backupDoc.id}`);
      console.log(`   - Total Participants: ${backupData?.totalParticipants}`);
      console.log(`   - Providers Count: ${backupData?.providersCount}`);
      console.log(`   - Confirmed At: ${backupData?.confirmedAt?.toDate()?.toLocaleString('ko-KR')}`);
      console.log(`   - Confirmed By: ${backupData?.confirmedBy}`);
      console.log(`   - Validation Errors: ${backupData?.validationErrors?.length || 0}`);
      console.log(`   - Validation Warnings: ${backupData?.validationWarnings?.length || 0}`);
    } else {
      console.log('❌ No backup found in matching_results');
    }

  } catch (error) {
    console.error('\n❌ Error checking matching data:', error);
  }
}

// 스크립트 실행
checkCohort3Matching()
  .then(() => {
    console.log('\n' + '='.repeat(50));
    console.log('✅ Check completed successfully!');
    console.log('\n💡 Summary:');
    console.log('   랜덤매칭 결과는 다음 경로에 저장됩니다:');
    console.log('   1. Main: cohorts/3/dailyFeaturedParticipants["2025-11-10"]');
    console.log('   2. Backup: matching_results/3-2025-11-10');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Script error:', error);
    process.exit(1);
  });