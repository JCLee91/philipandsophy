import { NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase/admin-init';
import { 
  FUNNEL_STEPS, 
  EXISTING_MEMBER_FUNNEL_STEPS, 
  PeriodFilter 
} from '@/lib/funnel-constants';

export const dynamic = 'force-dynamic';

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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = (searchParams.get('period') || '7days') as PeriodFilter;
    const memberType = (searchParams.get('memberType') || 'new') as 'new' | 'existing';

    const { db } = getFirebaseAdmin();
    const startDate = getStartDate(period);
    
    // 쿼리 구성
    let query = db.collection('funnel_events').orderBy('timestamp', 'desc');

    if (startDate) {
      query = query.where('timestamp', '>=', startDate);
    }

    const snapshot = await query.get();

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

    // 먼저 각 단계의 기본 데이터 계산
    const stepDataList = steps.map((step) => {
      const count = stepCounts.get(step.stepId) || 0;
      const percentage = firstStepCount > 0 ? Math.round((count / firstStepCount) * 100) : 0;
      return {
        stepId: step.stepId,
        stepLabel: step.label,
        stepIndex: step.stepIndex,
        count,
        percentage,
      };
    });

    // 이탈률: 현재 단계에서 다음 단계로 넘어가지 못한 비율
    // 마지막 단계는 이탈률 0 (다음 단계가 없으므로)
    const result = stepDataList.map((step, index) => {
      const isLastStep = index === stepDataList.length - 1;

      let dropoffRate = 0;
      if (!isLastStep && step.count > 0) {
        const nextCount = stepDataList[index + 1].count;
        dropoffRate = Math.round(((step.count - nextCount) / step.count) * 100);
      }

      return { ...step, dropoffRate };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Funnel API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
