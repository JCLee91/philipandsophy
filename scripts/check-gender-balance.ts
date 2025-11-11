/**
 * 성별 균형 확인 (맨 앞 2개가 남1+여1인지 검증)
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

async function checkGenderBalance() {
  try {
    const cohortId = '3';
    const targetDate = '2025-11-10';

    console.log(`🔍 ${targetDate} 매칭 데이터 성별 균형 확인\n`);

    // 1. dailyFeaturedParticipants 조회
    const cohortDoc = await db.collection('cohorts').doc(cohortId).get();
    const cohortData = cohortDoc.data();

    if (!cohortData?.dailyFeaturedParticipants?.[targetDate]) {
      console.log('❌ 매칭 데이터 없음');
      return;
    }

    const assignments = cohortData.dailyFeaturedParticipants[targetDate].assignments;

    // 2. 참가자 정보 조회 (성별 확인용)
    const participantsSnapshot = await db
      .collection('participants')
      .where('cohortId', '==', cohortId)
      .get();

    const participantMap = new Map();
    participantsSnapshot.docs.forEach(doc => {
      participantMap.set(doc.id, {
        name: doc.data().name || doc.id,
        gender: doc.data().gender,
      });
    });

    // 3. 각 참가자의 맨 앞 2개 성별 확인
    console.log('=== 맨 앞 2개 성별 확인 ===\n');

    let correctCount = 0;
    let incorrectCount = 0;

    for (const [participantId, assignment] of Object.entries(assignments)) {
      const assigned = (assignment as any).assigned || [];

      if (assigned.length < 2) {
        console.log(`⚠️ ${participantMap.get(participantId)?.name || participantId}: 할당 ${assigned.length}개 (2개 미만)`);
        continue;
      }

      const first = participantMap.get(assigned[0]);
      const second = participantMap.get(assigned[1]);

      const firstGender = first?.gender || 'unknown';
      const secondGender = second?.gender || 'unknown';

      const isBalanced =
        (firstGender === 'male' && secondGender === 'female') ||
        (firstGender === 'female' && secondGender === 'male');

      if (isBalanced) {
        correctCount++;
        console.log(`✅ ${participantMap.get(participantId)?.name || participantId}: [${firstGender[0]}, ${secondGender[0]}] - ${first?.name}, ${second?.name}`);
      } else {
        incorrectCount++;
        console.log(`❌ ${participantMap.get(participantId)?.name || participantId}: [${firstGender[0]}, ${secondGender[0]}] - ${first?.name}, ${second?.name}`);
      }
    }

    // 4. 통계
    console.log('\n=== 통계 ===\n');
    console.log(`✅ 성별 균형 맞음: ${correctCount}명`);
    console.log(`❌ 성별 균형 안 맞음: ${incorrectCount}명`);

    const total = correctCount + incorrectCount;
    const percentage = total > 0 ? ((correctCount / total) * 100).toFixed(1) : 0;
    console.log(`\n성공률: ${percentage}%`);

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  }
}

// 실행
checkGenderBalance()
  .then(() => {
    console.log('\n✅ 확인 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 확인 실패:', error);
    process.exit(1);
  });
