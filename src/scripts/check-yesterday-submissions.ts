/**
 * 어제 제출 데이터 확인 스크립트
 *
 * AI 매칭이 안 되는 이유를 파악하기 위해
 * 어제 제출된 데이터의 필드값들을 확인합니다.
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAdminDb } from '@/lib/firebase/admin';
import { getYesterdayString } from '@/lib/date-utils';
import { getDailyQuestionText } from '@/constants/daily-questions';

const db = getAdminDb();

async function checkYesterdaySubmissions() {
  const yesterdayDate = getYesterdayString();
  const expectedQuestion = getDailyQuestionText(yesterdayDate);

  console.log('\n🔍 어제 제출 데이터 조회 중...\n');
  console.log('📅 예상 submissionDate:', yesterdayDate);
  console.log('❓ 예상 dailyQuestion:', expectedQuestion);
  console.log('');

  // 1. 모든 어제 제출 데이터 조회 (필터 없이)
  const allSubmissions = await db
    .collection('reading_submissions')
    .get();

  console.log(`📊 전체 제출 데이터: ${allSubmissions.size}개\n`);

  // 2. 어제 날짜 관련 데이터만 필터링
  const yesterdaySubmissions = allSubmissions.docs.filter(doc => {
    const data = doc.data();
    const submissionDate = data.submissionDate;

    // 어제 날짜와 유사한 패턴 찾기
    return submissionDate && (
      submissionDate === yesterdayDate ||
      submissionDate.includes(yesterdayDate.split('-')[1]) || // 월 일치
      submissionDate.includes(yesterdayDate.split('-')[2])    // 일 일치
    );
  });

  console.log(`📅 어제 관련 제출 데이터: ${yesterdaySubmissions.length}개\n`);

  if (yesterdaySubmissions.length === 0) {
    console.log('❌ 어제 제출 데이터가 없습니다.');
    console.log('\n💡 가능한 원인:');
    console.log('   1. submissionDate 필드가 다른 형식으로 저장됨');
    console.log('   2. 실제로 제출 데이터가 없음');
    console.log('   3. 날짜 계산이 잘못됨 (시간대 이슈)');

    // 최근 3개 제출 데이터 샘플 출력
    console.log('\n📝 최근 제출 데이터 샘플 (최대 3개):');
    allSubmissions.docs.slice(0, 3).forEach((doc, idx) => {
      const data = doc.data();
      console.log(`\n${idx + 1}. 문서 ID: ${doc.id}`);
      console.log(`   submissionDate: ${data.submissionDate}`);
      console.log(`   dailyQuestion: ${data.dailyQuestion?.substring(0, 50)}...`);
      console.log(`   participantId: ${data.participantId}`);
      console.log(`   cohortId: ${data.cohortId || '(없음)'}`);
    });

    return;
  }

  // 3. 데이터 분석
  const submissionDateValues = new Set<string>();
  const dailyQuestionValues = new Set<string>();
  const cohortIds = new Set<string>();
  const participantIds = new Set<string>();

  yesterdaySubmissions.forEach(doc => {
    const data = doc.data();
    submissionDateValues.add(data.submissionDate || '(null)');
    dailyQuestionValues.add(data.dailyQuestion || '(null)');
    cohortIds.add(data.cohortId || '(없음)');
    participantIds.add(data.participantId);
  });

  console.log('📊 데이터 분석 결과:');
  console.log(`   총 제출 수: ${yesterdaySubmissions.length}명`);
  console.log(`   고유 participantId: ${participantIds.size}명`);
  console.log('');

  console.log('🔑 submissionDate 값들:');
  submissionDateValues.forEach(value => {
    const count = yesterdaySubmissions.filter(doc => doc.data().submissionDate === value).length;
    const match = value === yesterdayDate ? '✅ 일치' : '❌ 불일치';
    console.log(`   - "${value}" (${count}개) ${match}`);
  });
  console.log('');

  console.log('❓ dailyQuestion 값들:');
  dailyQuestionValues.forEach(value => {
    const count = yesterdaySubmissions.filter(doc => doc.data().dailyQuestion === value).length;
    const match = value === expectedQuestion ? '✅ 일치' : '❌ 불일치';
    const preview = value.substring(0, 60);
    console.log(`   - "${preview}..." (${count}개) ${match}`);
  });
  console.log('');

  console.log('🏢 cohortId 값들:');
  cohortIds.forEach(value => {
    const count = yesterdaySubmissions.filter(doc => (doc.data().cohortId || '(없음)') === value).length;
    console.log(`   - "${value}" (${count}개)`);
  });
  console.log('');

  // 4. AI 매칭 조건으로 필터링 테스트
  const matchingFiltered = yesterdaySubmissions.filter(doc => {
    const data = doc.data();
    return data.submissionDate === yesterdayDate &&
           data.dailyQuestion === expectedQuestion;
  });

  console.log('🤖 AI 매칭 조건 필터링 결과:');
  console.log(`   조회될 참가자 수: ${matchingFiltered.length}명`);

  if (matchingFiltered.length > 0) {
    console.log('   ✅ AI 매칭 가능!');
    console.log('\n👥 매칭 대상 참가자 ID:');
    matchingFiltered.forEach((doc, idx) => {
      console.log(`   ${idx + 1}. ${doc.data().participantId}`);
    });
  } else {
    console.log('   ❌ AI 매칭 불가능 - 조건 불일치');
    console.log('\n💡 해결 방법:');
    console.log('   1. submissionDate 또는 dailyQuestion 값 수정 필요');
    console.log('   2. 랜덤 매칭 API 사용');
  }

  console.log('\n✅ 분석 완료\n');
}

checkYesterdaySubmissions()
  .then(() => {
    console.log('스크립트 실행 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  });
