#!/usr/bin/env tsx
/**
 * 날짜 로직 테스트 스크립트
 * 2AM 마감 정책이 올바르게 작동하는지 검증
 */

import { getSubmissionDate, getMatchingTargetDate, getTodayString, getYesterdayString } from '../lib/date-utils';

function testDateLogic() {
  console.log('==================================================');
  console.log('날짜 로직 테스트');
  console.log('==================================================\n');

  const now = new Date();
  const hour = now.getHours();

  console.log('현재 시각:', now.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }));
  console.log('현재 시간대:', hour + '시');
  console.log('');

  console.log('📅 날짜 함수 결과:');
  console.log('--------------------------------------------------');
  console.log('getTodayString():', getTodayString());
  console.log('getYesterdayString():', getYesterdayString());
  console.log('getSubmissionDate():', getSubmissionDate());
  console.log('getMatchingTargetDate():', getMatchingTargetDate());
  console.log('');

  console.log('🔍 로직 검증:');
  console.log('--------------------------------------------------');

  if (hour < 2) {
    console.log('현재: 0-2시 (새벽 시간대)');
    console.log('');
    console.log('✅ getSubmissionDate()가 어제 날짜를 반환해야 함');
    console.log('   → 제출은 어제로 카운트 (어제가 아직 진행 중)');
    console.log('');
    console.log('✅ getMatchingTargetDate()가 어제 날짜를 반환해야 함');
    console.log('   → 프로필북 전달 대상은 어제 제출자 (계속 유지)');

    const yesterday = getYesterdayString();
    const submissionDate = getSubmissionDate();
    const matchingDate = getMatchingTargetDate();

    if (submissionDate === yesterday) {
      console.log('\n✅ getSubmissionDate() 정상: 어제 날짜 반환');
    } else {
      console.log('\n❌ getSubmissionDate() 오류: 어제가 아닌 날짜 반환');
    }

    if (matchingDate === yesterday) {
      console.log('✅ getMatchingTargetDate() 정상: 어제 날짜 반환');
    } else {
      console.log('❌ getMatchingTargetDate() 오류: 어제가 아닌 날짜 반환');
    }
  } else {
    console.log('현재: 2시 이후 (일반 시간대)');
    console.log('');
    console.log('✅ getSubmissionDate()가 오늘 날짜를 반환해야 함');
    console.log('   → 제출은 오늘로 카운트');
    console.log('');
    console.log('✅ getMatchingTargetDate()가 어제 날짜를 반환해야 함');
    console.log('   → 프로필북 전달 대상은 어제 제출자 (마감됨)');

    const today = getTodayString();
    const yesterday = getYesterdayString();
    const submissionDate = getSubmissionDate();
    const matchingDate = getMatchingTargetDate();

    if (submissionDate === today) {
      console.log('\n✅ getSubmissionDate() 정상: 오늘 날짜 반환');
    } else {
      console.log('\n❌ getSubmissionDate() 오류: 오늘이 아닌 날짜 반환');
    }

    if (matchingDate === yesterday) {
      console.log('✅ getMatchingTargetDate() 정상: 어제 날짜 반환');
    } else {
      console.log('❌ getMatchingTargetDate() 오류: 어제가 아닌 날짜 반환');
    }
  }

  console.log('\n==================================================');
  console.log('테스트 완료');
  console.log('==================================================');
}

// 실행
testDateLogic();