/**
 * UI 레벨 권한 체크 유틸리티
 *
 * Firestore Rules가 느슨해졌으므로 UI에서 최소한의 방어 코드 제공
 */

/**
 * 본인 참가자 ID인지 확인
 *
 * @param participantId - 작업 대상 participant ID
 * @param currentUserId - 현재 로그인 사용자 ID
 * @throws Error - 일치하지 않으면 에러
 */
export function assertOwnParticipant(
  participantId: string,
  currentUserId: string | null | undefined
): void {
  if (!currentUserId) {
    throw new Error('로그인이 필요합니다');
  }

  if (participantId !== currentUserId) {
    throw new Error('본인의 데이터만 수정할 수 있습니다');
  }
}

/**
 * 본인 참가자 ID인지 확인 (boolean 반환)
 */
export function isOwnParticipant(
  participantId: string,
  currentUserId: string | null | undefined
): boolean {
  if (!currentUserId) return false;
  return participantId === currentUserId;
}
