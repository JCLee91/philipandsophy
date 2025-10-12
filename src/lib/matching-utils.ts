import type { DailyMatchingEntry, DailyParticipantAssignment } from '@/types/database';

/**
 * 정규화된 매칭 데이터 구조
 */
export interface NormalizedMatching {
  featured: {
    similar: string[];
    opposite: string[];
  };
  assignments: Record<string, DailyParticipantAssignment>;
}

/**
 * 일일 매칭 데이터를 정규화 (레거시 형식 호환)
 *
 * Firebase에 저장된 매칭 데이터는 두 가지 형식이 존재합니다:
 * - v2.0: featured + assignments 구조 (현재 형식)
 * - v1.0: 직접 similar/opposite 배열 (레거시 형식)
 *
 * 이 함수는 두 형식을 모두 처리하여 일관된 구조로 반환합니다.
 *
 * @param rawMatching - Firebase에서 가져온 원본 매칭 데이터
 * @returns 정규화된 매칭 객체 (featured + assignments)
 *
 * @example
 * // v2.0 형식 (현재)
 * const matching = normalizeMatchingData({
 *   featured: { similar: ['id1', 'id2'], opposite: ['id3', 'id4'] },
 *   assignments: { 'userId1': { similar: ['id5', 'id6'], opposite: ['id7', 'id8'] } }
 * });
 *
 * @example
 * // v1.0 레거시 형식
 * const matching = normalizeMatchingData({
 *   similar: ['id1', 'id2'],
 *   opposite: ['id3', 'id4']
 * });
 *
 * @example
 * // null/undefined 처리
 * const matching = normalizeMatchingData(null);
 * // Returns: { featured: { similar: [], opposite: [] }, assignments: {} }
 */
export function normalizeMatchingData(
  rawMatching: DailyMatchingEntry | undefined | null
): NormalizedMatching {
  // null/undefined 처리: 빈 구조 반환
  if (!rawMatching) {
    return {
      featured: { similar: [], opposite: [] },
      assignments: {},
    };
  }

  // v2.0 형식: featured 또는 assignments 필드가 존재
  if ('featured' in rawMatching || 'assignments' in rawMatching) {
    return {
      featured: {
        similar: rawMatching.featured?.similar ?? [],
        opposite: rawMatching.featured?.opposite ?? [],
      },
      assignments: rawMatching.assignments ?? {},
    };
  }

  // v1.0 레거시 형식: 직접 similar/opposite 배열
  const legacySimilar = rawMatching.similar;
  const legacyOpposite = rawMatching.opposite;

  return {
    featured: {
      similar: Array.isArray(legacySimilar) ? legacySimilar : [],
      opposite: Array.isArray(legacyOpposite) ? legacyOpposite : [],
    },
    assignments: {},
  };
}
