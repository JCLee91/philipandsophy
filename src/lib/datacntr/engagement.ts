/**
 * 참가자 인게이지먼트 계산 유틸리티
 */

import { ENGAGEMENT_THRESHOLDS } from '@/constants/datacntr';

/**
 * 인게이지먼트 점수 계산
 * 점수 = (실제 인증 횟수 / 예상 인증 일수) * 100
 *
 * @param submissionCount 실제 인증 횟수
 * @param weeksPassed 경과 주차 (코호트 시작부터)
 * @returns 0-100 사이의 점수
 */
export function calculateEngagementScore(
  submissionCount: number,
  weeksPassed: number
): number {
  if (weeksPassed <= 0) return 0;

  const expectedDays = weeksPassed * 7;
  const score = Math.round((submissionCount / expectedDays) * 100);

  // 100점 초과 방지 (매일 인증 이상 불가)
  return Math.min(score, 100);
}

/**
 * 인게이지먼트 등급 결정
 *
 * @param score 인게이지먼트 점수 (0-100)
 * @returns 등급 ('high' | 'medium' | 'low')
 */
export function getEngagementLevel(
  score: number
): 'high' | 'medium' | 'low' {
  if (score >= ENGAGEMENT_THRESHOLDS.HIGH) return 'high';
  if (score >= ENGAGEMENT_THRESHOLDS.MEDIUM) return 'medium';
  return 'low';
}

/**
 * 인게이지먼트 등급 라벨 (한글)
 */
export const ENGAGEMENT_LABELS = {
  high: '우수',
  medium: '보통',
  low: '저조',
} as const;

/**
 * 인게이지먼트 등급 색상 (이모지)
 */
export const ENGAGEMENT_EMOJIS = {
  high: '🟢',
  medium: '🟡',
  low: '🔴',
} as const;

/**
 * 코호트 시작일로부터 경과 주차 계산
 *
 * @param startDate 코호트 시작일
 * @returns 경과 주차 (최소 1주)
 */
export function getWeeksPassed(startDate: Date): number {
  const now = new Date();
  const diffMs = now.getTime() - startDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const weeks = Math.ceil(diffDays / 7);

  // 최소 1주로 설정 (시작 당일도 1주차)
  return Math.max(weeks, 1);
}
