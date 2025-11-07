#!/usr/bin/env tsx
/**
 * 관리자 매칭 분석 화면 표시 테스트
 * - 현재 시각 기준 날짜 계산 확인
 * - 카운트 계산 로직 검증
 */

import { getMatchingTargetDate, getSubmissionDate } from '../lib/date-utils';
import { getFirebaseAdmin } from '../lib/firebase/admin-init';

async function testAdminMatchingDisplay() {
  try {
    const { db } = getFirebaseAdmin();

    console.log('==================================================');
    console.log('관리자 매칭 분석 화면 표시 테스트');
    console.log('==================================================\n');

    const now = new Date();
    console.log('현재 시각:', now.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }));
    console.log('');

    // ✅ FIX: 새벽 2시 마감 정책 적용
    // 날짜 계산 (관리자 화면과 동일한 로직)
    const todayDate = getSubmissionDate(); // 매칭 키 (새벽 2시 기준)
    const submissionDate = getMatchingTargetDate(); // 매칭 대상 날짜
    const currentSubmissionDate = getSubmissionDate(); // 현재 제출 날짜

    console.log('📅 날짜 계산:');
    console.log('--------------------------------------------------');
    console.log(`오늘 날짜 (getSubmissionDate): ${todayDate}`);
    console.log(`제출 날짜 (getSubmissionDate): ${currentSubmissionDate}`);
    console.log(`매칭 대상 날짜 (getMatchingTargetDate): ${submissionDate}`);
    console.log('');

    // 1. 오늘의 인증 현황 (currentSubmissionDate 기준)
    console.log('📊 오늘의 인증 현황:');
    console.log('--------------------------------------------------');
    console.log(`조회 날짜: ${currentSubmissionDate}`);

    const todaySubmissionsSnap = await db
      .collection('reading_submissions')
      .where('submissionDate', '==', currentSubmissionDate)
      .where('status', '!=', 'draft')
      .get();

    // 참가자별 중복 제거
    const todayUniqueParticipants = new Set<string>();
    todaySubmissionsSnap.docs.forEach(doc => {
      const data = doc.data();
      todayUniqueParticipants.add(data.participantId);
    });

    // cohortId=2 필터링
    let todayValidCount = 0;
    for (const participantId of todayUniqueParticipants) {
      const participantDoc = await db.collection('participants').doc(participantId).get();
      if (participantDoc.exists) {
        const data = participantDoc.data();
        if (data?.cohortId === '2' && !data.isGhost && !data.isSuperAdmin) {
          todayValidCount++;
        }
      }
    }

    console.log(`총 제출물: ${todaySubmissionsSnap.size}개`);
    console.log(`유니크 참가자: ${todayUniqueParticipants.size}명`);
    console.log(`✅ 표시될 숫자: ${todayValidCount}명`);
    console.log('(2기 일반 참가자만, 고스트/슈퍼관리자 제외)');
    console.log('');

    // 2. 프로필북 전달 대상 (submissionDate 기준)
    console.log('📚 프로필북 전달 대상:');
    console.log('--------------------------------------------------');
    console.log(`조회 날짜: ${submissionDate}`);

    const targetSubmissionsSnap = await db
      .collection('reading_submissions')
      .where('submissionDate', '==', submissionDate)
      .where('status', '!=', 'draft')
      .get();

    // 참가자별 중복 제거
    const targetUniqueParticipants = new Set<string>();
    targetSubmissionsSnap.docs.forEach(doc => {
      const data = doc.data();
      targetUniqueParticipants.add(data.participantId);
    });

    // cohortId=2 필터링
    let targetValidCount = 0;
    for (const participantId of targetUniqueParticipants) {
      const participantDoc = await db.collection('participants').doc(participantId).get();
      if (participantDoc.exists) {
        const data = participantDoc.data();
        if (data?.cohortId === '2' && !data.isGhost && !data.isSuperAdmin) {
          targetValidCount++;
        }
      }
    }

    console.log(`총 제출물: ${targetSubmissionsSnap.size}개`);
    console.log(`유니크 참가자: ${targetUniqueParticipants.size}명`);
    console.log(`✅ 표시될 숫자: ${targetValidCount}명`);
    console.log('(2기 일반 참가자만, 고스트/슈퍼관리자 제외)');
    console.log('');

    // 3. 검증
    console.log('🔍 화면 표시 검증:');
    console.log('--------------------------------------------------');
    const hour = now.getHours();

    if (hour < 2) {
      console.log('현재 0-2시: 특수 시간대');
      console.log('');
      console.log('✅ 오늘의 인증 현황:');
      console.log(`   - ${currentSubmissionDate} 데이터 표시 (어제)`);
      console.log(`   - 현재 ${todayValidCount}명`);
      console.log('');
      console.log('✅ 프로필북 전달 대상:');
      console.log(`   - ${submissionDate} 데이터 표시 (이틀 전)`);
      console.log(`   - 현재 ${targetValidCount}명`);
      console.log('   - 이틀 전 데이터는 완료되어 안정적');
    } else {
      console.log('현재 2시 이후: 일반 시간대');
      console.log('');
      console.log('✅ 오늘의 인증 현황:');
      console.log(`   - ${currentSubmissionDate} 데이터 표시 (오늘)`);
      console.log(`   - 현재 ${todayValidCount}명`);
      console.log('');
      console.log('✅ 프로필북 전달 대상:');
      console.log(`   - ${submissionDate} 데이터 표시 (어제)`);
      console.log(`   - 현재 ${targetValidCount}명`);
      console.log('   - 어제 데이터는 완료되어 안정적');
    }

    console.log('');
    console.log('💡 결론:');
    console.log('--------------------------------------------------');
    if (submissionDate === '2025-11-04') {
      console.log('✅ 11월 4일 데이터가 정확히 표시됨');
      console.log(`✅ 20명이 프로필북 전달 대상으로 표시되어야 함`);
      console.log(`✅ 실제 표시: ${targetValidCount}명`);
      if (targetValidCount === 20) {
        console.log('✅ 정확히 일치!');
      } else {
        console.log('❌ 불일치 - 확인 필요');
      }
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  }
}

// 실행
testAdminMatchingDisplay()
  .then(() => {
    console.log('\n✅ 테스트 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 실행 실패:', error);
    process.exit(1);
  });