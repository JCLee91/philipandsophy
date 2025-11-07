#!/usr/bin/env tsx
/**
 * Firebase Storage 구조 정리 마이그레이션 스크립트
 */

import { getFirebaseAdmin } from '../lib/firebase/admin-init';

interface ParticipantData {
  id: string;
  cohortId: string;
  profileImage?: string;
  profileImageCircle?: string;
}

async function migrateStorageStructure() {
  try {
    const { db, bucket } = getFirebaseAdmin();

    console.log('==================================================');
    console.log('Firebase Storage 구조 정리 마이그레이션');
    console.log('==================================================\n');

    // 1. 모든 참가자 정보 가져오기
    console.log('📋 참가자 정보 조회 중...');
    const participantsSnap = await db.collection('participants').get();
    const participants: ParticipantData[] = [];

    participantsSnap.forEach((doc) => {
      const data = doc.data();
      participants.push({
        id: doc.id,
        cohortId: data.cohortId || '1',
        profileImage: data.profileImage,
        profileImageCircle: data.profileImageCircle,
      });
    });

    console.log(`✅ 총 ${participants.length}명 참가자 조회 완료\n`);

    // 기수별로 그룹화
    const byCohort = participants.reduce((acc, p) => {
      if (!acc[p.cohortId]) acc[p.cohortId] = [];
      acc[p.cohortId].push(p);
      return acc;
    }, {} as Record<string, ParticipantData[]>);

    console.log('📊 기수별 참가자 수:');
    Object.entries(byCohort).forEach(([cohortId, parts]) => {
      console.log(`  - ${cohortId}기: ${parts.length}명`);
    });
    console.log('');

    // 2. 프로필 이미지 마이그레이션
    console.log('==================================================');
    console.log('1. 프로필 이미지 마이그레이션');
    console.log('==================================================\n');

    let profileMoved = 0;
    let profileCircleMoved = 0;
    let profileErrors = 0;

    for (const participant of participants) {
      const { id, cohortId } = participant;

      try {
        // 2기: profileImages/{id}.webp, profileImagesCircle/{id}.webp
        // 1기: profile_images/{id}_full.webp, profile_images/{id}_circle.webp

        // 프로필 카드 이미지 이동
        let oldProfilePath = `profileImages/${id}.webp`;
        let newProfilePath = `cohorts/cohort${cohortId}/profiles/${id}.webp`;

        let [profileExists] = await bucket.file(oldProfilePath).exists();

        // 2기 경로에 없으면 1기 경로 체크
        if (!profileExists) {
          oldProfilePath = `profile_images/${id}_full.webp`;
          [profileExists] = await bucket.file(oldProfilePath).exists();
        }

        if (profileExists) {
          await bucket.file(oldProfilePath).copy(bucket.file(newProfilePath));
          console.log(`✅ [${cohortId}기] ${id} 프로필 이미지 복사 완료`);
          profileMoved++;
        }

        // 원형 프로필 이미지 이동
        let oldCirclePath = `profileImagesCircle/${id}.webp`;
        let newCirclePath = `cohorts/cohort${cohortId}/profiles/${id}_circle.webp`;

        let [circleExists] = await bucket.file(oldCirclePath).exists();

        // 2기 경로에 없으면 1기 경로 체크
        if (!circleExists) {
          oldCirclePath = `profile_images/${id}_circle.webp`;
          [circleExists] = await bucket.file(oldCirclePath).exists();
        }

        if (circleExists) {
          await bucket.file(oldCirclePath).copy(bucket.file(newCirclePath));
          console.log(`✅ [${cohortId}기] ${id} 원형 이미지 복사 완료`);
          profileCircleMoved++;
        }

        // Firestore 참가자 문서 업데이트
        await db.collection('participants').doc(id).update({
          profileImage: `https://firebasestorage.googleapis.com/v0/b/philipandsophy.firebasestorage.app/o/${encodeURIComponent(newProfilePath)}?alt=media`,
          profileImageCircle: `https://firebasestorage.googleapis.com/v0/b/philipandsophy.firebasestorage.app/o/${encodeURIComponent(newCirclePath)}?alt=media`,
        });

      } catch (error: any) {
        console.error(`❌ [${cohortId}기] ${id} 처리 실패:`, error.message);
        profileErrors++;
      }
    }

    console.log('\n📊 프로필 이미지 마이그레이션 결과:');
    console.log(`  - 프로필 이미지: ${profileMoved}개 이동`);
    console.log(`  - 원형 이미지: ${profileCircleMoved}개 이동`);
    console.log(`  - 오류: ${profileErrors}개\n`);

    // 3. 독서 인증 이미지 마이그레이션
    console.log('==================================================');
    console.log('2. 독서 인증 이미지 마이그레이션');
    console.log('==================================================\n');

    let submissionsMoved = 0;
    let submissionsErrors = 0;

    for (const participant of participants) {
      const { id, cohortId } = participant;

      try {
        const oldSubmissionsPrefix = `reading_submissions/${id}/`;
        const newSubmissionsPrefix = `cohorts/cohort${cohortId}/submissions/${id}/`;

        const [files] = await bucket.getFiles({ prefix: oldSubmissionsPrefix });

        if (files.length > 0) {
          console.log(`📁 [${cohortId}기] ${id}: ${files.length}개 파일 발견`);

          for (const file of files) {
            const fileName = file.name.replace(oldSubmissionsPrefix, '');
            const newFilePath = `${newSubmissionsPrefix}${fileName}`;

            await file.copy(bucket.file(newFilePath));
            submissionsMoved++;
          }

          console.log(`✅ [${cohortId}기] ${id}: ${files.length}개 파일 복사 완료`);
        }

      } catch (error: any) {
        console.error(`❌ [${cohortId}기] ${id} 인증 이미지 처리 실패:`, error.message);
        submissionsErrors++;
      }
    }

    console.log('\n📊 독서 인증 이미지 마이그레이션 결과:');
    console.log(`  - 인증 이미지: ${submissionsMoved}개 이동`);
    console.log(`  - 오류: ${submissionsErrors}개\n`);

    // 4. Firestore 문서 업데이트
    console.log('==================================================');
    console.log('3. Firestore 문서 경로 업데이트');
    console.log('==================================================\n');

    const submissionsSnap = await db.collection('reading_submissions').get();
    let updatedSubmissions = 0;

    for (const doc of submissionsSnap.docs) {
      const data = doc.data();
      const participantId = data.participantId;

      const participant = participants.find(p => p.id === participantId);
      if (!participant) continue;

      if (data.bookImageUrl?.includes('reading_submissions/')) {
        const oldPath = data.bookImageUrl.split('/o/')[1]?.split('?')[0];
        if (oldPath) {
          const decodedPath = decodeURIComponent(oldPath);
          const fileName = decodedPath.replace(`reading_submissions/${participantId}/`, '');
          const newPath = `cohorts/cohort${participant.cohortId}/submissions/${participantId}/${fileName}`;
          const newUrl = `https://firebasestorage.googleapis.com/v0/b/philipandsophy.firebasestorage.app/o/${encodeURIComponent(newPath)}?alt=media`;

          await doc.ref.update({ bookImageUrl: newUrl });
          updatedSubmissions++;
        }
      }
    }

    console.log(`✅ ${updatedSubmissions}개 제출물 경로 업데이트 완료\n`);

    console.log('==================================================');
    console.log('마이그레이션 완료 요약');
    console.log('==================================================');
    console.log(`✅ 프로필 이미지: ${profileMoved}개`);
    console.log(`✅ 원형 프로필: ${profileCircleMoved}개`);
    console.log(`✅ 인증 이미지: ${submissionsMoved}개`);
    console.log(`✅ Firestore 문서: ${updatedSubmissions}개`);
    console.log(`❌ 총 오류: ${profileErrors + submissionsErrors}개\n`);

    console.log('⚠️  주의: 구버전 파일은 삭제되지 않았습니다.');
    console.log('⚠️  검증 후 수동으로 삭제해주세요.\n');

  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error);
    process.exit(1);
  }
}

migrateStorageStructure()
  .then(() => {
    console.log('✅ 마이그레이션 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 실행 실패:', error);
    process.exit(1);
  });
