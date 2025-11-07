#!/usr/bin/env tsx
/**
 * 11월 4일 인증자 현황 확인 스크립트
 * - 드래프트 제외
 * - 중복 제출 확인
 * - 최종 유효 인증자 수 계산
 */

import { getFirebaseAdmin } from '../lib/firebase/admin-init';

async function checkNov4Submissions() {
  try {
    const { db } = getFirebaseAdmin();

    console.log('==================================================');
    console.log('11월 4일 인증자 현황 조회');
    console.log('==================================================\n');

    // 11월 4일 모든 제출물 조회
    const submissionsSnap = await db
      .collection('reading_submissions')
      .where('submissionDate', '==', '2025-11-04')
      .get();

    console.log(`📊 11월 4일 전체 제출물: ${submissionsSnap.size}개\n`);

    // 상태별 분류
    const byStatus = {
      draft: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
    };

    // 참가자별 제출물 그룹화
    const participantSubmissions = new Map<string, any[]>();

    submissionsSnap.docs.forEach(doc => {
      const data = doc.data();
      const status = data.status || 'draft';
      byStatus[status]++;

      if (!participantSubmissions.has(data.participantId)) {
        participantSubmissions.set(data.participantId, []);
      }
      participantSubmissions.get(data.participantId)!.push({
        id: doc.id,
        ...data,
        submittedAt: data.submittedAt?.toDate()
      });
    });

    console.log('📈 상태별 분류:');
    console.log('--------------------------------------------------');
    console.log(`✅ approved: ${byStatus.approved}개`);
    console.log(`⏳ pending: ${byStatus.pending}개`);
    console.log(`📝 draft: ${byStatus.draft}개`);
    console.log(`❌ rejected: ${byStatus.rejected}개`);
    console.log('');

    // 중복 제출 확인
    const duplicateUsers = new Map<string, any[]>();
    const validSubmissions = new Map<string, any>();

    for (const [participantId, submissions] of participantSubmissions) {
      // draft가 아닌 제출물만 필터링
      const nonDraftSubmissions = submissions.filter(s => s.status !== 'draft');

      if (nonDraftSubmissions.length > 1) {
        // 중복 제출 발견
        duplicateUsers.set(participantId, nonDraftSubmissions);

        // 최초 제출만 유효 (submittedAt 기준 정렬)
        const sorted = nonDraftSubmissions.sort((a, b) =>
          a.submittedAt.getTime() - b.submittedAt.getTime()
        );
        validSubmissions.set(participantId, sorted[0]);
      } else if (nonDraftSubmissions.length === 1) {
        // 단일 제출
        validSubmissions.set(participantId, nonDraftSubmissions[0]);
      }
    }

    console.log('🔍 중복 제출 현황:');
    console.log('--------------------------------------------------');
    if (duplicateUsers.size > 0) {
      for (const [participantId, submissions] of duplicateUsers) {
        // 참가자 정보 조회
        const participantDoc = await db.collection('participants').doc(participantId).get();
        const participantName = participantDoc.exists ? participantDoc.data()?.name : 'Unknown';

        console.log(`\n👤 ${participantName} (${participantId}):`);
        submissions.forEach((sub, index) => {
          console.log(`  ${index + 1}. ID: ${sub.id}`);
          console.log(`     상태: ${sub.status}`);
          console.log(`     제출시간: ${sub.submittedAt?.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`);
          console.log(`     ${index === 0 ? '✅ 유효 (최초 제출)' : '❌ 중복 (드래프트 처리 필요)'}`);
        });
      }
    } else {
      console.log('✅ 중복 제출 없음');
    }
    console.log('');

    // cohortId=2인 참가자만 필터링
    const cohort2Participants = new Set<string>();
    const ghostParticipants = new Set<string>();
    const superAdmins = new Set<string>();
    const otherCohorts = new Set<string>();

    for (const participantId of validSubmissions.keys()) {
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
        } else {
          otherCohorts.add(participantId);
        }
      }
    }

    console.log('📊 최종 유효 인증자 (중복 제외, 드래프트 제외):');
    console.log('--------------------------------------------------');
    console.log(`전체 유효 인증자: ${validSubmissions.size}명`);
    console.log('');
    console.log('기수별 분류:');
    console.log(`  2기 일반 참가자: ${cohort2Participants.size}명`);
    console.log(`  고스트 참가자: ${ghostParticipants.size}명`);
    console.log(`  슈퍼 관리자: ${superAdmins.size}명`);
    console.log(`  다른 기수: ${otherCohorts.size}명`);
    console.log('');

    console.log('✨ 관리자 화면 표시 대상:');
    console.log('--------------------------------------------------');
    console.log(`프로필북 전달 대상: ${cohort2Participants.size}명`);
    console.log('(2기 일반 참가자만 카운트, 고스트/슈퍼관리자 제외)');
    console.log('');

    // 중복 제출자 목록
    if (duplicateUsers.size > 0) {
      console.log('⚠️  중복 제출자 목록 (드래프트 처리 필요):');
      console.log('--------------------------------------------------');
      const duplicateList = [];
      for (const [participantId, submissions] of duplicateUsers) {
        const participantDoc = await db.collection('participants').doc(participantId).get();
        const participantName = participantDoc.exists ? participantDoc.data()?.name : 'Unknown';

        // 최초 제출 제외한 나머지
        const duplicates = submissions.slice(1);
        duplicateList.push({
          name: participantName,
          participantId,
          duplicateCount: duplicates.length,
          duplicateIds: duplicates.map(s => s.id)
        });
      }

      duplicateList.forEach(item => {
        console.log(`- ${item.name}: ${item.duplicateCount}개 중복`);
        console.log(`  처리 대상 ID: ${item.duplicateIds.join(', ')}`);
      });
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  }
}

// 실행
checkNov4Submissions()
  .then(() => {
    console.log('\n✅ 조회 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 실행 실패:', error);
    process.exit(1);
  });