/**
 * Check Push Notification Status
 *
 * 알람 허용한 참가자 수 및 상세 정보를 확인하는 스크립트
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import * as path from 'path';
import * as dotenv from 'dotenv';

// .env.local 파일 로드
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Firebase Admin 초기화
if (!getApps().length) {
  const serviceAccountPath = path.resolve(process.cwd(), 'firebase-service-account.json');

  initializeApp({
    credential: cert(serviceAccountPath),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
}

const db = getFirestore();

interface ParticipantNotificationInfo {
  id: string;
  name: string;
  phoneNumber?: string;
  cohortId?: string;
  pushToken?: string;
  pushTokenUpdatedAt?: Timestamp;
  isAdministrator?: boolean;
}

/**
 * 알람 허용한 참가자 수 및 상세 정보 조회
 */
async function checkPushNotificationStats() {
  console.log('🔔 푸시 알림 상태 확인 중...\n');

  try {
    // 모든 참가자 조회
    const participantsSnapshot = await db.collection('participants').get();

    const allParticipants: ParticipantNotificationInfo[] = [];
    const notificationEnabledParticipants: ParticipantNotificationInfo[] = [];

    participantsSnapshot.forEach((doc) => {
      const data = doc.data();
      const participant: ParticipantNotificationInfo = {
        id: doc.id,
        name: data.name || '이름 없음',
        phoneNumber: data.phoneNumber,
        cohortId: data.cohortId,
        pushToken: data.pushToken,
        pushTokenUpdatedAt: data.pushTokenUpdatedAt,
        isAdministrator: data.isAdministrator || false,
      };

      allParticipants.push(participant);

      // pushToken이 존재하고 비어있지 않으면 알람 허용한 것으로 간주
      if (participant.pushToken && participant.pushToken.trim().length > 0) {
        notificationEnabledParticipants.push(participant);
      }
    });

    // 통계 출력
    console.log('📊 전체 통계');
    console.log('─'.repeat(60));
    console.log(`전체 참가자 수: ${allParticipants.length}명`);
    console.log(`알람 허용한 참가자: ${notificationEnabledParticipants.length}명`);
    console.log(`알람 비허용 참가자: ${allParticipants.length - notificationEnabledParticipants.length}명`);
    console.log(`알람 허용 비율: ${((notificationEnabledParticipants.length / allParticipants.length) * 100).toFixed(1)}%`);
    console.log('');

    // 알람 허용한 참가자 상세 정보
    if (notificationEnabledParticipants.length > 0) {
      console.log('✅ 알람 허용한 참가자 목록');
      console.log('─'.repeat(60));

      // 관리자와 일반 참가자 분리
      const admins = notificationEnabledParticipants.filter(p => p.isAdministrator);
      const regularUsers = notificationEnabledParticipants.filter(p => !p.isAdministrator);

      if (admins.length > 0) {
        console.log('\n👨‍💼 관리자 (' + admins.length + '명):');
        admins.forEach((participant, index) => {
          const updatedAt = participant.pushTokenUpdatedAt
            ? new Date(participant.pushTokenUpdatedAt.toDate()).toLocaleString('ko-KR')
            : '정보 없음';

          console.log(`  ${index + 1}. ${participant.name} (${participant.phoneNumber || 'N/A'})`);
          console.log(`     - 코호트: ${participant.cohortId || 'N/A'}`);
          console.log(`     - 토큰 업데이트: ${updatedAt}`);
          console.log(`     - 토큰 앞부분: ${participant.pushToken?.substring(0, 30)}...`);
        });
      }

      if (regularUsers.length > 0) {
        console.log('\n👥 일반 참가자 (' + regularUsers.length + '명):');
        regularUsers.forEach((participant, index) => {
          const updatedAt = participant.pushTokenUpdatedAt
            ? new Date(participant.pushTokenUpdatedAt.toDate()).toLocaleString('ko-KR')
            : '정보 없음';

          console.log(`  ${index + 1}. ${participant.name} (${participant.phoneNumber || 'N/A'})`);
          console.log(`     - 코호트: ${participant.cohortId || 'N/A'}`);
          console.log(`     - 토큰 업데이트: ${updatedAt}`);
          console.log(`     - 토큰 앞부분: ${participant.pushToken?.substring(0, 30)}...`);
        });
      }
    } else {
      console.log('❌ 알람을 허용한 참가자가 없습니다.');
    }

    // 알람 비허용 참가자 (간략히)
    const notificationDisabledParticipants = allParticipants.filter(
      p => !p.pushToken || p.pushToken.trim().length === 0
    );

    if (notificationDisabledParticipants.length > 0) {
      console.log('\n\n⚠️  알람 비허용 참가자 (' + notificationDisabledParticipants.length + '명)');
      console.log('─'.repeat(60));

      const disabledAdmins = notificationDisabledParticipants.filter(p => p.isAdministrator);
      const disabledRegularUsers = notificationDisabledParticipants.filter(p => !p.isAdministrator);

      if (disabledAdmins.length > 0) {
        console.log('\n👨‍💼 관리자:');
        disabledAdmins.forEach((p, i) => {
          console.log(`  ${i + 1}. ${p.name} (${p.phoneNumber || 'N/A'})`);
        });
      }

      if (disabledRegularUsers.length > 0) {
        console.log('\n👥 일반 참가자:');
        disabledRegularUsers.forEach((p, i) => {
          console.log(`  ${i + 1}. ${p.name} (${p.phoneNumber || 'N/A'})`);
        });
      }
    }

    // 토큰 만료 경고 (7일 이상 업데이트 안된 토큰)
    console.log('\n\n⏰ 토큰 갱신 필요 확인 (7일 이상 미갱신)');
    console.log('─'.repeat(60));

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const expiredTokens = notificationEnabledParticipants.filter(p => {
      if (!p.pushTokenUpdatedAt) return true;
      const tokenDate = p.pushTokenUpdatedAt.toDate();
      return tokenDate < sevenDaysAgo;
    });

    if (expiredTokens.length > 0) {
      console.log(`⚠️  갱신이 필요한 토큰: ${expiredTokens.length}개`);
      expiredTokens.forEach((p, i) => {
        const updatedAt = p.pushTokenUpdatedAt
          ? new Date(p.pushTokenUpdatedAt.toDate()).toLocaleString('ko-KR')
          : '정보 없음';
        const daysSince = p.pushTokenUpdatedAt
          ? Math.floor((Date.now() - p.pushTokenUpdatedAt.toDate().getTime()) / (1000 * 60 * 60 * 24))
          : '알 수 없음';

        console.log(`  ${i + 1}. ${p.name} - 마지막 갱신: ${updatedAt} (${daysSince}일 전)`);
      });
    } else {
      console.log('✅ 모든 토큰이 최신 상태입니다.');
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  }
}

// 스크립트 실행
checkPushNotificationStats()
  .then(() => {
    console.log('\n✅ 푸시 알림 상태 확인 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 실패:', error);
    process.exit(1);
  });
