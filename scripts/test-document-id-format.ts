#!/usr/bin/env tsx

/**
 * Firebase 문서 ID 형식 테스트
 *
 * 코호트: 숫자만 (예: "1", "2", "3")
 * 참가자: cohort{기수}-{이름(성제외)} (예: "cohort3-철수", "cohort3-영희2")
 */

// 이름에서 성 제외하는 함수 (API와 동일)
function getGivenName(fullName: string): string {
  if (fullName.length === 2) {
    return fullName.substring(1); // "김철" → "철"
  } else if (fullName.length >= 3) {
    return fullName.substring(1); // "홍길동" → "길동", "남궁민수" → "궁민수"
  }
  return fullName; // 1자는 그대로
}

// 코호트 ID 생성
function generateCohortId(name: string): string {
  return name.replace(/[^0-9]/g, '');
}

// 참가자 ID 생성
function generateParticipantIds(cohortId: string, participants: { name: string }[]): string[] {
  const nameCountMap = new Map<string, number>();
  const participantIds: string[] = [];

  for (const p of participants) {
    const givenName = getGivenName(p.name);

    // 중복 이름 처리
    const count = nameCountMap.get(givenName) || 0;
    nameCountMap.set(givenName, count + 1);

    // 알파벳 suffix: A, B, C, D, ...
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const participantId = count === 0
      ? `cohort${cohortId}-${givenName}`                         // 첫 번째
      : `cohort${cohortId}-${givenName}${alphabet[count - 1]}`; // 두 번째 이후

    participantIds.push(participantId);
  }

  return participantIds;
}

console.log('📋 Firebase 문서 ID 형식 테스트\n');
console.log('='.repeat(80));

// 테스트 케이스 1: 코호트 ID
console.log('\n1️⃣ 코호트 ID 생성 테스트');
console.log('-'.repeat(80));

const cohortTests = [
  { input: '1기', expected: '1' },
  { input: '2기', expected: '2' },
  { input: '3기', expected: '3' },
  { input: '10기', expected: '10' },
  { input: '제3기', expected: '3' },
];

cohortTests.forEach((test) => {
  const result = generateCohortId(test.input);
  const passed = result === test.expected;
  console.log(`${passed ? '✅' : '❌'} "${test.input}" → "${result}" (예상: "${test.expected}")`);
});

// 테스트 케이스 2: 참가자 ID (중복 없음)
console.log('\n2️⃣ 참가자 ID 생성 테스트 (중복 없음)');
console.log('-'.repeat(80));

const participants1 = [
  { name: '홍길동' },
  { name: '김철수' },
  { name: '이영희' },
  { name: '박민수' },
];

const participantIds1 = generateParticipantIds('3', participants1);
console.log('입력:', participants1.map(p => p.name).join(', '));
console.log('결과:');
participantIds1.forEach((id, i) => {
  console.log(`  ${participants1[i].name} → ${id}`);
});

// 테스트 케이스 3: 참가자 ID (중복 있음)
console.log('\n3️⃣ 참가자 ID 생성 테스트 (중복 있음)');
console.log('-'.repeat(80));

const participants2 = [
  { name: '김철수' },
  { name: '이철수' },
  { name: '박철수' },
  { name: '홍길동' },
  { name: '남궁길동' },
];

const participantIds2 = generateParticipantIds('3', participants2);
console.log('입력:', participants2.map(p => p.name).join(', '));
console.log('결과:');
participantIds2.forEach((id, i) => {
  console.log(`  ${participants2[i].name} → ${id}`);
});

// 테스트 케이스 4: 특수 케이스
console.log('\n4️⃣ 특수 케이스 테스트');
console.log('-'.repeat(80));

const participants3 = [
  { name: '김철' },      // 2자 이름
  { name: '이' },        // 1자 이름 (성만)
  { name: '남궁민수' },  // 복성
  { name: '홍길동삼' },  // 4자 이름
];

const participantIds3 = generateParticipantIds('3', participants3);
console.log('입력:', participants3.map(p => p.name).join(', '));
console.log('결과:');
participantIds3.forEach((id, i) => {
  console.log(`  ${participants3[i].name} → ${id}`);
});

console.log('\n' + '='.repeat(80));
console.log('\n🎉 테스트 완료!');
console.log('\n📌 규칙 요약:');
console.log('   - 코호트: 기수명에서 숫자만 추출 (예: "3기" → "3")');
console.log('   - 참가자: cohort{기수}-{이름(성제외)} (예: "홍길동" → "cohort3-길동")');
console.log('   - 중복: 같은 이름 2번째부터 알파벳 추가 (예: "cohort3-철수A", "cohort3-철수B")\n');
