/**
 * 기수(Cohort) 활성화 상태 자동 업데이트 스크립트
 *
 * 현재 날짜를 기준으로 각 기수의 isActive 필드를 자동으로 업데이트합니다.
 * - startDate <= 오늘 <= endDate 이면 isActive = true
 * - 그 외의 경우 isActive = false
 *
 * 실행 방법:
 * npx tsx src/scripts/update-cohort-active-status.ts
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';

// .env.local 파일 로드
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Firebase 설정 (환경변수에서 직접 읽기)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, 'seoul');

interface CohortDoc {
  id: string;
  name: string;
  startDate: string; // ISO 8601
  endDate: string; // ISO 8601
  isActive: boolean;
}

/**
 * 날짜 문자열(ISO 8601)을 Date 객체로 변환 (KST 기준)
 */
function parseISODate(isoString: string): Date {
  return new Date(isoString);
}

/**
 * 현재 날짜가 기수 기간 내에 있는지 확인
 */
function isWithinDateRange(startDate: string, endDate: string, today: Date): boolean {
  const start = parseISODate(startDate);
  const end = parseISODate(endDate);

  // 날짜만 비교 (시간 무시)
  const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startDateOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endDateOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate());

  return todayDateOnly >= startDateOnly && todayDateOnly <= endDateOnly;
}

/**
 * 기수 활성화 상태 업데이트
 */
async function updateCohortActiveStatus() {
  try {
    console.log('🔄 기수 활성화 상태 업데이트 시작...\n');

    const cohortsRef = collection(db, 'cohorts');
    const snapshot = await getDocs(cohortsRef);

    if (snapshot.empty) {
      console.log('⚠️  등록된 기수가 없습니다.');
      return;
    }

    const today = new Date();
    const todayKST = today.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
    console.log(`📅 기준 날짜: ${todayKST}\n`);

    let updatedCount = 0;
    let unchangedCount = 0;

    for (const docSnap of snapshot.docs) {
      const cohort = docSnap.data() as CohortDoc;
      const cohortId = docSnap.id;

      const shouldBeActive = isWithinDateRange(cohort.startDate, cohort.endDate, today);
      const currentlyActive = cohort.isActive;

      console.log(`📊 ${cohort.name} (${cohortId})`);
      console.log(`   기간: ${cohort.startDate} ~ ${cohort.endDate}`);
      console.log(`   현재 상태: ${currentlyActive ? '✅ 활성' : '❌ 비활성'}`);
      console.log(`   계산된 상태: ${shouldBeActive ? '✅ 활성' : '❌ 비활성'}`);

      if (shouldBeActive !== currentlyActive) {
        // 상태 변경 필요
        const cohortDocRef = doc(db, 'cohorts', cohortId);
        await updateDoc(cohortDocRef, {
          isActive: shouldBeActive,
          updatedAt: Timestamp.now(),
        });

        console.log(`   🔄 업데이트됨: ${currentlyActive ? '활성' : '비활성'} → ${shouldBeActive ? '활성' : '비활성'}\n`);
        updatedCount++;
      } else {
        console.log(`   ✓ 변경 없음\n`);
        unchangedCount++;
      }
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ 완료!`);
    console.log(`   총 ${snapshot.size}개 기수 중:`);
    console.log(`   - 업데이트됨: ${updatedCount}개`);
    console.log(`   - 변경 없음: ${unchangedCount}개`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  }
}

// 스크립트 실행
updateCohortActiveStatus()
  .then(() => {
    console.log('\n✅ 스크립트 실행 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 스크립트 실행 실패:', error);
    process.exit(1);
  });
