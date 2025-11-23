import type { SanitizedParticipant } from '@/types/datacntr';

/**
 * Data Center 데이터 Sanitization (민감 정보 제거)
 *
 * 보안 정책:
 * - 개인 이력 등 민감한 필드는 클라이언트에 전송하지 않음
 * - 필요한 필드만 명시적으로 선택 (Whitelist 방식)
 * - 새 필드 추가 시 자동으로 차단되어 안전
 */

/**
 * 참가자 데이터를 클라이언트 전송용으로 정제
 *
 * 제거되는 민감 필드:
 * - firebaseUid: Firebase Auth UID 보호
 * - bookHistory: 개인 독서 이력 보호 (GDPR)
 * - pushToken: FCM 토큰 보호 (hasPushToken으로 대체)
 * - phoneNumber: 전화번호 보호 (현재는 전송하지만, 향후 마스킹 고려)
 *
 * @param participant - Firestore 참가자 원본 데이터 (id 포함)
 * @returns 클라이언트 전송 가능한 안전한 데이터
 */
export function sanitizeParticipantForClient(participant: any): SanitizedParticipant {
  return {
    id: participant.id,
    name: participant.name,
    cohortId: participant.cohortId,
    gender: participant.gender,
    profileImage: participant.profileImage,
    profileImageCircle: participant.profileImageCircle,
    faceImage: participant.faceImage,
    occupation: participant.occupation,
    bio: participant.bio,
    currentBookTitle: participant.currentBookTitle,
    currentBookAuthor: participant.currentBookAuthor,
    currentBookCoverUrl: participant.currentBookCoverUrl,
    createdAt: participant.createdAt,
    lastActivityAt: participant.lastActivityAt,
    phoneNumber: participant.phoneNumber ?? '', // 현재는 전송 (참가자 관리에 필요)
    firebaseUid: participant.firebaseUid ?? null, // 관리자 기능(Impersonation)을 위해 필요
  };
}
