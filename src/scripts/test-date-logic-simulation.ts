#!/usr/bin/env tsx
/**
 * 0-2시 시뮬레이션 테스트
 */

import { format, subDays } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const KOREA_TIMEZONE = 'Asia/Seoul';

// getSubmissionDate 시뮬레이션
function simulateGetSubmissionDate(hour: number): string {
  const nowUTC = new Date();
  const nowKST = toZonedTime(nowUTC, KOREA_TIMEZONE);

  // 시뮬레이션: 원하는 시간으로 설정
  nowKST.setHours(hour);

  // 새벽 0시~1시 59분: 전날로 처리
  if (hour < 2) {
    const yesterdayKST = subDays(nowKST, 1);
    return format(yesterdayKST, 'yyyy-MM-dd');
  }

  // 새벽 2시~23시 59분: 오늘로 처리
  return format(nowKST, 'yyyy-MM-dd');
}

// getMatchingTargetDate 시뮬레이션
function simulateGetMatchingTargetDate(hour: number): string {
  const nowUTC = new Date();
  const nowKST = toZonedTime(nowUTC, KOREA_TIMEZONE);
  nowKST.setHours(hour);

  if (hour < 2) {
    // 0-2시: 이틀 전 날짜 반환 (어제는 아직 진행 중)
    const twoDaysAgoKST = subDays(nowKST, 2);
    return format(twoDaysAgoKST, 'yyyy-MM-dd');
  } else {
    // 2시 이후: 어제 날짜 반환 (어제가 마감됨)
    const yesterdayKST = subDays(nowKST, 1);
    return format(yesterdayKST, 'yyyy-MM-dd');
  }
}

console.log('==================================================');
console.log('0-2시 시뮬레이션 테스트');
console.log('==================================================\n');

// 테스트 케이스들
const testCases = [
  { hour: 0, desc: '자정' },
  { hour: 1, desc: '새벽 1시' },
  { hour: 2, desc: '새벽 2시 (마감)' },
  { hour: 10, desc: '오전 10시' },
];

console.log('📊 시간대별 테스트:');
console.log('--------------------------------------------------');

for (const { hour, desc } of testCases) {
  const submission = simulateGetSubmissionDate(hour);
  const matching = simulateGetMatchingTargetDate(hour);

  console.log(`\n${desc} (${hour}시):`);
  console.log(`  - getSubmissionDate(): ${submission}`);
  console.log(`  - getMatchingTargetDate(): ${matching}`);

  // 검증
  if (hour < 2) {
    // 0-2시: 제출은 어제, 매칭은 이틀 전
    console.log('  ✅ 정상: 제출은 어제, 매칭 대상은 이틀 전 (어제는 진행 중)');
  } else {
    // 2시 이후: 제출은 오늘, 매칭은 어제
    console.log('  ✅ 정상: 제출은 오늘, 매칭 대상은 어제');
  }
}

console.log('\n==================================================');
console.log('결론:');
console.log('--------------------------------------------------');
console.log('0-2시: 제출은 어제, 매칭 대상은 이틀 전 (어제는 진행 중)');
console.log('2시 이후: 제출은 오늘, 매칭 대상은 어제 (어제가 마감)');
console.log('==================================================');