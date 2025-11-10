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

async function checkTodayMatching() {
  const today = new Date();
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  console.log(`\n📅 Checking matching data for: ${dateStr}`);
  console.log('=' + '='.repeat(50));

  try {
    // 오늘자 매칭 문서 조회
    const docRef = db.collection('cohorts')
      .doc('default')
      .collection('dailyFeaturedParticipants')
      .doc(dateStr);

    const doc = await docRef.get();

    if (!doc.exists) {
      console.log(`\n❌ No matching data found for ${dateStr}`);
      console.log('   The daily matching might not have run yet.');
      console.log('   (Scheduled for 2:00 PM KST daily)');
      return;
    }

    const data = doc.data();
    console.log(`\n✅ Matching document found for ${dateStr}`);
    console.log('\n📊 Document Overview:');
    console.log(`   - Created At: ${data?.createdAt?.toDate()?.toLocaleString('ko-KR')}`);
    console.log(`   - Updated At: ${data?.updatedAt?.toDate()?.toLocaleString('ko-KR')}`);
    console.log(`   - Date: ${data?.date}`);

    // assignments 필드 확인
    if (data?.assignments) {
      const participantIds = Object.keys(data.assignments);
      console.log(`\n👥 Total matched participants: ${participantIds.length}`);

      // 샘플 데이터 표시 (처음 5명)
      console.log('\n📋 Sample matching results (first 5):');
      participantIds.slice(0, 5).forEach((participantId, index) => {
        const assignment = data.assignments[participantId];
        console.log(`\n   ${index + 1}. Participant: ${participantId.substring(0, 20)}...`);
        console.log(`      - Assigned profiles: ${assignment.assigned?.length || 0} profiles`);
        if (assignment.assigned && assignment.assigned.length > 0) {
          console.log(`      - Profile IDs: ${assignment.assigned.join(', ')}`);
        }
        console.log(`      - Is Admin: ${assignment.isAdmin || false}`);
        console.log(`      - Date: ${assignment.date}`);
      });

      // 매칭 통계
      console.log('\n📈 Matching Statistics:');
      const assignedCounts = participantIds.map(id =>
        data.assignments[id].assigned?.length || 0
      );
      const avgAssigned = assignedCounts.reduce((a, b) => a + b, 0) / assignedCounts.length;
      const maxAssigned = Math.max(...assignedCounts);
      const minAssigned = Math.min(...assignedCounts);

      console.log(`   - Average profiles per participant: ${avgAssigned.toFixed(2)}`);
      console.log(`   - Maximum profiles assigned: ${maxAssigned}`);
      console.log(`   - Minimum profiles assigned: ${minAssigned}`);

      // v1.0 필드 확인 (similar/opposite)
      const hasV1Fields = participantIds.some(id =>
        data.assignments[id].similar || data.assignments[id].opposite
      );

      if (hasV1Fields) {
        console.log('\n⚠️  Warning: Found v1.0 fields (similar/opposite) in data!');
      } else {
        console.log('\n✅ Using v2.0 structure (assigned field only)');
      }

    } else {
      console.log('\n❌ No assignments field found in the document');
    }

  } catch (error) {
    console.error('\n❌ Error checking matching data:', error);
  }
}

// 스크립트 실행
checkTodayMatching()
  .then(() => {
    console.log('\n✅ Check completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Script error:', error);
    process.exit(1);
  });