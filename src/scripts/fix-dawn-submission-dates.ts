#!/usr/bin/env tsx

/**
 * 새벽 인증자 submissionDate 수정 스크립트
 *
 * 2025-10-28 새벽(00:00~01:59)에 인증한 사용자들의 submissionDate가
 * 잘못 2025-10-27로 기록된 문제를 수정합니다.
 *
 * 영향받은 사용자:
 * - 10/28 00:56 제출한 사용자들
 *
 * 실행 방법:
 * npx tsx src/scripts/fix-dawn-submission-dates.ts
 */

import { Timestamp } from 'firebase-admin/firestore';
import { getFirebaseAdmin } from '@/lib/firebase/admin-init';
import { getDailyQuestionText } from '@/constants/daily-questions';

async function fixDawnSubmissionDates() {
  console.log('🔧 새벽 인증자 submissionDate 수정 시작...\n');

  // Firebase Admin Firestore 인스턴스 (Seoul DB)
  const { db } = getFirebaseAdmin();

  // 영향받은 제출물 찾기 (2025-10-28 00:00~02:00 사이 제출)
  const startTime = new Date('2025-10-28T00:00:00+09:00'); // KST
  const endTime = new Date('2025-10-28T02:00:00+09:00');   // KST

  console.log(`🔍 검색 조건:`);
  console.log(`  - 제출 시간: ${startTime.toLocaleString('ko-KR')} ~ ${endTime.toLocaleString('ko-KR')}`);
  console.log(`  - submissionDate: 2025-10-27 (잘못된 날짜)`);
  console.log(`  - status: approved\n`);

  try {
    // 1. 먼저 해당 날짜의 모든 제출물 가져오기
    const allSubmissionsSnap = await db
      .collection('reading_submissions')
      .where('submissionDate', '==', '2025-10-27')
      .where('status', '==', 'approved')
      .get();

    // 2. 클라이언트에서 시간 필터링
    const submissionsToFix = allSubmissionsSnap.docs.filter(doc => {
      const data = doc.data();
      const submittedAt = data.submittedAt?.toDate();
      return submittedAt && submittedAt >= startTime && submittedAt <= endTime;
    });

    if (submissionsToFix.length === 0) {
      console.log('✅ 수정할 제출물이 없습니다. (이미 수정되었거나 해당 조건의 데이터가 없음)\n');
      return;
    }

    console.log(`📊 발견된 제출물: ${submissionsToFix.length}개\n`);

    // 2. 각 제출물 수정
    const correctDate = '2025-10-28';
    const correctQuestion = getDailyQuestionText(correctDate);
    let updatedCount = 0;

    for (const doc of submissionsToFix) {
      const data = doc.data();
      const submittedAt = data.submittedAt?.toDate();

      console.log(`\n📝 제출물 ID: ${doc.id}`);
      console.log(`  - 참가자: ${data.participantId}`);
      console.log(`  - 제출 시간: ${submittedAt?.toLocaleString('ko-KR')}`);
      console.log(`  - 현재 submissionDate: ${data.submissionDate}`);
      console.log(`  - 현재 질문: ${data.dailyQuestion}`);

      // 업데이트 실행
      await doc.ref.update({
        submissionDate: correctDate,
        dailyQuestion: correctQuestion,
        // 메타 정보 추가 (수정 이력)
        lastModified: Timestamp.now(),
        modificationNote: 'Fixed dawn submission date (2025-10-28 새벽 제출분 날짜 수정)'
      });

      console.log(`  ✅ 수정 완료:`);
      console.log(`     - submissionDate: ${correctDate}`);
      console.log(`     - dailyQuestion: ${correctQuestion}`);

      updatedCount++;
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ 수정 완료: 총 ${updatedCount}개의 제출물이 수정되었습니다.`);
    console.log('='.repeat(60));

    // 3. 수정 결과 검증
    console.log('\n🔍 수정 결과 검증 중...');

    // 수정된 날짜의 모든 제출물 가져와서 필터링
    const verifySnap = await db
      .collection('reading_submissions')
      .where('submissionDate', '==', correctDate)
      .get();

    const verifiedSubmissions = verifySnap.docs.filter(doc => {
      const data = doc.data();
      const submittedAt = data.submittedAt?.toDate();
      return submittedAt && submittedAt >= startTime && submittedAt <= endTime &&
             data.dailyQuestion === correctQuestion;
    });

    console.log(`✅ 2025-10-28 날짜로 수정된 제출물: ${verifiedSubmissions.length}개`);

    // 혹시 남아있는 잘못된 데이터 확인
    const remainingCheckSnap = await db
      .collection('reading_submissions')
      .where('submissionDate', '==', '2025-10-27')
      .get();

    const remainingWrong = remainingCheckSnap.docs.filter(doc => {
      const data = doc.data();
      const submittedAt = data.submittedAt?.toDate();
      return submittedAt && submittedAt >= startTime && submittedAt <= endTime;
    });

    if (remainingWrong.length > 0) {
      console.log(`⚠️ 경고: 아직 수정되지 않은 제출물이 ${remainingWrong.length}개 남아있습니다.`);
      console.log('   (draft 상태이거나 다른 조건 때문일 수 있습니다)');
    } else {
      console.log(`✅ 모든 새벽 제출물이 정상적으로 수정되었습니다.`);
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  }
}

// 스크립트 실행
fixDawnSubmissionDates()
  .then(() => {
    console.log('\n✨ 스크립트 실행 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 스크립트 실행 실패:', error);
    process.exit(1);
  });
