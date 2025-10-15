#!/usr/bin/env tsx

/**
 * Firebase UID 연결 검증 스크립트
 *
 * 목적: Firestore participants에 firebaseUid가 올바르게 연결되었는지 검증
 *
 * 검증 항목:
 * 1. firebaseUid 필드 존재 여부
 * 2. Firebase Auth Users와 매칭 여부
 * 3. 중복 연결 여부 (동일 firebaseUid가 여러 participant에 연결)
 *
 * 실행 방법:
 * ```bash
 * tsx src/scripts/verify-firebase-uid-linking.ts
 * ```
 */

import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { logger } from '@/lib/logger';

async function verifyFirebaseUidLinking() {
  const auth = getAdminAuth();
  const db = getAdminDb();

  logger.info('🔍 Firebase UID 연결 검증 시작');
  console.log(''); // 빈 줄

  // 1. Firestore participants 조회
  const participantsSnapshot = await db
    .collection('participants')
    .where('isAdmin', '!=', true)
    .get();

  // 관리자 필터링
  const participants = participantsSnapshot.docs.filter((doc) => {
    const data = doc.data();
    return !data.isAdmin && !data.isAdministrator;
  });

  let linkedCount = 0;
  let notLinkedCount = 0;
  const notLinkedList: Array<{ id: string; name: string; phoneNumber: string }> = [];

  // Firebase UID 중복 체크용 Map
  const firebaseUidMap = new Map<string, string[]>(); // firebaseUid → participantIds[]

  // 2. firebaseUid 존재 여부 체크
  participants.forEach((doc) => {
    const data = doc.data();
    const firebaseUid = data.firebaseUid;

    if (firebaseUid) {
      linkedCount++;

      // 중복 체크
      if (!firebaseUidMap.has(firebaseUid)) {
        firebaseUidMap.set(firebaseUid, []);
      }
      firebaseUidMap.get(firebaseUid)!.push(doc.id);
    } else {
      notLinkedCount++;
      notLinkedList.push({
        id: doc.id,
        name: data.name,
        phoneNumber: data.phoneNumber,
      });
    }
  });

  // 3. 중복 연결 검사
  const duplicates = Array.from(firebaseUidMap.entries()).filter(
    ([_, participantIds]) => participantIds.length > 1
  );

  // 4. Firebase Auth Users와 매칭 검증
  logger.info('🔐 Firebase Auth Users 매칭 검증 중...');
  let authMatchCount = 0;
  let authMismatchCount = 0;

  for (const [firebaseUid, participantIds] of firebaseUidMap.entries()) {
    try {
      const userRecord = await auth.getUser(firebaseUid);
      authMatchCount++;

      // 전화번호 일치 여부 확인
      const participant = participants.find((doc) => doc.id === participantIds[0]);
      if (participant) {
        const participantPhone = participant.data().phoneNumber;
        const authPhone = userRecord.phoneNumber;

        if (authPhone) {
          const normalizedParticipantPhone = `+82${participantPhone.substring(1)}`;
          if (normalizedParticipantPhone !== authPhone) {
            logger.warn(`⚠️  전화번호 불일치:`, {
              participantId: participantIds[0],
              participantPhone,
              authPhone,
            });
          }
        }
      }
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        logger.warn(`⚠️  Firebase Auth에서 찾을 수 없음: ${firebaseUid}`);
        authMismatchCount++;
      } else {
        logger.error(`❌ Firebase Auth 조회 실패: ${firebaseUid}`, error);
        authMismatchCount++;
      }
    }

    // Rate limiting 방지
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  // 5. 결과 출력
  console.log(''); // 빈 줄
  logger.info('📊 검증 결과:');
  console.log(''); // 빈 줄

  logger.info(`   ✅ Firebase UID 연결됨: ${linkedCount}명`);
  logger.info(`   ❌ Firebase UID 없음: ${notLinkedCount}명`);
  logger.info(`   🔐 Firebase Auth 매칭: ${authMatchCount}/${linkedCount}명`);

  if (authMismatchCount > 0) {
    logger.warn(`   ⚠️  Firebase Auth 미매칭: ${authMismatchCount}명`);
  }

  if (duplicates.length > 0) {
    console.log(''); // 빈 줄
    logger.warn(`⚠️  중복 연결 발견: ${duplicates.length}건`);
    duplicates.forEach(([firebaseUid, participantIds]) => {
      logger.warn(`   ${firebaseUid} → ${participantIds.join(', ')}`);
    });
  }

  if (notLinkedCount > 0) {
    console.log(''); // 빈 줄
    logger.warn(`⚠️  ${notLinkedCount}명이 Firebase Auth에 연결되지 않았습니다:`);
    notLinkedList.forEach(({ id, name, phoneNumber }) => {
      logger.warn(`   - ${name} (${phoneNumber}) [${id}]`);
    });
    console.log(''); // 빈 줄
    logger.info('💡 해결 방법:');
    logger.info('   1. 마이그레이션 스크립트 재실행');
    logger.info('   2. 사용자가 직접 로그인 (자동 연결됨)');
    logger.info('   3. 관리자가 수동으로 연결');
  } else {
    console.log(''); // 빈 줄
    logger.info('🎉 모든 참가자가 Firebase Auth에 올바르게 연결되었습니다!');
  }

  console.log(''); // 빈 줄
  logger.info('✨ 검증 완료');
}

// 실행
verifyFirebaseUidLinking().catch((error) => {
  logger.error('❌ 검증 실패:', error);
  process.exit(1);
});
