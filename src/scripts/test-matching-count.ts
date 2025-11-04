#!/usr/bin/env tsx
/**
 * 프로필북 전달 대상 카운트 테스트
 * 새벽 0-2시에 어제(11월 4일) 데이터가 표시되는지 확인
 */

import { getFirebaseAdmin } from '../lib/firebase/admin-init';
import { getMatchingTargetDate } from '../lib/date-utils';

async function testMatchingCount() {
  try {
    const { db } = getFirebaseAdmin();

    console.log('==================================================');
    console.log('프로필북 전달 대상 테스트');
    console.log('==================================================\n');

    const now = new Date();
    console.log('현재 시각:', now.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }));
    console.log('');

    // getMatchingTargetDate() 호출
    const targetDate = getMatchingTargetDate();
    console.log('getMatchingTargetDate() 결과:', targetDate);
    console.log('');

    // 해당 날짜의 제출물 조회
    const submissionsSnap = await db
      .collection('reading_submissions')
      .where('submissionDate', '==', targetDate)
      .where('status', '!=', 'draft')
      .get();

    console.log(`📊 ${targetDate} 제출 현황:`)
    console.log('--------------------------------------------------');
    console.log(`총 제출물: ${submissionsSnap.size}개`);

    // 참가자별로 그룹화 (중복 제거)
    const uniqueParticipants = new Set<string>();
    submissionsSnap.docs.forEach(doc => {
      const data = doc.data();
      uniqueParticipants.add(data.participantId);
    });

    console.log(`유니크 참가자: ${uniqueParticipants.size}명`);
    console.log('');

    // cohortId=2인 참가자만 필터링
    const cohort2Participants = new Set<string>();
    const ghostParticipants = new Set<string>();
    const superAdmins = new Set<string>();

    for (const participantId of uniqueParticipants) {
      const participantDoc = await db
        .collection('participants')
        .doc(participantId)
        .get();

      if (participantDoc.exists) {
        const data = participantDoc.data();

        if (data?.cohortId === '2') {
          if (data.isGhost) {
            ghostParticipants.add(participantId);
          } else if (data.isSuperAdmin) {
            superAdmins.add(participantId);
          } else {
            cohort2Participants.add(participantId);
          }
        }
      }
    }

    console.log('📈 필터링 결과:');
    console.log('--------------------------------------------------');
    console.log(`2기 참가자 (카운트 포함): ${cohort2Participants.size}명`);
    console.log(`고스트 참가자 (제외): ${ghostParticipants.size}명`);
    console.log(`슈퍼 관리자 (제외): ${superAdmins.size}명`);
    console.log('');

    console.log('✅ 프로필북 전달 대상:', cohort2Participants.size + '명');
    console.log('');

    // 예상 결과와 비교
    console.log('🔍 검증:');
    console.log('--------------------------------------------------');
    const hour = now.getHours();
    if (hour < 2) {
      console.log('현재 0-2시: 어제(11월 4일) 데이터를 표시해야 함');
      if (targetDate === '2025-11-04') {
        console.log('✅ 정상: 11월 4일 데이터 표시');
      } else {
        console.log('❌ 오류: 11월 4일이 아닌 ' + targetDate + ' 데이터 표시');
      }
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  }
}

// 실행
testMatchingCount()
  .then(() => {
    console.log('\n✅ 테스트 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 실행 실패:', error);
    process.exit(1);
  });