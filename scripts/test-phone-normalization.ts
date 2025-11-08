#!/usr/bin/env tsx

/**
 * 전화번호 정규화 테스트 스크립트
 *
 * 다양한 형식의 전화번호가 올바르게 정규화되는지 테스트
 */

import { phoneFormatUtils } from '../src/constants/phone-format';

// 테스트 케이스
const testCases = [
  // 정상 케이스
  { input: '010-1234-5678', expected: '01012345678', description: '하이픈 형식' },
  { input: '01012345678', expected: '01012345678', description: '숫자만' },
  { input: '+821012345678', expected: '01012345678', description: '국제 형식 +82' },
  { input: '821012345678', expected: '01012345678', description: '국제 형식 82' },
  { input: '0821012345678', expected: '01012345678', description: '국제 형식 082' },
  { input: '010 1234 5678', expected: '01012345678', description: '공백 포함' },
  { input: '(010)1234-5678', expected: '01012345678', description: '괄호 포함' },
  { input: '+82-10-1234-5678', expected: '01012345678', description: '국제 형식 + 하이픈' },

  // 비정상 케이스 (null 반환 예상)
  { input: '02-1234-5678', expected: null, description: '일반 전화번호' },
  { input: '1234567890', expected: null, description: '잘못된 길이' },
  { input: '+8312345678', expected: null, description: '잘못된 국가 코드' },
  { input: '', expected: null, description: '빈 문자열' },
  { input: 'abc-defg-hijk', expected: null, description: '숫자 아님' },
];

console.log('📱 전화번호 정규화 테스트\n');
console.log('='.repeat(80));

let passCount = 0;
let failCount = 0;

testCases.forEach((testCase, index) => {
  const result = phoneFormatUtils.normalize(testCase.input);
  const passed = result === testCase.expected;

  if (passed) {
    passCount++;
    console.log(`\n✅ 테스트 ${index + 1}: ${testCase.description}`);
  } else {
    failCount++;
    console.log(`\n❌ 테스트 ${index + 1}: ${testCase.description}`);
  }

  console.log(`   입력: "${testCase.input}"`);
  console.log(`   예상: ${testCase.expected}`);
  console.log(`   결과: ${result}`);
});

console.log('\n' + '='.repeat(80));
console.log(`\n📊 테스트 결과: ${passCount}/${testCases.length} 통과`);

if (failCount === 0) {
  console.log('🎉 모든 테스트 통과!\n');
  process.exit(0);
} else {
  console.log(`⚠️  ${failCount}개 테스트 실패\n`);
  process.exit(1);
}
