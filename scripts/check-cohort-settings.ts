/**
 * Cohort 설정 확인 (전체 공개 모드 체크)
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

async function checkCohortSettings() {
  try {
    const cohortId = '3';

    console.log(`🔍 Cohort ${cohortId} 설정 확인\n`);

    const cohortDoc = await db.collection('cohorts').doc(cohortId).get();
    const cohort = cohortDoc.data();

    if (!cohort) {
      console.log('❌ Cohort 데이터 없음');
      return;
    }

    console.log('=== Cohort 기본 정보 ===');
    console.log(`이름: ${cohort.name}`);
    console.log(`설명: ${cohort.description}`);
    console.log(`활성 상태: ${cohort.isActive}`);

    console.log('\n=== 날짜 설정 ===');
    console.log(`시작일 (startDate): ${cohort.startDate || 'N/A'}`);
    console.log(`종료일 (endDate): ${cohort.endDate || 'N/A'}`);
    console.log(`프로필 공개일 (profileUnlockDate): ${cohort.profileUnlockDate || 'N/A'}`);

    // 오늘 날짜 (KST 기준, 새벽 2시 마감)
    const now = new Date();
    const kstNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
    const hour = kstNow.getHours();

    let today: Date;
    if (hour < 2) {
      // 새벽 0-2시: 전날로 처리
      today = new Date(kstNow);
      today.setDate(today.getDate() - 1);
    } else {
      today = kstNow;
    }

    const todayString = today.toISOString().split('T')[0];
    console.log(`\n오늘 날짜 (KST, 새벽 2시 마감): ${todayString}`);

    // 조건 체크
    console.log('\n=== 전체 공개 조건 체크 ===');

    // 1. endDate 체크
    if (cohort.endDate) {
      const isAfterEndDate = todayString >= cohort.endDate;
      console.log(`\n1️⃣ 마지막 날 체크 (canViewAllProfiles):`);
      console.log(`   endDate: ${cohort.endDate}`);
      console.log(`   오늘: ${todayString}`);
      console.log(`   결과: ${isAfterEndDate ? '✅ true (전체 공개)' : '❌ false'}`);
    } else {
      console.log(`\n1️⃣ 마지막 날 체크: endDate 없음 (false)`);
    }

    // 2. profileUnlockDate 체크
    if (cohort.profileUnlockDate) {
      const isAfterUnlockDate = todayString >= cohort.profileUnlockDate;
      console.log(`\n2️⃣ 프로필 공개일 체크 (shouldShowAllYesterdayVerified):`);
      console.log(`   profileUnlockDate: ${cohort.profileUnlockDate}`);
      console.log(`   오늘: ${todayString}`);
      console.log(`   결과: ${isAfterUnlockDate ? '⚠️ true (어제 인증자 전체 공개 모드)' : '❌ false'}`);

      if (isAfterUnlockDate) {
        console.log(`\n   ⚠️⚠️⚠️ 어제 인증자 전체 공개 모드 활성화됨!`);
        console.log(`   조건: isUnlockDayOrAfter && !isLocked && yesterdayVerifiedIds.size > 0`);
        console.log(`   → 오늘 인증한 사람은 어제 인증한 모든 사람의 프로필북을 볼 수 있음`);
      }
    } else {
      console.log(`\n2️⃣ 프로필 공개일 체크: profileUnlockDate 없음 (false)`);
    }

    // 3. 최종 결론
    console.log('\n=== 최종 결론 ===');

    const isFinalDay = cohort.endDate && todayString >= cohort.endDate;
    const isUnlockDay = cohort.profileUnlockDate && todayString >= cohort.profileUnlockDate;

    if (isFinalDay) {
      console.log('❌ 마지막 날 도달: 모든 사람이 전체 프로필 볼 수 있음');
    } else if (isUnlockDay) {
      console.log('⚠️ 프로필 공개일 도달: 오늘 인증한 사람은 어제 인증자 전체 프로필 볼 수 있음');
      console.log('   → 인증 0회 + 오늘 미인증 사용자: 2개만 보임 (정상)');
      console.log('   → 인증 0회 + 오늘 인증 완료: 어제 인증자 전체 보임 (30명)');
    } else {
      console.log('✅ 정상: 누적 인증 기반 프로필북 개수 제한 작동 중');
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  }
}

// 실행
checkCohortSettings()
  .then(() => {
    console.log('\n✅ 스크립트 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 스크립트 실패:', error);
    process.exit(1);
  });
