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

async function verifyRandomMatching() {
  const cohortId = '3';
  const targetDate = '2025-11-10';  // 오늘자 데이터 확인

  console.log(`\n🔍 Verifying random matching for Cohort ${cohortId} on ${targetDate}...`);
  console.log('=' + '='.repeat(50));

  try {
    // 1. cohort 문서에서 확인
    const cohortRef = db.collection('cohorts').doc(cohortId);
    const cohortDoc = await cohortRef.get();

    if (!cohortDoc.exists) {
      console.log(`❌ Cohort "${cohortId}" not found`);
      return;
    }

    const cohortData = cohortDoc.data();
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

    // 2. assignments 데이터 분석
    if (todayMatching.assignments) {
      const participantIds = Object.keys(todayMatching.assignments);
      console.log(`\n📊 Matching Analysis:`);
      console.log(`   - Total participants: ${participantIds.length}`);

      let v2Count = 0;  // assigned 필드 사용 (랜덤 매칭)
      let v1Count = 0;  // similar/opposite 필드 사용 (AI 매칭)
      let emptyCount = 0;  // 매칭 없음

      participantIds.forEach(id => {
        const assignment = todayMatching.assignments[id];
        if (assignment.assigned !== undefined) {
          v2Count++;
          if (!assignment.assigned || assignment.assigned.length === 0) {
            emptyCount++;
          }
        } else if (assignment.similar || assignment.opposite) {
          v1Count++;
        }
      });

      console.log(`\n📌 Matching Type:`);
      if (v2Count > 0) {
        console.log(`   ✅ v2.0 Random Matching: ${v2Count} participants`);
        console.log(`      - With assignments: ${v2Count - emptyCount}`);
        console.log(`      - Empty assignments: ${emptyCount}`);
      }
      if (v1Count > 0) {
        console.log(`   ⚠️  v1.0 AI Matching: ${v1Count} participants`);
      }

      // 3. 샘플 데이터
      console.log(`\n📋 Sample Data (first 3 participants):`);
      participantIds.slice(0, 3).forEach((id, index) => {
        const assignment = todayMatching.assignments[id];
        console.log(`\n   ${index + 1}. ${id}`);

        if (assignment.assigned !== undefined) {
          console.log(`      ✅ Has 'assigned' field (Random Matching v2.0)`);
          console.log(`      - Type: ${typeof assignment.assigned}`);
          console.log(`      - Value: ${JSON.stringify(assignment.assigned)}`);
          console.log(`      - Length: ${assignment.assigned ? assignment.assigned.length : 0}`);
        } else {
          console.log(`      ❌ No 'assigned' field`);
        }

        if (assignment.similar || assignment.opposite) {
          console.log(`      ⚠️  Has 'similar/opposite' fields (AI Matching v1.0)`);
        }

        console.log(`      - Date: ${assignment.date || 'undefined'}`);
        console.log(`      - Is Admin: ${assignment.isAdmin || false}`);
      });

      // 4. 성공 여부 판단
      console.log(`\n\n🎯 Result:`);
      if (v2Count > 0 && v1Count === 0) {
        console.log('   ✅ SUCCESS: Random matching (v2.0) with "assigned" field is active!');
        if (emptyCount === participantIds.length) {
          console.log('   ⚠️  Note: All assignments are empty (no providers available)');
        }
      } else if (v1Count > 0 && v2Count === 0) {
        console.log('   ❌ FAILED: Still using AI matching (v1.0) with "similar/opposite" fields');
      } else {
        console.log('   ⚠️  MIXED: Both v1.0 and v2.0 data found - inconsistent state');
      }
    }

    // 5. matching_results 백업 확인
    console.log(`\n\n📦 Checking backup in matching_results...`);
    const backupDoc = await db.collection('matching_results').doc(`${cohortId}-${targetDate}`).get();

    if (backupDoc.exists) {
      const backupData = backupDoc.data();
      console.log(`✅ Backup found: ${backupDoc.id}`);
      console.log(`   - Confirmed By: ${backupData?.confirmedBy}`);
      console.log(`   - Providers Count: ${backupData?.providersCount || 0}`);
    } else {
      console.log('❌ No backup found in matching_results');
    }

  } catch (error) {
    console.error('\n❌ Error verifying matching data:', error);
  }
}

// 스크립트 실행
verifyRandomMatching()
  .then(() => {
    console.log('\n' + '='.repeat(50));
    console.log('✅ Verification completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Script error:', error);
    process.exit(1);
  });