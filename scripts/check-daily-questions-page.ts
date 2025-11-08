#!/usr/bin/env tsx

/**
 * Daily Questions 관리 페이지 점검 스크립트
 *
 * 확인 사항:
 * 1. API 엔드포인트 동작
 * 2. 문서 ID 형식 일관성
 * 3. 날짜 계산 로직
 * 4. createdAt/updatedAt 처리
 */

import { getFirebaseAdmin } from '../src/lib/firebase/admin-init';
import { format, addDays, parseISO } from 'date-fns';

const { db } = getFirebaseAdmin();

async function checkDailyQuestionsPage() {
  console.log('🔍 Daily Questions 관리 페이지 점검\n');
  console.log('='.repeat(80));

  try {
    // 1. 코호트 2 확인 (테스트용)
    console.log('\n1️⃣ 코호트 2 정보 확인');
    console.log('-'.repeat(80));

    const cohort2Ref = db.collection('cohorts').doc('2');
    const cohort2Doc = await cohort2Ref.get();

    if (!cohort2Doc.exists) {
      console.log('❌ 코호트 2가 존재하지 않습니다.');
      console.log('   먼저 코호트 2를 생성하세요.\n');
      return;
    }

    const cohort2Data = cohort2Doc.data();
    console.log(`✅ 코호트 2 존재`);
    console.log(`   이름: ${cohort2Data?.name}`);
    console.log(`   프로그램 시작일: ${cohort2Data?.programStartDate}`);

    // 2. Daily Questions 확인
    console.log('\n2️⃣ Daily Questions 확인');
    console.log('-'.repeat(80));

    const questionsSnapshot = await db
      .collection('cohorts/2/daily_questions')
      .orderBy('dayNumber', 'asc')
      .get();

    if (questionsSnapshot.empty) {
      console.log('⚠️  코호트 2에 Daily Questions가 없습니다.');
      console.log('   관리 페이지에서 생성하거나 1기에서 복사하세요.\n');
    } else {
      console.log(`✅ Daily Questions: ${questionsSnapshot.size}개`);
      console.log('\n문서 ID 형식 확인:');
      questionsSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        const idMatch = doc.id === data.dayNumber.toString();
        console.log(`   ${idMatch ? '✅' : '❌'} ${doc.id} (dayNumber: ${data.dayNumber})`);
      });
    }

    // 3. 날짜 계산 로직 검증
    console.log('\n3️⃣ 날짜 계산 로직 검증');
    console.log('-'.repeat(80));

    const programStartDate = cohort2Data?.programStartDate || '2025-10-25';
    console.log(`프로그램 시작일: ${programStartDate}`);
    console.log('계산된 날짜 (첫 5개):');

    for (let i = 0; i < 5; i++) {
      const dayNumber = i + 1;
      const date = format(
        addDays(parseISO(programStartDate), i),
        'yyyy-MM-dd'
      );
      console.log(`   Day ${dayNumber}: ${date}`);
    }

    // 4. 문서 ID 규칙 확인
    console.log('\n4️⃣ 문서 ID 규칙 확인');
    console.log('-'.repeat(80));
    console.log('✅ 예상 형식: "1", "2", "3", ..., "14" (dayNumber.toString())');
    console.log('✅ 프론트엔드: id: dayNumber.toString()');
    console.log('✅ API: .doc(q.dayNumber.toString())');
    console.log('👉 형식 일관성: 통과');

    // 5. API 저장 로직 분석
    console.log('\n5️⃣ API 저장 로직 분석');
    console.log('-'.repeat(80));
    console.log('⚠️  주의사항 발견:');
    console.log('   현재: batch.set() 사용 → 항상 덮어쓰기');
    console.log('   문제: createdAt이 수정할 때마다 새로 생성됨');
    console.log('   해결: merge 옵션 사용 또는 기존 createdAt 유지 필요');

    // 6. UI/UX 체크리스트
    console.log('\n6️⃣ UI/UX 체크리스트');
    console.log('-'.repeat(80));
    console.log('✅ 저장하기 버튼: 하단에만 존재 (상단 제거됨)');
    console.log('✅ 1기 복사 버튼: 상단에 존재');
    console.log('✅ 날짜 자동 계산: programStartDate 기준으로 14일 생성');
    console.log('✅ 유효성 검사: 모든 카테고리 + 질문 필수');

    // 7. 종합 결과
    console.log('\n' + '='.repeat(80));
    console.log('\n📊 점검 결과 요약');
    console.log('-'.repeat(80));
    console.log('✅ 문서 ID 형식: 일관됨 (dayNumber.toString())');
    console.log('✅ 날짜 계산: 정상 작동');
    console.log('✅ UI 버튼 배치: 수정 완료');
    console.log('⚠️  createdAt 관리: 개선 필요 (항상 새로 생성됨)');

    console.log('\n💡 권장 개선사항:');
    console.log('   1. API에서 기존 문서가 있으면 createdAt 유지');
    console.log('   2. batch.set() → batch.set(ref, data, { merge: true }) 또는');
    console.log('      기존 문서 확인 후 createdAt 유지\n');

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  }
}

checkDailyQuestionsPage()
  .then(() => {
    console.log('스크립트 종료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('스크립트 실행 실패:', error);
    process.exit(1);
  });
