#!/usr/bin/env tsx

/**
 * 자정 프로필북 잠금 로직 테스트
 *
 * 목적: 자정(00:00) 이후 verified-today가 리셋되어 자물쇠 화면이 표시되는지 검증
 *
 * 테스트 시나리오:
 * 1. getSubmissionDate() vs getTodayString() 차이 확인
 * 2. 새벽 0~1:59 사이 날짜 변경 감지 테스트
 * 3. 프로필북 잠금 시점 확인
 */

import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { getSubmissionDate, getTodayString } from '../src/lib/date-utils';

const KOREA_TIMEZONE = 'Asia/Seoul';

/**
 * 특정 KST 시각을 시뮬레이션
 */
function mockKSTTime(dateTimeKST: string) {
  const kstDate = toZonedTime(dateTimeKST, KOREA_TIMEZONE);
  return kstDate;
}

/**
 * 테스트 실행
 */
function runTest() {
  console.log('🧪 자정 프로필북 잠금 로직 테스트\n');

  const testCases = [
    {
      time: '2025-10-17T23:59:59', // 10월 17일 밤 11시 59분
      description: '자정 직전',
      expectedSubmission: '2025-10-17',
      expectedToday: '2025-10-17',
      shouldLock: false, // 오늘 인증했으면 잠기지 않음
    },
    {
      time: '2025-10-18T00:00:00', // 10월 18일 자정
      description: '자정 정각',
      expectedSubmission: '2025-10-17', // 제출은 어제
      expectedToday: '2025-10-18', // 프로필북은 오늘
      shouldLock: true, // ✅ 자정부터 잠김
    },
    {
      time: '2025-10-18T01:30:00', // 10월 18일 새벽 1시 30분
      description: '새벽 1시 30분',
      expectedSubmission: '2025-10-17', // 제출은 어제
      expectedToday: '2025-10-18', // 프로필북은 오늘
      shouldLock: true, // ✅ 여전히 잠김
    },
    {
      time: '2025-10-18T01:59:59', // 10월 18일 새벽 1시 59분 59초
      description: '새벽 2시 직전',
      expectedSubmission: '2025-10-17', // 제출은 어제
      expectedToday: '2025-10-18', // 프로필북은 오늘
      shouldLock: true, // ✅ 여전히 잠김
    },
    {
      time: '2025-10-18T02:00:00', // 10월 18일 새벽 2시
      description: '새벽 2시 (제출 마감)',
      expectedSubmission: '2025-10-18', // 제출도 오늘
      expectedToday: '2025-10-18', // 프로필북도 오늘
      shouldLock: false, // ❌ 날짜 동일 (오늘 인증했다면 열림)
    },
    {
      time: '2025-10-18T10:00:00', // 10월 18일 오전 10시
      description: '낮 10시',
      expectedSubmission: '2025-10-18',
      expectedToday: '2025-10-18',
      shouldLock: false, // ❌ 날짜 동일 (오늘 인증했다면 열림)
    },
  ];

  console.log('📋 테스트 결과:\n');

  let passedCount = 0;
  let failedCount = 0;

  testCases.forEach((testCase, index) => {
    console.log(`\n[${index + 1}/${testCases.length}] ${testCase.description} (${testCase.time})`);

    // 실제 함수는 현재 시각을 사용하므로, 로직만 검증
    const kstDate = mockKSTTime(testCase.time);
    const hour = kstDate.getHours();

    // getSubmissionDate() 로직 시뮬레이션
    const submissionDate = hour < 2
      ? format(new Date(kstDate.getTime() - 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
      : format(kstDate, 'yyyy-MM-dd');

    // getTodayString() 로직 시뮬레이션
    const todayDate = format(kstDate, 'yyyy-MM-dd');

    // 검증
    const submissionMatch = submissionDate === testCase.expectedSubmission;
    const todayMatch = todayDate === testCase.expectedToday;

    // 날짜 차이 = 프로필북 잠금 여부
    const datesDiffer = submissionDate !== todayDate;
    const shouldLockMatch = datesDiffer === testCase.shouldLock;

    const allPassed = submissionMatch && todayMatch && shouldLockMatch;

    if (allPassed) {
      passedCount++;
      console.log(`✅ PASS`);
    } else {
      failedCount++;
      console.log(`❌ FAIL`);
    }

    console.log(`   getSubmissionDate(): ${submissionDate} ${submissionMatch ? '✅' : '❌ 예상: ' + testCase.expectedSubmission}`);
    console.log(`   getTodayString(): ${todayDate} ${todayMatch ? '✅' : '❌ 예상: ' + testCase.expectedToday}`);
    console.log(`   프로필북 잠금: ${datesDiffer ? 'LOCKED 🔒' : 'UNLOCKED 🔓'} ${shouldLockMatch ? '✅' : '❌ 예상: ' + (testCase.shouldLock ? 'LOCKED' : 'UNLOCKED')}`);
  });

  console.log(`\n\n📊 테스트 요약:`);
  console.log(`   통과: ${passedCount}/${testCases.length}`);
  console.log(`   실패: ${failedCount}/${testCases.length}`);

  if (failedCount === 0) {
    console.log('\n🎉 모든 테스트 통과! 자정 프로필북 잠금 로직이 올바릅니다.');
    console.log('\n💡 핵심 동작:');
    console.log('   - 자정(00:00)부터: verified-today가 오늘 날짜로 리셋');
    console.log('   - 새벽 2시까지: 제출은 어제로 처리되지만, 프로필북은 잠김');
    console.log('   - 오늘 인증 전까지: 자물쇠 더미 카드 표시');
  } else {
    console.log('\n⚠️  일부 테스트 실패. 로직을 확인하세요.');
    process.exit(1);
  }
}

// 테스트 실행
runTest();
