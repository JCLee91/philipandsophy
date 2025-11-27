import type { ClusterMatchingData } from '../types';

/**
 * 가장 최근 클러스터 매칭 데이터 찾기
 *
 * @param dailyFeaturedParticipants - 일별 추천 참가자 데이터
 * @param participantId - 현재 참가자 ID
 * @param preferredDate - 우선 조회할 날짜 (오늘 인증한 경우)
 * @returns 클러스터 매칭 데이터 또는 null
 */
export function findLatestClusterMatching(
  dailyFeaturedParticipants: Record<string, any>,
  participantId: string,
  preferredDate?: string
): ClusterMatchingData | null {
  const dates = Object.keys(dailyFeaturedParticipants).sort().reverse();

  // 1차: preferredDate 우선
  if (preferredDate && dailyFeaturedParticipants[preferredDate]) {
    const dayData = dailyFeaturedParticipants[preferredDate];
    if (dayData.matchingVersion === 'cluster' && dayData.assignments?.[participantId]) {
      const assignment = dayData.assignments[participantId];
      const clusterId = assignment.clusterId;
      const cluster = dayData.clusters?.[clusterId];

      if (cluster && assignment.assigned) {
        return {
          clusterId,
          cluster,
          assignedIds: assignment.assigned,
          matchingDate: preferredDate,
        };
      }
    }
  }

  // 2차: 가장 최근 클러스터 매칭
  for (const date of dates) {
    const dayData = dailyFeaturedParticipants[date];
    if (dayData.matchingVersion === 'cluster' && dayData.assignments?.[participantId]) {
      const assignment = dayData.assignments[participantId];
      const clusterId = assignment.clusterId;
      const cluster = dayData.clusters?.[clusterId];

      if (cluster && assignment.assigned) {
        return {
          clusterId,
          cluster,
          assignedIds: assignment.assigned,
          matchingDate: date,
        };
      }
    }
  }

  return null;
}

/**
 * 원형 이미지 URL 추론
 *
 * @param url - 원본 이미지 URL
 * @returns 원형 이미지 URL 또는 undefined
 */
export function inferCircleImageUrl(url?: string): string | undefined {
  if (!url) return undefined;
  const [base, query] = url.split('?');
  if (!base.includes('_full')) return undefined;
  const circleBase = base.replace('_full', '_circle');
  return query ? `${circleBase}?${query}` : circleBase;
}
