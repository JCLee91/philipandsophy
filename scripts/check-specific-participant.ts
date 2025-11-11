/**
 * 특정 참가자 매칭 확인
 */

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const app = initializeApp({
  credential: applicationDefault(),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
});

const db = getFirestore(app, 'seoul');

async function checkParticipant() {
  try {
    const cohortId = '3';
    const date = '2025-11-10';
    const participantId = 'cohort3-계륜';

    console.log(`🔍 ${participantId} 매칭 확인 (${date})\n`);

    // 1. 참가자 정보
    console.log('1️⃣ 참가자 정보:');
    const participantDoc = await db.collection('participants').doc(participantId).get();
    const participantData = participantDoc.data();
    console.log(`   이름: ${participantData?.name}`);
    console.log(`   성별: ${participantData?.gender}`);

    // 2. 누적 인증 횟수
    console.log('\n2️⃣ 누적 인증 횟수:');
    const submissionsSnapshot = await db
      .collection('reading_submissions')
      .where('participantId', '==', participantId)
      .where('status', '==', 'approved')
      .where('submissionDate', '<=', date)
      .get();

    const submissionCount = submissionsSnapshot.size;
    const expectedCount = 2 * (submissionCount + 1);

    console.log(`   누적 인증: ${submissionCount}회`);
    console.log(`   예상 프로필북: ${expectedCount}개 (2 × (${submissionCount} + 1))`);

    // 3. dailyFeaturedParticipants 확인
    console.log('\n3️⃣ dailyFeaturedParticipants:');
    const cohortDoc = await db.collection('cohorts').doc(cohortId).get();
    const cohortData = cohortDoc.data();
    const dailyFeaturedParticipants = cohortData?.dailyFeaturedParticipants || {};
    const matching = dailyFeaturedParticipants[date];

    if (!matching?.assignments?.[participantId]) {
      console.log('   ❌ 할당 데이터 없음');
      return;
    }

    const assignment = matching.assignments[participantId];
    const assigned = assignment.assigned || [];

    console.log(`   실제 할당: ${assigned.length}개`);
    console.log(`   할당 ID 목록:`);
    assigned.forEach((id: string, index: number) => {
      console.log(`      ${index + 1}. ${id}`);
    });

    // 4. 중복 확인
    console.log('\n4️⃣ 중복 확인:');
    const uniqueIds = new Set(assigned);
    if (uniqueIds.size !== assigned.length) {
      console.log(`   ⚠️  중복 발견! 유니크: ${uniqueIds.size}개, 전체: ${assigned.length}개`);

      // 중복된 ID 찾기
      const counts = new Map<string, number>();
      assigned.forEach((id: string) => {
        counts.set(id, (counts.get(id) || 0) + 1);
      });

      const duplicates = Array.from(counts.entries()).filter(([_, count]) => count > 1);
      console.log(`   중복 ID:`);
      duplicates.forEach(([id, count]) => {
        console.log(`      ${id}: ${count}번`);
      });
    } else {
      console.log(`   ✅ 중복 없음`);
    }

    // 5. 할당된 사람들 정보
    console.log('\n5️⃣ 할당된 프로필북 정보:');
    for (const assignedId of assigned) {
      const assignedDoc = await db.collection('participants').doc(assignedId).get();
      const assignedData = assignedDoc.data();
      console.log(`   - ${assignedData?.name} (${assignedId}) - ${assignedData?.gender}`);
    }

    // 6. 성별 분포
    console.log('\n6️⃣ 성별 분포:');
    const genderCounts = { male: 0, female: 0, other: 0 };
    for (const assignedId of assigned) {
      const assignedDoc = await db.collection('participants').doc(assignedId).get();
      const assignedData = assignedDoc.data();
      const gender = assignedData?.gender || 'other';
      if (gender === 'male') genderCounts.male++;
      else if (gender === 'female') genderCounts.female++;
      else genderCounts.other++;
    }
    console.log(`   남성: ${genderCounts.male}명`);
    console.log(`   여성: ${genderCounts.female}명`);
    console.log(`   기타: ${genderCounts.other}명`);

    // 7. 결론
    console.log('\n7️⃣ 결론:');
    if (assigned.length === expectedCount) {
      console.log(`   ✅ 정상: ${expectedCount}개 예상, ${assigned.length}개 할당`);
    } else {
      console.log(`   ⚠️  불일치: ${expectedCount}개 예상, ${assigned.length}개 할당`);
      console.log(`   차이: ${expectedCount - assigned.length}개`);
    }

    if (assigned.length % 2 === 0) {
      console.log(`   ✅ 짝수 할당`);
    } else {
      console.log(`   ⚠️  홀수 할당!`);
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  }
}

// 실행
checkParticipant()
  .then(() => {
    console.log('\n✅ 스크립트 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 스크립트 실패:', error);
    process.exit(1);
  });
