#!/usr/bin/env tsx
/**
 * Firebase Storage 구조 정리 마이그레이션 스크립트
 *
 * 목적: 기수별로 명확하게 분리된 스토리지 구조로 재구성
 *
 * Before:
 * - profileImages/{participationCode}.webp
 * - profileImagesCircle/{participationCode}.webp
 * - reading_submissions/{participationCode}/{file}
 *
 * After:
 * - cohorts/cohort{N}/profiles/{participantId}.webp
 * - cohorts/cohort{N}/profiles/{participantId}_circle.webp
 * - cohorts/cohort{N}/submissions/{participationCode}/{file}
 *
 * 사용법: npm run migrate:storage
 */

import { getFirebaseAdmin } from '../lib/firebase/admin-init';

interface ParticipantData {
  id: string;
  cohortId: string;
  participationCode: string;
  profileImage?: string;
  profileImageCircle?: string;
}

async function migrateStorageStructure() {
  try {
    const { db, storage } = getFirebaseAdmin();
    const bucket = storage.bucket();

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
        participationCode: data.participationCode,
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
      const { id, cohortId, participationCode } = participant;

      try {
        // 프로필 이미지 이동
        const oldProfilePath = `profileImages/${participationCode}.webp`;
        const newProfilePath = `cohorts/cohort${cohortId}/profiles/${id}.webp`;

        const [profileExists] = await bucket.file(oldProfilePath).exists();
        if (profileExists) {
          await bucket.file(oldProfilePath).copy(bucket.file(newProfilePath));
          console.log(`✅ [${cohortId}기] ${participationCode} 프로필 이미지 복사 완료`);
          profileMoved++;
        }

        // 원형 프로필 이미지 이동
        const oldCirclePath = `profileImagesCircle/${participationCode}.webp`;
        const newCirclePath = `cohorts/cohort${cohortId}/profiles/${id}_circle.webp`;

        const [circleExists] = await bucket.file(oldCirclePath).exists();
        if (circleExists) {
          await bucket.file(oldCirclePath).copy(bucket.file(newCirclePath));
          console.log(`✅ [${cohortId}기] ${participationCode} 원형 이미지 복사 완료`);
          profileCircleMoved++;
        }

        // Firestore 참가자 문서 업데이트
        await db.collection('participants').doc(id).update({
          profileImage: `https://firebasestorage.googleapis.com/v0/b/philipandsophy.firebasestorage.app/o/${encodeURIComponent(newProfilePath)}?alt=media`,
          profileImageCircle: `https://firebasestorage.googleapis.com/v0/b/philipandsophy.firebasestorage.app/o/${encodeURIComponent(newCirclePath)}?alt=media`,
        });

      } catch (error: any) {
        console.error(`❌ [${cohortId}기] ${participationCode} 처리 실패:`, error.message);
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
      const { cohortId, participationCode } = participant;

      try {
        const oldSubmissionsPrefix = `reading_submissions/${participationCode}/`;
        const newSubmissionsPrefix = `cohorts/cohort${cohortId}/submissions/${participationCode}/`;

        const [files] = await bucket.getFiles({ prefix: oldSubmissionsPrefix });

        if (files.length > 0) {
          console.log(`📁 [${cohortId}기] ${participationCode}: ${files.length}개 파일 발견`);

          for (const file of files) {
            const fileName = file.name.replace(oldSubmissionsPrefix, '');
            const newFilePath = `${newSubmissionsPrefix}${fileName}`;

            await file.copy(bucket.file(newFilePath));
            submissionsMoved++;
          }

          console.log(`✅ [${cohortId}기] ${participationCode}: ${files.length}개 파일 복사 완료`);
        }

      } catch (error: any) {
        console.error(`❌ [${cohortId}기] ${participationCode} 인증 이미지 처리 실패:`, error.message);
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
      const participationCode = data.participationCode;

      // 참가자 찾기
      const participant = participants.find(p => p.participationCode === participationCode);
      if (!participant) continue;

      if (data.bookImageUrl?.includes('reading_submissions/')) {
        const oldPath = data.bookImageUrl.split('/o/')[1]?.split('?')[0];
        if (oldPath) {
          const decodedPath = decodeURIComponent(oldPath);
          const fileName = decodedPath.replace(`reading_submissions/${participationCode}/`, '');
          const newPath = `cohorts/cohort${participant.cohortId}/submissions/${participationCode}/${fileName}`;
          const newUrl = `https://firebasestorage.googleapis.com/v0/b/philipandsophy.firebasestorage.app/o/${encodeURIComponent(newPath)}?alt=media`;

          await doc.ref.update({ bookImageUrl: newUrl });
          updatedSubmissions++;
        }
      }
    }

    console.log(`✅ ${updatedSubmissions}개 제출물 경로 업데이트 완료\n`);

    // 5. 최종 요약
    console.log('==================================================');
    console.log('마이그레이션 완료 요약');
    console.log('==================================================');
    console.log(`✅ 프로필 이미지: ${profileMoved}개`);
    console.log(`✅ 원형 프로필: ${profileCircleMoved}개`);
    console.log(`✅ 인증 이미지: ${submissionsMoved}개`);
    console.log(`✅ Firestore 문서: ${updatedSubmissions}개`);
    console.log(`❌ 총 오류: ${profileErrors + submissionsErrors}개\n`);

    console.log('⚠️  주의: 구버전 파일은 삭제되지 않았습니다.');
    console.log('⚠️  검증 후 수동으로 삭제해주세요:\n');
    console.log('   - profileImages/');
    console.log('   - profileImagesCircle/');
    console.log('   - reading_submissions/\n');

  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error);
    process.exit(1);
  }
}

// 실행
migrateStorageStructure()
  .then(() => {
    console.log('✅ 마이그레이션 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 실행 실패:', error);
    process.exit(1);
  });
