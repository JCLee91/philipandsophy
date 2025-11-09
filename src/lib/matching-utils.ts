import type { DailyMatchingEntry, DailyParticipantAssignment } from '@/types/database';

/**
 * 정규화된 매칭 데이터 구조
 */
export interface NormalizedMatching {
  assignments: Record<string, DailyParticipantAssignment>;
  matchingVersion?: 'ai' | 'random'; // 매칭 방식 (ai: AI 매칭, random: 랜덤 매칭)
}

export interface MatchingLookupResult {
  date: string;
  matching: NormalizedMatching;
}

/**
 * 일일 매칭 데이터를 정규화 (레거시 형식 호환)
 *
 * Firebase에 저장된 매칭 데이터는 세 가지 형식이 존재합니다:
 * - v3.0: assignments only (현재 형식 - featured 제거)
 * - v2.0: featured + assignments 구조 (레거시 - featured 무시)
 * - v1.0: 직접 similar/opposite 배열 (레거시 - 무시)
 *
 * 이 함수는 모든 형식을 처리하여 v3.0 구조로 반환합니다.
 *
 * @param rawMatching - Firebase에서 가져온 원본 매칭 데이터
 * @returns 정규화된 매칭 객체 (assignments only)
 *
 * @example
 * // v3.0 형식 (현재)
 * const matching = normalizeMatchingData({
 *   assignments: { 'userId1': { similar: ['id1', 'id2'], opposite: ['id3', 'id4'] } }
 * });
 *
 * @example
 * // null/undefined 처리
 * const matching = normalizeMatchingData(null);
 * // Returns: { assignments: {} }
 */
export function normalizeMatchingData(
  rawMatching: DailyMatchingEntry | undefined | null
): NormalizedMatching {
  // null/undefined 처리: 빈 구조 반환
  if (!rawMatching) {
    return {
      assignments: {},
      matchingVersion: undefined,
    };
  }

  // v3.0/v2.0 형식: assignments 필드가 존재
  if ('assignments' in rawMatching && rawMatching.assignments) {
    return {
      assignments: rawMatching.assignments,
      matchingVersion: rawMatching.matchingVersion, // 매칭 버전 전달
    };
  }

  // v1.0 레거시 형식: 직접 similar/opposite 배열 (더 이상 지원하지 않음)
  // 빈 assignments 반환
  return {
    assignments: {},
    matchingVersion: 'ai', // 레거시는 AI 매칭으로 간주
  };
}

/**
 * 지정한 참가자가 포함된 가장 최근 매칭 엔트리를 찾습니다.
 *
 * allowedDates가 비어있는 경우(오늘 처음 인증), 과거의 가장 최근 매칭을 반환합니다.
 * 이를 통해 "어제 인증 안 했는데 오늘 인증한 경우 가장 최근 프로필북을 받는다" 플로우를 구현합니다.
 *
 * @param dailyMap - 날짜별 매칭 결과 맵 (cohort.dailyFeaturedParticipants)
 * @param participantId - 조회할 참가자 ID
 * @param options.preferredDate - 우선적으로 확인할 날짜 (예: 오늘)
 * @param options.allowedDates - 접근 가능한 날짜 집합 (빈 Set이면 과거 모든 날짜 허용)
 * @returns 가장 최근 매칭 날짜와 정규화된 매칭 데이터, 없으면 null
 */
export function findLatestMatchingForParticipant(
  dailyMap: Record<string, DailyMatchingEntry> | undefined | null,
  participantId: string | undefined | null,
  options: { preferredDate?: string; allowedDates?: Set<string> } = {}
): MatchingLookupResult | null {
  if (!dailyMap || !participantId) {
    return null;
  }

  const allowedDates = options.allowedDates;
  const hasAllowedDates = typeof allowedDates !== 'undefined';

  const tryResolve = (date: string | undefined): MatchingLookupResult | null => {
    if (!date) return null;

    // allowedDates가 있으면 체크, 없으면 모든 과거 날짜 허용
    if (hasAllowedDates && !allowedDates?.has(date)) return null;

    const entry = dailyMap[date];
    if (!entry) return null;

    const normalized = normalizeMatchingData(entry);
    if (normalized.assignments?.[participantId]) {
      return { date, matching: normalized };
    }

    return null;
  };

  const { preferredDate } = options;
  if (preferredDate) {
    const preferredResult = tryResolve(preferredDate);
    if (preferredResult) {
      return preferredResult;
    }
  }

  // 과거 날짜를 역순으로 순회 (가장 최근부터)
  const sortedDates = Object.keys(dailyMap)
    .filter(Boolean)
    .sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));

  for (const date of sortedDates) {
    const result = tryResolve(date);
    if (result) {
      return result;
    }
  }

  return null;
}
