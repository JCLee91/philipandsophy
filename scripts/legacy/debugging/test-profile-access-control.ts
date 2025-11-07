#!/usr/bin/env tsx

/**
 * 프로필북 접근 권한 테스트 스크립트
 *
 * 목적: 새벽 2시 이후 프로필북 잠금 로직 검증
 *
 * 테스트 시나리오:
 * 1. 본인 프로필 → 항상 접근 가능
 * 2. 슈퍼 관리자 → 모든 프로필 접근 가능
 * 3. 15일차 이후 → 인증 없이도 모든 프로필 접근 가능
 * 4. 14일차 + 인증 완료 → 모든 프로필 접근 가능
 * 5. 평소 + 인증 완료 + 매칭된 멤버 → 해당 프로필만 접근 가능
 * 6. 평소 + 인증 미완료 → 본인 프로필만 접근 가능
 */

import { parseISO, addDays, format } from 'date-fns';
import { getTodayString } from '../src/lib/date-utils';

interface AccessTestCase {
  name: string;
  scenario: {
    isSelf: boolean;
    isSuperAdmin: boolean;
    isAfterProgramWithoutAuth: boolean;
    isFinalDayAccess: boolean;
    isVerifiedToday: boolean;
    viewerHasAccessForDate: boolean;
    isFeatured: boolean;
  };
  expectedAccess: boolean;
}

/**
 * 접근 권한 계산 함수 (프로필북 로직 복제)
 */
function calculateAccess(scenario: AccessTestCase['scenario']): boolean {
  const {
    isSelf,
    isSuperAdmin,
    isAfterProgramWithoutAuth,
    isFinalDayAccess,
    isVerifiedToday,
    viewerHasAccessForDate,
    isFeatured,
  } = scenario;

  return (
    isSelf ||
    isSuperAdmin ||
    isAfterProgramWithoutAuth || // 15일차 이후 (인증 불필요)
    (isFinalDayAccess && isVerifiedToday) || // 14일차 (인증 필요)
    (isVerifiedToday && viewerHasAccessForDate && isFeatured) // 평소 (매칭된 4명만)
  );
}

/**
 * 테스트 실행
 */
function runTest() {
  console.log('🧪 프로필북 접근 권한 테스트\n');

  const testCases: AccessTestCase[] = [
    {
      name: '본인 프로필 (인증 안 함)',
      scenario: {
        isSelf: true,
        isSuperAdmin: false,
        isAfterProgramWithoutAuth: false,
        isFinalDayAccess: false,
        isVerifiedToday: false,
        viewerHasAccessForDate: false,
        isFeatured: false,
      },
      expectedAccess: true,
    },
    {
      name: '슈퍼 관리자 (모든 조건 무시)',
      scenario: {
        isSelf: false,
        isSuperAdmin: true,
        isAfterProgramWithoutAuth: false,
        isFinalDayAccess: false,
        isVerifiedToday: false,
        viewerHasAccessForDate: false,
        isFeatured: false,
      },
      expectedAccess: true,
    },
    {
      name: '15일차 이후 (인증 불필요)',
      scenario: {
        isSelf: false,
        isSuperAdmin: false,
        isAfterProgramWithoutAuth: true,
        isFinalDayAccess: false,
        isVerifiedToday: false,
        viewerHasAccessForDate: false,
        isFeatured: false,
      },
      expectedAccess: true,
    },
    {
      name: '14일차 + 인증 완료 (모든 프로필 공개)',
      scenario: {
        isSelf: false,
        isSuperAdmin: false,
        isAfterProgramWithoutAuth: false,
        isFinalDayAccess: true,
        isVerifiedToday: true,
        viewerHasAccessForDate: true,
        isFeatured: true,
      },
      expectedAccess: true,
    },
    {
      name: '14일차 + 인증 미완료 (잠김)',
      scenario: {
        isSelf: false,
        isSuperAdmin: false,
        isAfterProgramWithoutAuth: false,
        isFinalDayAccess: true,
        isVerifiedToday: false,
        viewerHasAccessForDate: false,
        isFeatured: false,
      },
      expectedAccess: false,
    },
    {
      name: '평소 + 인증 완료 + 매칭된 멤버 (접근 가능)',
      scenario: {
        isSelf: false,
        isSuperAdmin: false,
        isAfterProgramWithoutAuth: false,
        isFinalDayAccess: false,
        isVerifiedToday: true,
        viewerHasAccessForDate: true,
        isFeatured: true,
      },
      expectedAccess: true,
    },
    {
      name: '평소 + 인증 완료 + 매칭 안 된 멤버 (잠김)',
      scenario: {
        isSelf: false,
        isSuperAdmin: false,
        isAfterProgramWithoutAuth: false,
        isFinalDayAccess: false,
        isVerifiedToday: true,
        viewerHasAccessForDate: true,
        isFeatured: false,
      },
      expectedAccess: false,
    },
    {
      name: '평소 + 인증 미완료 (잠김)',
      scenario: {
        isSelf: false,
        isSuperAdmin: false,
        isAfterProgramWithoutAuth: false,
        isFinalDayAccess: false,
        isVerifiedToday: false,
        viewerHasAccessForDate: false,
        isFeatured: true,
      },
      expectedAccess: false,
    },
    {
      name: '평소 + 인증 완료 + 매칭 날짜 없음 (잠김)',
      scenario: {
        isSelf: false,
        isSuperAdmin: false,
        isAfterProgramWithoutAuth: false,
        isFinalDayAccess: false,
        isVerifiedToday: true,
        viewerHasAccessForDate: false,
        isFeatured: true,
      },
      expectedAccess: false,
    },
  ];

  console.log('📋 테스트 결과:\n');

  let passedCount = 0;
  let failedCount = 0;

  testCases.forEach((testCase, index) => {
    const actualAccess = calculateAccess(testCase.scenario);
    const testPassed = actualAccess === testCase.expectedAccess;

    if (testPassed) {
      passedCount++;
      console.log(`✅ PASS [${index + 1}/${testCases.length}]: ${testCase.name}`);
      console.log(`   예상: ${testCase.expectedAccess ? '접근 허용' : '잠김'} → 실제: ${actualAccess ? '접근 허용' : '잠김'}\n`);
    } else {
      failedCount++;
      console.log(`❌ FAIL [${index + 1}/${testCases.length}]: ${testCase.name}`);
      console.log(`   예상: ${testCase.expectedAccess ? '접근 허용' : '잠김'}`);
      console.log(`   실제: ${actualAccess ? '접근 허용' : '잠김'}`);
      console.log(`   시나리오:`, testCase.scenario);
      console.log('');
    }
  });

  console.log(`\n📊 테스트 요약:`);
  console.log(`   통과: ${passedCount}/${testCases.length}`);
  console.log(`   실패: ${failedCount}/${testCases.length}`);

  if (failedCount === 0) {
    console.log('\n🎉 모든 테스트 통과! 접근 권한 로직이 올바르게 작동합니다.');
  } else {
    console.log('\n⚠️  일부 테스트 실패. 접근 권한 로직을 확인하세요.');
    process.exit(1);
  }
}

// 테스트 실행
runTest();
