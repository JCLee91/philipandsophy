#!/usr/bin/env tsx

/**
 * 새벽 2시 프로필북 잠금 정책 테스트 스크립트
 *
 * 목적: 새벽 2시 이후 프로필북이 올바르게 잠기는지 검증
 *
 * 테스트 시나리오:
 * 1. 10월 16일 23:59:59에 제출한 인증 → 10월 17일 매칭에 표시 (새벽 2시 전)
 * 2. 10월 17일 00:00:00에 제출한 인증 → 10월 17일 매칭에 표시 (새벽 2시 전)
 * 3. 10월 17일 01:59:59에 제출한 인증 → 10월 17일 매칭에 표시 (새벽 2시 전)
 * 4. 10월 17일 02:00:00에 제출한 인증 → 10월 17일 매칭에 숨김 (새벽 2시 이후)
 * 5. 10월 17일 10:00:00에 제출한 인증 → 10월 17일 매칭에 숨김 (새벽 2시 이후)
 */

import { parseISO, addDays, format, toDate } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { Timestamp } from 'firebase/firestore';
import { filterSubmissionsByDate, getPreviousDayString } from '../src/lib/date-utils';

const KOREA_TIMEZONE = 'Asia/Seoul';

interface TestSubmission {
  id: string;
  submittedAt: Timestamp;
  description: string;
}

/**
 * KST 날짜/시간 문자열을 Firebase Timestamp로 변환
 */
function createKSTTimestamp(dateTimeKST: string): Timestamp {
  const kstDate = toZonedTime(dateTimeKST, KOREA_TIMEZONE);
  return Timestamp.fromDate(kstDate);
}

/**
 * 테스트 실행
 */
function runTest() {
  console.log('🧪 새벽 2시 프로필북 잠금 정책 테스트\n');

  // 매칭 날짜: 10월 17일
  const matchingDate = '2025-10-17';
  const cutoffDate = getPreviousDayString(matchingDate); // "2025-10-16"

  console.log(`📅 매칭 날짜: ${matchingDate}`);
  console.log(`📅 Cutoff 날짜: ${cutoffDate}`);
  console.log(`📅 표시 범위: ${cutoffDate} 00:00:00 ~ ${format(addDays(parseISO(cutoffDate), 1), 'yyyy-MM-dd')} 01:59:59.999 KST\n`);

  // 테스트 제출물 생성
  const testSubmissions: TestSubmission[] = [
    {
      id: 'sub-1',
      submittedAt: createKSTTimestamp('2025-10-16T23:59:59'), // 10월 16일 23:59:59
      description: '10월 16일 23:59:59 제출 (새벽 2시 전) → ✅ 표시되어야 함',
    },
    {
      id: 'sub-2',
      submittedAt: createKSTTimestamp('2025-10-17T00:00:00'), // 10월 17일 00:00:00
      description: '10월 17일 00:00:00 제출 (새벽 2시 전) → ✅ 표시되어야 함',
    },
    {
      id: 'sub-3',
      submittedAt: createKSTTimestamp('2025-10-17T01:30:00'), // 10월 17일 01:30:00
      description: '10월 17일 01:30:00 제출 (새벽 2시 전) → ✅ 표시되어야 함',
    },
    {
      id: 'sub-4',
      submittedAt: createKSTTimestamp('2025-10-17T01:59:59'), // 10월 17일 01:59:59
      description: '10월 17일 01:59:59 제출 (새벽 2시 직전) → ✅ 표시되어야 함',
    },
    {
      id: 'sub-5',
      submittedAt: createKSTTimestamp('2025-10-17T02:00:00'), // 10월 17일 02:00:00
      description: '10월 17일 02:00:00 제출 (새벽 2시) → ❌ 숨겨져야 함',
    },
    {
      id: 'sub-6',
      submittedAt: createKSTTimestamp('2025-10-17T10:00:00'), // 10월 17일 10:00:00
      description: '10월 17일 10:00:00 제출 (낮) → ❌ 숨겨져야 함',
    },
  ];

  // 필터링 실행
  const filteredSubmissions = filterSubmissionsByDate(testSubmissions, cutoffDate);
  const filteredIds = new Set(filteredSubmissions.map((s) => s.id));

  console.log('📋 테스트 결과:\n');

  let passedCount = 0;
  let failedCount = 0;

  testSubmissions.forEach((sub) => {
    const isVisible = filteredIds.has(sub.id);
    const shouldBeVisible = sub.id === 'sub-1' || sub.id === 'sub-2' || sub.id === 'sub-3' || sub.id === 'sub-4';
    const testPassed = isVisible === shouldBeVisible;

    if (testPassed) {
      passedCount++;
      console.log(`✅ PASS: ${sub.description}`);
    } else {
      failedCount++;
      console.log(`❌ FAIL: ${sub.description}`);
      console.log(`   예상: ${shouldBeVisible ? '표시' : '숨김'}, 실제: ${isVisible ? '표시' : '숨김'}`);
    }

    // 디버그 정보
    const submittedKST = toZonedTime(sub.submittedAt.toDate(), KOREA_TIMEZONE);
    console.log(`   제출 시각 (KST): ${format(submittedKST, 'yyyy-MM-dd HH:mm:ss')}`);
  });

  console.log(`\n📊 테스트 요약:`);
  console.log(`   통과: ${passedCount}/${testSubmissions.length}`);
  console.log(`   실패: ${failedCount}/${testSubmissions.length}`);

  if (failedCount === 0) {
    console.log('\n🎉 모든 테스트 통과! 새벽 2시 정책이 올바르게 작동합니다.');
  } else {
    console.log('\n⚠️  일부 테스트 실패. 새벽 2시 정책 로직을 확인하세요.');
    process.exit(1);
  }
}

// 테스트 실행
runTest();
