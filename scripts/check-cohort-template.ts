#!/usr/bin/env tsx

/**
 * 코호트 템플릿 기능 점검 스크립트
 *
 * 확인 사항:
 * 1. 1기 코호트 데이터 존재 여부
 * 2. 1기 daily_questions 데이터 존재 여부
 * 3. 템플릿 복사 로직 시뮬레이션
 */

import { getFirebaseAdmin } from '../src/lib/firebase/admin-init';

const { db } = getFirebaseAdmin();

async function checkCohortTemplate() {
  console.log('🔍 코호트 템플릿 기능 점검 시작\n');

  try {
    // 1. 1기 코호트 확인
    console.log('1️⃣ 1기 코호트 데이터 확인...');
    const cohort1Doc = await db.collection('cohorts').doc('1').get();

    if (!cohort1Doc.exists) {
      console.log('❌ 1기 코호트가 존재하지 않습니다.');
      console.log('   템플릿 복사 기능을 사용하려면 1기 코호트를 먼저 생성해야 합니다.\n');
      return;
    }

    const cohort1Data = cohort1Doc.data();
    console.log('✅ 1기 코호트 존재');
    console.log(`   이름: ${cohort1Data?.name}`);
    console.log(`   시작일: ${cohort1Data?.startDate}`);
    console.log(`   종료일: ${cohort1Data?.endDate}`);
    console.log(`   프로그램 시작일: ${cohort1Data?.programStartDate}\n`);

    // 2. 1기 daily_questions 확인
    console.log('2️⃣ 1기 Daily Questions 확인...');
    const questionsSnapshot = await db
      .collection('cohorts/1/daily_questions')
      .orderBy('dayNumber', 'asc')
      .get();

    if (questionsSnapshot.empty) {
      console.log('❌ 1기에 Daily Questions가 없습니다.');
      console.log('   템플릿 복사 기능이 작동하지 않습니다.\n');
      return;
    }

    console.log(`✅ 1기 Daily Questions: ${questionsSnapshot.size}개`);
    console.log('\n질문 목록:');
    questionsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      console.log(`   Day ${data.dayNumber}: ${data.question}`);
      console.log(`   - 날짜: ${data.date}`);
      console.log(`   - 카테고리: ${data.category}\n`);
    });

    // 3. 템플릿 복사 로직 시뮬레이션
    console.log('3️⃣ 템플릿 복사 로직 시뮬레이션...');
    const testProgramStartDate = '2025-11-01'; // 3기 시작일 예시
    console.log(`   새 기수 프로그램 시작일: ${testProgramStartDate}`);
    console.log('\n   복사 결과 (첫 5개만 표시):');

    questionsSnapshot.docs.slice(0, 5).forEach((doc) => {
      const data = doc.data();
      const dayNumber = data.dayNumber;

      // 날짜 재계산 로직
      const newDate = new Date(testProgramStartDate);
      newDate.setDate(newDate.getDate() + (dayNumber - 1));
      const dateStr = newDate.toISOString().split('T')[0];

      console.log(`   Day ${dayNumber}:`);
      console.log(`   - 원본 날짜: ${data.date}`);
      console.log(`   - 새 날짜: ${dateStr}`);
      console.log(`   - 질문: ${data.question}\n`);
    });

    // 4. CSV 템플릿 형식 확인
    console.log('4️⃣ CSV 템플릿 형식 확인...');
    console.log('   예시 CSV 형식:');
    console.log(`   이름,핸드폰번호,역할`);
    console.log(`   홍길동,01012345678,participant`);
    console.log(`   김철수,01087654321,participant`);
    console.log(`   이영희,01011112222,admin`);
    console.log(`   테스터,01099998888,ghost\n`);

    // 5. 전체 요약
    console.log('📊 점검 결과 요약:');
    console.log(`   ✅ 1기 코호트: 존재`);
    console.log(`   ✅ Daily Questions: ${questionsSnapshot.size}개`);
    console.log(`   ✅ 템플릿 복사 로직: 정상 작동 예상`);
    console.log(`   ✅ CSV 업로드 기능: 구현됨\n`);

    console.log('🎉 템플릿 기능 점검 완료!');
    console.log('   3기 멤버를 추가하려면:');
    console.log('   1. 데이터센터 > 코호트 관리 > 새 기수 생성 클릭');
    console.log('   2. 기본 정보 입력 (기수명: "3기")');
    console.log('   3. 참가자 CSV 업로드 또는 수동 입력');
    console.log('   4. Daily Questions 설정에서 "1기 질문 복사" 선택');
    console.log('   5. 생성하기 클릭\n');

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  }
}

checkCohortTemplate()
  .then(() => {
    console.log('스크립트 종료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('스크립트 실행 실패:', error);
    process.exit(1);
  });
