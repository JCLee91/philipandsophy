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

async function checkRecentMatchings() {
  console.log('\n📅 Checking recent matching data...');
  console.log('=' + '='.repeat(50));

  try {
    // 최근 7일간의 데이터 확인
    const collectionRef = db.collection('cohorts')
      .doc('default')
      .collection('dailyFeaturedParticipants');

    const snapshot = await collectionRef
      .orderBy('date', 'desc')
      .limit(7)
      .get();

    if (snapshot.empty) {
      console.log('\n❌ No matching data found in the last 7 days');
      return;
    }

    console.log(`\n✅ Found ${snapshot.size} matching records`);

    snapshot.forEach((doc) => {
      const data = doc.data();
      const date = doc.id;

      console.log('\n' + '-'.repeat(50));
      console.log(`📅 Date: ${date}`);
      console.log(`   Created: ${data?.createdAt?.toDate()?.toLocaleString('ko-KR')}`);
      console.log(`   Updated: ${data?.updatedAt?.toDate()?.toLocaleString('ko-KR')}`);

      if (data?.assignments) {
        const participantIds = Object.keys(data.assignments);
        console.log(`   Matched participants: ${participantIds.length}`);

        // 첫 번째 참가자의 데이터 구조 확인
        if (participantIds.length > 0) {
          const firstId = participantIds[0];
          const firstAssignment = data.assignments[firstId];
          console.log(`\n   Sample data structure for participant:`, firstId.substring(0, 20) + '...');

          // assigned 필드 (v2.0 랜덤 매칭)
          if (firstAssignment.assigned) {
            console.log(`   ✅ v2.0 Random Matching (assigned field)`);
            console.log(`      - Assigned profiles: ${firstAssignment.assigned.length}`);
            console.log(`      - Profile IDs: ${firstAssignment.assigned.slice(0, 3).join(', ')}${firstAssignment.assigned.length > 3 ? '...' : ''}`);
          }

          // similar/opposite 필드 (v1.0 AI 매칭)
          if (firstAssignment.similar || firstAssignment.opposite) {
            console.log(`   ⚠️  v1.0 AI Matching (similar/opposite fields)`);
            if (firstAssignment.similar) {
              console.log(`      - Similar profiles: ${firstAssignment.similar.length}`);
            }
            if (firstAssignment.opposite) {
              console.log(`      - Opposite profiles: ${firstAssignment.opposite.length}`);
            }
          }
        }
      } else {
        console.log('   ❌ No assignments field found');
      }
    });

  } catch (error) {
    console.error('\n❌ Error checking matching data:', error);
  }
}

// 스크립트 실행
checkRecentMatchings()
  .then(() => {
    console.log('\n' + '='.repeat(50));
    console.log('✅ Check completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Script error:', error);
    process.exit(1);
  });