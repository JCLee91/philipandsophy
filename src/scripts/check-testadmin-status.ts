#!/usr/bin/env tsx
/**
 * testadmin 계정 상태 확인
 */

import { getFirebaseAdmin } from '../lib/firebase/admin-init';

async function checkTestAdmin() {
  try {
    const { db } = getFirebaseAdmin();

    console.log('==================================================');
    console.log('testadmin 계정 상태 확인');
    console.log('==================================================\n');

    // testadmin 참가자 조회
    const participantDoc = await db
      .collection('participants')
      .doc('testadmin')
      .get();

    if (!participantDoc.exists) {
      console.log('❌ testadmin 계정을 찾을 수 없습니다.');
      return;
    }

    const data = participantDoc.data();

    console.log('📋 계정 정보:');
    console.log('--------------------------------------------------');
    console.log(`ID: ${participantDoc.id}`);
    console.log(`이름: ${data?.name || '없음'}`);
    console.log(`기수: ${data?.cohortId || '없음'}`);
    console.log(`역할: ${data?.role || '없음'}`);
    console.log('\n🔍 특수 플래그:');
    console.log(`isAdministrator: ${data?.isAdministrator === true ? '✅ true' : '❌ false'}`);
    console.log(`isSuperAdmin: ${data?.isSuperAdmin === true ? '✅ true' : '❌ false'}`);
    console.log(`isGhost: ${data?.isGhost === true ? '✅ true' : '❌ false'}`);
    console.log(`isTest: ${data?.isTest === true ? '✅ true' : '❌ false'}`);

    console.log('\n📊 매칭 관련:');
    console.log('--------------------------------------------------');

    // useYesterdaySubmissionCount의 필터링 로직
    const isExcludedFromYesterday = data?.isSuperAdmin || data?.isGhost;
    console.log(`어제 인증 카운트에서 제외?: ${isExcludedFromYesterday ? '✅ 제외됨' : '❌ 포함됨'}`);

    // useTodaySubmissionCount의 필터링 로직
    const isExcludedFromToday = data?.isSuperAdmin;
    console.log(`오늘 인증 카운트에서 제외?: ${isExcludedFromToday ? '✅ 제외됨' : '❌ 포함됨'}`);

    if (data?.isGhost && !isExcludedFromToday) {
      console.log('\n⚠️ 문제 발견:');
      console.log('isGhost=true이지만 오늘 인증 카운트에는 포함되고 있습니다.');
      console.log('useTodaySubmissionCount에서 isGhost 체크가 누락되어 있습니다.');
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  }
}

// 실행
checkTestAdmin()
  .then(() => {
    console.log('\n✅ 확인 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 실행 실패:', error);
    process.exit(1);
  });