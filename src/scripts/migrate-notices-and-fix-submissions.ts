#!/usr/bin/env tsx
/**
 * 공지사항 + 독서 인증 이미지 완전 마이그레이션
 * 1. 공지사항 이미지: notices/ → cohorts/cohort{N}/notices/
 * 2. 독서 인증 이미지 DB URL: reading_submissions/ → cohorts/cohort{N}/submissions/
 */

import { getFirebaseAdmin } from '../lib/firebase/admin-init';

async function migrateNoticesAndFixSubmissions() {
  try {
    const { db, bucket } = getFirebaseAdmin();

    console.log('==================================================');
    console.log('공지사항 + 독서 인증 이미지 완전 마이그레이션');
    console.log('==================================================\n');

    // ========================================
    // 1. 공지사항 이미지 마이그레이션
    // ========================================
    console.log('==================================================');
    console.log('1. 공지사항 이미지 마이그레이션');
    console.log('==================================================\n');

    const noticesSnap = await db.collection('notices')
      .where('imageUrl', '!=', null)
      .get();

    console.log(`📋 이미지가 있는 공지사항: ${noticesSnap.size}개\n`);

    let noticesMoved = 0;
    let noticesUpdated = 0;
    let noticesErrors = 0;

    for (const doc of noticesSnap.docs) {
      const data = doc.data();
      const cohortId = data.cohortId || '1';
      const imageUrl = data.imageUrl;

      if (!imageUrl) continue;

      try {
        // 구버전 경로 체크 (notices/) - URL 인코딩 고려
        if ((imageUrl.includes('notices%2F') || imageUrl.includes('notices/')) &&
            !imageUrl.includes('cohorts%2Fcohort') && !imageUrl.includes('cohorts/cohort')) {
          // URL에서 파일명 추출
          const urlParts = imageUrl.split('/o/');
          if (urlParts.length < 2) {
            console.warn(`⚠️  [공지 ${doc.id}] URL 파싱 실패`);
            noticesErrors++;
            continue;
          }

          const pathAndQuery = urlParts[1];
          const [encodedPath] = pathAndQuery.split('?');
          const decodedPath = decodeURIComponent(encodedPath);

          // 파일명 추출 (notices/{cohortId}/{fileName} 또는 notices/{fileName})
          const pathParts = decodedPath.split('/');
          const fileName = pathParts[pathParts.length - 1];

          // 구버전 경로와 신버전 경로
          const oldPath = decodedPath;
          const newPath = `cohorts/cohort${cohortId}/notices/${fileName}`;

          // Storage 파일 복사
          const oldFile = bucket.file(oldPath);
          const [exists] = await oldFile.exists();

          if (exists) {
            await oldFile.copy(bucket.file(newPath));
            console.log(`✅ [공지 ${doc.id}] ${fileName} 복사 완료`);
            noticesMoved++;
          } else {
            console.warn(`⚠️  [공지 ${doc.id}] 원본 파일 없음: ${oldPath}`);
          }

          // Firestore DB URL 업데이트
          const newUrl = `https://firebasestorage.googleapis.com/v0/b/philipandsophy.firebasestorage.app/o/${encodeURIComponent(newPath)}?alt=media`;
          await doc.ref.update({ imageUrl: newUrl });
          noticesUpdated++;

          console.log(`📝 [공지 ${doc.id}] DB URL 업데이트 완료`);
        }
      } catch (error: any) {
        console.error(`❌ [공지 ${doc.id}] 처리 실패:`, error.message);
        noticesErrors++;
      }
    }

    console.log('\n📊 공지사항 마이그레이션 결과:');
    console.log(`  - Storage 파일 복사: ${noticesMoved}개`);
    console.log(`  - DB URL 업데이트: ${noticesUpdated}개`);
    console.log(`  - 오류: ${noticesErrors}개\n`);

    // ========================================
    // 2. 독서 인증 이미지 DB URL 업데이트
    // ========================================
    console.log('==================================================');
    console.log('2. 독서 인증 이미지 DB URL 업데이트');
    console.log('==================================================\n');

    // 참가자 정보 로딩 (cohortId 매핑용)
    const participantsSnap = await db.collection('participants').get();
    const participantsMap = new Map<string, string>();

    participantsSnap.docs.forEach(doc => {
      const data = doc.data();
      participantsMap.set(doc.id, data.cohortId || '1');
    });

    console.log(`📋 참가자 ${participantsMap.size}명 조회 완료\n`);

    const submissionsSnap = await db.collection('reading_submissions').get();
    console.log(`📋 총 ${submissionsSnap.size}개 제출물 확인 중...\n`);

    let submissionsUpdated = 0;
    let submissionsSkipped = 0;
    let submissionsErrors = 0;

    for (const doc of submissionsSnap.docs) {
      const data = doc.data();
      const participantId = data.participantId;
      const bookImageUrl = data.bookImageUrl;

      if (!bookImageUrl) {
        submissionsSkipped++;
        continue;
      }

      // 이미 신버전 경로면 스킵 (URL 인코딩 고려)
      if (bookImageUrl.includes('cohorts%2Fcohort') || bookImageUrl.includes('cohorts/cohort')) {
        submissionsSkipped++;
        continue;
      }

      // 구버전 경로 확인 (URL 인코딩 고려)
      if (!bookImageUrl.includes('reading_submissions%2F') && !bookImageUrl.includes('reading_submissions/')) {
        submissionsSkipped++;
        continue;
      }

      const cohortId = participantsMap.get(participantId);
      if (!cohortId) {
        console.warn(`⚠️  참가자 없음: ${participantId}`);
        submissionsErrors++;
        continue;
      }

      try {
        // URL 파싱
        const urlParts = bookImageUrl.split('/o/');
        if (urlParts.length < 2) {
          submissionsErrors++;
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

        submissionsUpdated++;

        if (submissionsUpdated % 50 === 0) {
          console.log(`📝 ${submissionsUpdated}개 업데이트 완료...`);
        }

      } catch (error: any) {
        console.error(`❌ [${doc.id}] 업데이트 실패:`, error.message);
        submissionsErrors++;
      }
    }

    console.log('\n📊 독서 인증 DB URL 업데이트 결과:');
    console.log(`  - 업데이트: ${submissionsUpdated}개`);
    console.log(`  - 스킵: ${submissionsSkipped}개`);
    console.log(`  - 오류: ${submissionsErrors}개\n`);

    // ========================================
    // 최종 요약
    // ========================================
    console.log('==================================================');
    console.log('마이그레이션 완료 요약');
    console.log('==================================================');
    console.log(`✅ 공지사항 Storage 파일: ${noticesMoved}개`);
    console.log(`✅ 공지사항 DB URL: ${noticesUpdated}개`);
    console.log(`✅ 독서 인증 DB URL: ${submissionsUpdated}개`);
    console.log(`❌ 총 오류: ${noticesErrors + submissionsErrors}개\n`);

  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error);
    process.exit(1);
  }
}

migrateNoticesAndFixSubmissions()
  .then(() => {
    console.log('✅ 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 오류:', error);
    process.exit(1);
  });
