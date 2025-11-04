#!/usr/bin/env tsx
/**
 * 중복 제출물 정리 스크립트
 * 동일한 날짜에 같은 유저가 여러 번 제출한 경우,
 * 가장 처음 제출한 것만 남기고 나머지는 draft로 변경
 *
 * 사용법: npm run fix:duplicate-submissions
 */

import { getFirebaseAdmin } from '../lib/firebase/admin-init';
import { Timestamp } from 'firebase-admin/firestore';

async function fixDuplicateSubmissions() {
  try {
    const { db } = getFirebaseAdmin();

    console.log('==================================================');
    console.log('중복 제출물 정리 시작');
    console.log('==================================================');

    // 모든 제출물 조회
    const submissionsSnap = await db
      .collection('reading_submissions')
      .where('status', '==', 'approved')
      .get();

    console.log(`총 승인된 제출물: ${submissionsSnap.size}개\n`);

    // 날짜별, 유저별로 그룹화
    const submissionsByDateAndUser = new Map<string, any[]>();

    submissionsSnap.docs.forEach(doc => {
      const data = doc.data();
      const key = `${data.submissionDate}_${data.participantId}`;

      if (!submissionsByDateAndUser.has(key)) {
        submissionsByDateAndUser.set(key, []);
      }

      submissionsByDateAndUser.get(key)!.push({
        id: doc.id,
        data: data,
        createdAt: data.createdAt
      });
    });

    // 중복 제출 찾기
    const duplicates: any[] = [];

    for (const [key, submissions] of submissionsByDateAndUser.entries()) {
      if (submissions.length > 1) {
        const [date, participantId] = key.split('_');

        // createdAt 기준으로 정렬 (오래된 것부터)
        submissions.sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0;
          const bTime = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0;
          return aTime - bTime;
        });

        // 첫 번째는 유지, 나머지는 draft로 변경 대상
        const toKeep = submissions[0];
        const toDraft = submissions.slice(1);

        duplicates.push({
          participantId,
          submissionDate: date,
          total: submissions.length,
          keeping: toKeep,
          drafting: toDraft
        });
      }
    }

    if (duplicates.length === 0) {
      console.log('✅ 중복 제출물이 없습니다.');
      return;
    }

    console.log(`\n📋 중복 제출 발견: ${duplicates.length}명\n`);
    console.log('--------------------------------------------------');

    // 각 중복 케이스 출력
    for (const dup of duplicates) {
      // 참가자 정보 조회
      const participantDoc = await db
        .collection('participants')
        .doc(dup.participantId)
        .get();

      const participantName = participantDoc.exists
        ? participantDoc.data()?.name || '이름 없음'
        : '이름 없음';

      console.log(`\n👤 ${participantName} (${dup.participantId})`);
      console.log(`   📅 날짜: ${dup.submissionDate}`);
      console.log(`   📚 총 제출물: ${dup.total}개`);

      const keepTime = dup.keeping.createdAt?.toDate?.() || new Date(dup.keeping.createdAt.seconds * 1000);
      console.log(`   ✅ 유지: ${dup.keeping.id}`);
      console.log(`      - 제출 시각: ${keepTime.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`);
      console.log(`      - 책: ${dup.keeping.data.bookTitle}`);

      console.log(`   🔄 Draft 변경 대상: ${dup.drafting.length}개`);
      for (const draft of dup.drafting) {
        const draftTime = draft.createdAt?.toDate?.() || new Date(draft.createdAt.seconds * 1000);
        console.log(`      - ${draft.id}`);
        console.log(`        제출 시각: ${draftTime.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`);
        console.log(`        책: ${draft.data.bookTitle}`);
      }
    }

    // 사용자 확인
    console.log('\n==================================================');
    console.log('⚠️  위 제출물들을 draft로 변경하시겠습니까?');
    console.log('계속하려면 10초 대기 후 진행됩니다...');
    console.log('취소하려면 Ctrl+C를 누르세요.');
    console.log('==================================================\n');

    // 10초 대기
    await new Promise(resolve => setTimeout(resolve, 10000));

    // draft로 변경 실행
    console.log('🔄 Draft 변경 시작...\n');

    let successCount = 0;
    let errorCount = 0;

    for (const dup of duplicates) {
      for (const draft of dup.drafting) {
        try {
          await db
            .collection('reading_submissions')
            .doc(draft.id)
            .update({
              status: 'draft',
              updatedAt: Timestamp.now(),
              updateReason: 'Duplicate submission cleanup - keeping only the earliest submission'
            });

          console.log(`✅ ${draft.id} → draft 변경 완료`);
          successCount++;
        } catch (error) {
          console.error(`❌ ${draft.id} 변경 실패:`, error);
          errorCount++;
        }
      }
    }

    console.log('\n==================================================');
    console.log('📊 처리 결과');
    console.log('==================================================');
    console.log(`✅ 성공: ${successCount}개`);
    console.log(`❌ 실패: ${errorCount}개`);
    console.log(`📋 총 중복 유저: ${duplicates.length}명`);

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  }
}

// 메인 함수 실행
fixDuplicateSubmissions()
  .then(() => {
    console.log('\n✅ 중복 제출물 정리 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 실행 실패:', error);
    process.exit(1);
  });