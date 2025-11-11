/**
 * 매칭 데이터 호환성 유틸리티
 *
 * v2.0 (assigned) 우선, v1.0 (similar/opposite) fallback
 *
 * @version 2.0.0
 * @date 2025-11-10
 */

import type { DailyParticipantAssignment } from '@/types/database';

/**
 * 참가자가 받은 프로필북 ID 목록 가져오기
 *
 * v2.0 (assigned) 우선, v1.0 (similar + opposite) fallback
 *
 * @param assignment 매칭 데이터
 * @returns 프로필북 ID 배열
 *
 * @example
 * // v2.0 데이터
 * getAssignedProfiles({ assigned: ['user1', 'user2'] })
 * // => ['user1', 'user2']
 *
 * @example
 * // v1.0 데이터 (fallback)
 * getAssignedProfiles({
 *   similar: ['user1', 'user2'],
 *   opposite: ['user3', 'user4']
 * })
 * // => ['user1', 'user2', 'user3', 'user4']
 */
export function getAssignedProfiles(
  assignment: DailyParticipantAssignment | undefined | null
): string[] {
  if (!assignment) {
    return [];
  }

  // v2.0: assigned 필드 우선
  if (assignment.assigned && assignment.assigned.length > 0) {
    return assignment.assigned;
  }

  // v1.0 fallback: similar + opposite
  const similar = assignment.similar || [];
  const opposite = assignment.opposite || [];

  if (similar.length > 0 || opposite.length > 0) {
    return [...similar, ...opposite];
  }

  return [];
}

/**
 * 매칭 버전 감지
 *
 * @param assignment 매칭 데이터
 * @returns 'v2' | 'v1' | 'empty'
 */
export function detectMatchingVersion(
  assignment: DailyParticipantAssignment | undefined | null
): 'v2' | 'v1' | 'empty' {
  if (!assignment) {
    return 'empty';
  }

  if (assignment.assigned && assignment.assigned.length > 0) {
    return 'v2';
  }

  if (
    (assignment.similar && assignment.similar.length > 0) ||
    (assignment.opposite && assignment.opposite.length > 0)
  ) {
    return 'v1';
  }

  return 'empty';
}

/**
 * 레거시 매칭 이유 확인
 *
 * v1.0 AI 매칭에만 존재하는 reasons 필드
 *
 * @param assignment 매칭 데이터
 * @returns reasons 객체 또는 null
 */
export function getLegacyMatchingReasons(
  assignment: DailyParticipantAssignment | undefined | null
): { similar?: string; opposite?: string } | null {
  if (!assignment || !assignment.reasons) {
    return null;
  }

  return {
    similar: assignment.reasons.similar,
    opposite: assignment.reasons.opposite,
  };
}

/**
 * 프로필북 개수 계산 (v2.0 기준)
 *
 * @param assignment 매칭 데이터
 * @returns 프로필북 개수
 */
export function getProfileBookCount(
  assignment: DailyParticipantAssignment | undefined | null
): number {
  return getAssignedProfiles(assignment).length;
}
