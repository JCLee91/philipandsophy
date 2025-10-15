#!/usr/bin/env tsx

/**
 * Firestore participants를 Firebase Phone Auth에 등록
 *
 * 목적: 기존 전화번호 기반 사용자를 Firebase Phone Authentication으로 마이그레이션
 *
 * 주의사항:
 * 1. 실제 전화번호는 SMS가 전송되므로 테스트 환경에서만 실행
 * 2. Firebase Console에서 테스트 전화번호 설정 필요
 * 3. 프로덕션에서는 사용자가 직접 로그인하여 등록하도록 유도
 * 4. Firebase Blaze 플랜 필요 (SMS 비용)
 *
 * 실행 방법:
 * ```bash
 * tsx src/scripts/migrate-users-to-firebase-phone-auth.ts
 * ```
 */

import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { logger } from '@/lib/logger';

/**
 * 마이그레이션 옵션
 */
interface MigrationOptions {
  /** Dry-run 모드 (실제로 생성하지 않고 로그만 출력) */
  dryRun?: boolean;
  /** 관리자 포함 여부 */
  includeAdmins?: boolean;
}

/**
 * Firestore participants를 Firebase Phone Auth에 등록
 */
async function migrateUsersToFirebasePhoneAuth(options: MigrationOptions = {}) {
  const { dryRun = false, includeAdmins = false } = options;

  const auth = getAdminAuth();
  const db = getAdminDb();

  logger.info('🚀 Firebase Phone Auth 마이그레이션 시작');
  logger.info(`   Dry-run 모드: ${dryRun ? 'ON (실제 생성 안 함)' : 'OFF'}`);
  logger.info(`   관리자 포함: ${includeAdmins ? 'ON' : 'OFF'}`);
  console.log(''); // 빈 줄

  // 모든 participants 조회
  let participantsQuery = db.collection('participants');

  // 관리자 제외 옵션
  if (!includeAdmins) {
    participantsQuery = participantsQuery.where('isAdmin', '!=', true) as any;
  }

  const participantsSnapshot = await participantsQuery.get();

  // 관리자 필터링 (isAdministrator 필드도 체크)
  const participants = participantsSnapshot.docs.filter((doc) => {
    if (includeAdmins) return true;
    const data = doc.data();
    return !data.isAdmin && !data.isAdministrator;
  });

  logger.info(`📊 총 ${participants.length}명의 참가자 발견`);
  console.log(''); // 빈 줄

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const doc of participants) {
    const participant = doc.data();
    const phoneNumber = participant.phoneNumber;
    const participantId = doc.id;

    if (!phoneNumber) {
      logger.warn(`⏭️  ${participant.name} (${participantId}): 전화번호 없음 (건너뜀)`);
      skipCount++;
      continue;
    }

    // 이미 firebaseUid가 있으면 건너뜀
    if (participant.firebaseUid) {
      logger.info(`✅ ${participant.name} (${phoneNumber}): 이미 연결됨 (${participant.firebaseUid})`);
      skipCount++;
      continue;
    }

    // E.164 형식 변환: 01012345678 → +821012345678
    const formattedPhone = `+82${phoneNumber.substring(1)}`;

    if (dryRun) {
      logger.info(`[DRY-RUN] ${participant.name} (${phoneNumber}) → Firebase Auth 생성 예정`);
      successCount++;
      continue;
    }

    try {
      // Firebase Auth에 사용자 생성 (전화번호)
      const userRecord = await auth.createUser({
        phoneNumber: formattedPhone,
        displayName: participant.name,
      });

      // Firestore에 firebaseUid 저장
      await db.collection('participants').doc(participantId).update({
        firebaseUid: userRecord.uid,
      });

      logger.info(`✅ ${participant.name} (${phoneNumber}) → ${userRecord.uid}`);
      successCount++;
    } catch (error: any) {
      if (error.code === 'auth/phone-number-already-exists') {
        // 이미 Firebase Auth에 등록된 전화번호
        logger.warn(`⚠️  ${phoneNumber}: 이미 Firebase Auth에 존재`);

        try {
          // 기존 사용자 조회
          const existingUser = await auth.getUserByPhoneNumber(formattedPhone);

          // Firestore에 firebaseUid 저장 (연결)
          await db.collection('participants').doc(participantId).update({
            firebaseUid: existingUser.uid,
          });

          logger.info(`✅ ${participant.name} → 기존 사용자 연결: ${existingUser.uid}`);
          successCount++;
        } catch (linkError) {
          logger.error(`❌ ${participant.name}: 기존 사용자 연결 실패`, linkError);
          errorCount++;
        }
      } else {
        logger.error(`❌ ${participant.name}: Firebase Auth 등록 실패 (${error.code})`, error);
        errorCount++;
      }
    }

    // Rate limiting 방지 (Firebase Admin SDK 제한: 초당 10개)
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log(''); // 빈 줄
  logger.info('🎉 마이그레이션 완료!');
  logger.info(`   ✅ 성공: ${successCount}명`);
  logger.info(`   ⏭️  건너뜀: ${skipCount}명`);
  logger.info(`   ❌ 실패: ${errorCount}명`);

  if (dryRun) {
    console.log(''); // 빈 줄
    logger.info('💡 실제 마이그레이션을 실행하려면 dryRun 옵션을 제거하세요.');
  }
}

// 스크립트 실행
const options: MigrationOptions = {
  dryRun: false, // ⚠️ 테스트 후 false로 변경
  includeAdmins: false, // 관리자는 제외
};

migrateUsersToFirebasePhoneAuth(options).catch((error) => {
  logger.error('❌ 마이그레이션 실패:', error);
  process.exit(1);
});
