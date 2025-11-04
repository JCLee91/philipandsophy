#!/usr/bin/env tsx
/**
 * 11월 3일 인증자 확인
 */

import { getFirebaseAdmin } from '../lib/firebase/admin-init';

async function checkNov3Submissions() {
  try {
    const { db } = getFirebaseAdmin();

    console.log('==================================================');
    console.log('11월 3일 인증자 조회');
    console.log('==================================================\n');

    // 11월 3일 제출물 조회
    const submissionsSnap = await db
      .collection('reading_submissions')
      .where('submissionDate', '==', '2025-11-03')
      .where('status', '!=', 'draft')
      .get();

    console.log(`총 제출물: ${submissionsSnap.size}개\n`);

    // 참가자별로 그룹화 (중복 제거)
    const uniqueParticipants = new Set<string>();
    const participantSubmissions = new Map<string, any[]>();

    submissionsSnap.docs.forEach(doc => {
      const data = doc.data();
      const participantId = data.participantId;

      uniqueParticipants.add(participantId);

      if (!participantSubmissions.has(participantId)) {
        participantSubmissions.set(participantId, []);
      }
      participantSubmissions.get(participantId)!.push({
        id: doc.id,
        ...data
      });
    });

    console.log(`유니크 참가자: ${uniqueParticipants.size}명\n`);

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
          // 고스트와 슈퍼관리자 체크
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

    console.log('📊 필터링 결과:');
    console.log('--------------------------------------------------');
    console.log(`2기 참가자 (카운트 포함): ${cohort2Participants.size}명`);
    console.log(`고스트 참가자 (제외): ${ghostParticipants.size}명`);
    console.log(`슈퍼 관리자 (제외): ${superAdmins.size}명`);

    console.log('\n✅ 최종 프로필북 전달 대상: ' + cohort2Participants.size + '명');

    // 중복 제출 확인
    console.log('\n📋 중복 제출 현황:');
    console.log('--------------------------------------------------');
    let hasDuplicates = false;
    for (const [participantId, submissions] of participantSubmissions.entries()) {
      if (submissions.length > 1) {
        hasDuplicates = true;
        const participantDoc = await db
          .collection('participants')
          .doc(participantId)
          .get();
        const name = participantDoc.data()?.name || '이름 없음';

        console.log(`${name} (${participantId}): ${submissions.length}개 제출`);
        submissions.forEach(sub => {
          console.log(`  - ${sub.bookTitle} (${sub.status})`);
        });
      }
    }

    if (!hasDuplicates) {
      console.log('중복 제출 없음');
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  }
}

// 실행
checkNov3Submissions()
  .then(() => {
    console.log('\n✅ 조회 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 실행 실패:', error);
    process.exit(1);
  });