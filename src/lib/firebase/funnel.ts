'use client';

import {
  collection,
  doc,
  setDoc,
  query,
  where,
  getDocs,
  Timestamp,
  orderBy,
} from 'firebase/firestore';
import { getDb } from './client';
import { generateFunnelEventId } from './id-generator';

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
 * 퍼널 단계 정의 (신규 회원: 온보딩 4단계 + 신청폼 8단계 = 12단계)
 */
export const FUNNEL_STEPS = [
  // 온보딩 단계 (공통)
  { stepId: 'onboarding_video', stepIndex: 0, label: '온보딩 영상' },
  { stepId: 'onboarding_step_1', stepIndex: 1, label: '검증된 사람들' },
  { stepId: 'onboarding_step_2', stepIndex: 2, label: '2주간 독서' },
  { stepId: 'onboarding_step_3', stepIndex: 3, label: '클로징 파티' },
  // 신청폼 단계 (신규 회원)
  { stepId: 'intro', stepIndex: 4, label: '인트로' },
  { stepId: 'membership_status', stepIndex: 5, label: '회원 유형 선택' },
  { stepId: 'personal_info', stepIndex: 6, label: '기본 정보' },
  { stepId: 'job_info', stepIndex: 7, label: '직장 정보' },
  { stepId: 'channel', stepIndex: 8, label: '유입 채널' },
  { stepId: 'photo', stepIndex: 9, label: '사진 업로드' },
  { stepId: 'birthdate', stepIndex: 10, label: '생년월일' },
  { stepId: 'submit', stepIndex: 11, label: '제출 완료' },
] as const;

/**
 * 기존 회원 퍼널 단계 정의 (온보딩 4단계 + 신청폼 5단계 = 9단계)
 */
export const EXISTING_MEMBER_FUNNEL_STEPS = [
  // 온보딩 단계 (공통)
  { stepId: 'onboarding_video', stepIndex: 0, label: '온보딩 영상' },
  { stepId: 'onboarding_step_1', stepIndex: 1, label: '검증된 사람들' },
  { stepId: 'onboarding_step_2', stepIndex: 2, label: '2주간 독서' },
  { stepId: 'onboarding_step_3', stepIndex: 3, label: '클로징 파티' },
  // 신청폼 단계 (기존 회원)
  { stepId: 'intro', stepIndex: 4, label: '인트로' },
  { stepId: 'membership_status', stepIndex: 5, label: '회원 유형 선택' },
  { stepId: 'cohort_check', stepIndex: 6, label: '기수 확인' },
  { stepId: 'personal_info_existing', stepIndex: 7, label: '기본 정보' },
  { stepId: 'submit', stepIndex: 8, label: '제출 완료' },
] as const;

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
 * 기간 타입
 */
export type PeriodFilter = 'today' | '7days' | '30days' | 'all';

/**
 * 기간에 따른 시작 시간 계산
 */
function getStartDate(period: PeriodFilter): Date | null {
  const now = new Date();

  switch (period) {
    case 'today':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    case '7days':
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return sevenDaysAgo;
    case '30days':
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return thirtyDaysAgo;
    case 'all':
      return null;
  }
}

/**
 * 퍼널 단계별 집계 데이터 조회
 */
export interface FunnelStepData {
  stepId: string;
  stepLabel: string;
  stepIndex: number;
  count: number;
  percentage: number;      // 첫 단계 대비 비율 (%)
  dropoffRate: number;     // 이전 단계 대비 이탈률 (%)
}

/**
 * 기간별 퍼널 데이터 조회
 */
export async function getFunnelData(
  period: PeriodFilter,
  memberType: 'new' | 'existing' = 'new'
): Promise<FunnelStepData[]> {
  const db = getDb();
  const startDate = getStartDate(period);

  // 쿼리 구성
  let q = query(
    collection(db, 'funnel_events'),
    orderBy('timestamp', 'desc')
  );

  if (startDate) {
    q = query(
      collection(db, 'funnel_events'),
      where('timestamp', '>=', Timestamp.fromDate(startDate)),
      orderBy('timestamp', 'desc')
    );
  }

  const snapshot = await getDocs(q);

  // 1단계: 각 세션의 memberType 결정 (null이 아닌 값 우선)
  // intro, membership_status 단계에서는 memberType이 null이므로
  // 이후 단계에서 결정된 memberType을 세션 전체에 적용
  const sessionMemberTypes = new Map<string, 'new' | 'existing' | null>();

  snapshot.docs.forEach(doc => {
    const data = doc.data();
    const sessionId = data.sessionId as string;
    const eventMemberType = data.memberType as 'new' | 'existing' | null;

    // memberType이 있고, 아직 세션의 memberType이 결정되지 않았으면 저장
    if (eventMemberType && !sessionMemberTypes.has(sessionId)) {
      sessionMemberTypes.set(sessionId, eventMemberType);
    }
  });

  // 2단계: 세션별로 그룹핑하여 각 단계 도달 수 계산
  // 같은 세션에서 같은 단계는 1번만 카운트
  const sessionSteps = new Map<string, Set<string>>();

  snapshot.docs.forEach(doc => {
    const data = doc.data();
    const sessionId = data.sessionId as string;
    const stepId = data.stepId as string;

    // 세션의 memberType으로 필터링
    // - null인 세션(온보딩에서 이탈)은 신규 회원으로 집계
    const sessionType = sessionMemberTypes.get(sessionId) || null;
    const effectiveType = sessionType ?? 'new'; // null이면 신규로 간주
    if (effectiveType !== memberType) {
      return;
    }

    if (!sessionSteps.has(sessionId)) {
      sessionSteps.set(sessionId, new Set());
    }
    sessionSteps.get(sessionId)!.add(stepId);
  });

  // 단계별 카운트 계산
  const stepCounts = new Map<string, number>();

  sessionSteps.forEach(steps => {
    steps.forEach(stepId => {
      stepCounts.set(stepId, (stepCounts.get(stepId) || 0) + 1);
    });
  });

  // 결과 구성
  const steps = memberType === 'existing' ? EXISTING_MEMBER_FUNNEL_STEPS : FUNNEL_STEPS;
  const firstStepCount = stepCounts.get(steps[0].stepId) || 0;

  let prevCount = firstStepCount;

  return steps.map((step, index) => {
    const count = stepCounts.get(step.stepId) || 0;
    const percentage = firstStepCount > 0 ? Math.round((count / firstStepCount) * 100) : 0;
    const dropoffRate = prevCount > 0 ? Math.round(((prevCount - count) / prevCount) * 100) : 0;

    prevCount = count;

    return {
      stepId: step.stepId,
      stepLabel: step.label,
      stepIndex: step.stepIndex,
      count,
      percentage,
      dropoffRate: index === 0 ? 0 : dropoffRate,
    };
  });
}
