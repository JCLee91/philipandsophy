#!/usr/bin/env tsx
/**
 * reading_submissions 컬렉션의 bookImageUrl을 신규 경로로 업데이트
 *
 * 구버전: reading_submissions/{participantId}/
 * 신버전: cohorts/cohort{N}/submissions/{participantId}/
 */

import { getFirebaseAdmin } from '../lib/firebase/admin-init';

async function updateSubmissionImageUrls() {
  try {
    const { db } = getFirebaseAdmin();

    console.log('==================================================');
    console.log('독서 인증 이미지 URL 업데이트');
    console.log('==================================================\n');

    // 참가자 정보 조회 (cohortId 매핑용)
    const participantsSnap = await db.collection('participants').get();
    const participantsMap = new Map<string, string>();

    participantsSnap.docs.forEach(doc => {
      const data = doc.data();
      participantsMap.set(doc.id, data.cohortId || '1');
    });

    console.log(`✅ 참가자 ${participantsMap.size}명 조회 완료\n`);

    // 제출물 조회
    const submissionsSnap = await db.collection('reading_submissions').get();
    console.log(`📋 총 ${submissionsSnap.size}개 제출물 확인 중...\n`);

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const doc of submissionsSnap.docs) {
      const data = doc.data();
      const participantId = data.participantId;

      if (!data.bookImageUrl) {
        skipped++;
        continue;
      }

      // 이미 신버전 경로면 스킵
      if (data.bookImageUrl.includes('cohorts/cohort')) {
        skipped++;
        continue;
      }

      // 구버전 경로 확인
      if (!data.bookImageUrl.includes('reading_submissions/')) {
        skipped++;
        continue;
      }

      const cohortId = participantsMap.get(participantId);
      if (!cohortId) {
        console.warn(`⚠️  참가자 없음: ${participantId}`);
        errors++;
        continue;
      }

      try {
        // URL 파싱
        const urlParts = data.bookImageUrl.split('/o/');
        if (urlParts.length < 2) {
          errors++;
          continue;
        }

        const pathAndQuery = urlParts[1];
        const [encodedPath, ...queryParts] = pathAndQuery.split('?');
        const decodedPath = decodeURIComponent(encodedPath);

        // 파일명 추출
        const fileName = decodedPath.replace(`reading_submissions/${participantId}/`, '');

        // 새 경로 생성
        const newPath = `cohorts/cohort${cohortId}/submissions/${participantId}/${fileName}`;
        const encodedNewPath = encodeURIComponent(newPath);

        // 쿼리 파라미터 보존
        const query = queryParts.length > 0 ? `?${queryParts.join('?')}` : '';

        // 새 URL 생성
        const newUrl = `${urlParts[0]}/o/${encodedNewPath}${query}`;

        // Firestore 업데이트
        await doc.ref.update({ bookImageUrl: newUrl });

        updated++;

        if (updated % 50 === 0) {
          console.log(`📝 ${updated}개 업데이트 완료...`);
        }

      } catch (error: any) {
        console.error(`❌ [${doc.id}] 업데이트 실패:`, error.message);
        errors++;
      }
    }

    console.log('\n==================================================');
    console.log('업데이트 완료');
    console.log('==================================================');
    console.log(`✅ 업데이트: ${updated}개`);
    console.log(`⏭️  스킵: ${skipped}개`);
    console.log(`❌ 오류: ${errors}개\n`);

  } catch (error) {
    console.error('❌ 실행 실패:', error);
    process.exit(1);
  }
}

updateSubmissionImageUrls()
  .then(() => {
    console.log('✅ 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 오류:', error);
    process.exit(1);
  });
