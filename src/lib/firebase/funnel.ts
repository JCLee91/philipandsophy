'use client';

import {
  doc,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { getDb } from './client';
import { generateFunnelEventId } from './id-generator';
import {
  FUNNEL_STEPS,
  EXISTING_MEMBER_FUNNEL_STEPS,
  PeriodFilter,
  type FunnelStepData,
} from '../funnel-constants';

export {
  FUNNEL_STEPS,
  EXISTING_MEMBER_FUNNEL_STEPS,
  type PeriodFilter,
  type FunnelStepData,
};

/**
 * 퍼널 이벤트 데이터 타입
 */
export interface FunnelEventData {
  sessionId: string;
  stepId: string;
  stepIndex: number;
  memberType: 'new' | 'existing' | null;
}

/**
 * Firestore에 저장되는 퍼널 이벤트 구조
 */
export interface FunnelEvent extends FunnelEventData {
  id: string;
  timestamp: Timestamp;
  metadata?: {
    userAgent?: string;
    referrer?: string;
  };
}

/**
 * stepId로 stepIndex 찾기
 */
export function getStepIndex(stepId: string, memberType: 'new' | 'existing' | null): number {
  const steps = memberType === 'existing' ? EXISTING_MEMBER_FUNNEL_STEPS : FUNNEL_STEPS;
  const step = steps.find(s => s.stepId === stepId);
  return step?.stepIndex ?? -1;
}

/**
 * 퍼널 이벤트 저장
 * ID 형식: {stepId}_{timestamp}
 * 예: onboarding_step_1_1733145600000
 */
export async function logFunnelEvent(data: FunnelEventData): Promise<void> {
  try {
    const db = getDb();

    // 커스텀 ID 생성
    const customId = generateFunnelEventId(data.stepId);

    const docRef = doc(db, 'funnel_events', customId);
    await setDoc(docRef, {
      ...data,
      timestamp: Timestamp.now(),
      metadata: {
        userAgent: typeof window !== 'undefined' ? navigator.userAgent : null,
        referrer: typeof document !== 'undefined' ? document.referrer : null,
      }
    });
  } catch (error) {
    // 퍼널 이벤트 저장 실패는 사용자 경험에 영향 주지 않도록 무시
    console.error('Failed to log funnel event:', error);
  }
}

/**
 * 기간별 퍼널 데이터 조회 (API 호출로 변경)
 * Security Rules 문제로 인해 클라이언트 SDK 대신 Admin SDK를 사용하는 API 호출
 */
export async function getFunnelData(
  period: PeriodFilter,
  memberType: 'new' | 'existing' = 'new'
): Promise<FunnelStepData[]> {
  const response = await fetch(`/api/datacntr/funnel?period=${period}&memberType=${memberType}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch funnel data');
  }

  return response.json();
}
