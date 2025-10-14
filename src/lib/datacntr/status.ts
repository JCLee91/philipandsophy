/**
 * 참가자 활동 상태 계산 로직
 * 서버/클라이언트 모두 사용 가능한 순수 함수
 */

export type ParticipantStatus = 'active' | 'moderate' | 'dormant';

/**
 * 참가자 활동 상태 계산
 *
 * 분류 기준:
 * - active: 3일 이내 활동
 * - moderate: 4-7일 사이 활동
 * - dormant: 7일 이상 활동 없음
 *
 * @param lastActivityDays - 마지막 활동으로부터 경과 일수
 * @returns ParticipantStatus
 */
export function getParticipantStatus(lastActivityDays: number): ParticipantStatus {
  if (lastActivityDays <= 3) return 'active';
  if (lastActivityDays <= 7) return 'moderate';
  return 'dormant';
}
