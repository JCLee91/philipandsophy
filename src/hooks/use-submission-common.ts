'use client';

import { useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSubmissionFlowStore } from '@/stores/submission-flow-store';
import { useKeyboardHeight } from '@/hooks/use-keyboard-height';
import { useToast } from '@/hooks/use-toast';
import { getSubmissionDate } from '@/lib/date-utils';
import { appRoutes } from '@/lib/navigation';

/**
 * Submit Step 1/2/3 공통 훅
 * - 라우팅, 인증, 키보드 높이 등 공통 로직 관리
 */
export function useSubmissionCommon() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cohortId = searchParams.get('cohort');
  const existingSubmissionId = searchParams.get('edit');

  const { participant, isLoading: sessionLoading } = useAuth();
  const { toast } = useToast();
  const keyboardHeight = useKeyboardHeight();

  const {
    participantId,
    participationCode,
    setMetaInfo,
    submissionDate,
    setSubmissionDate,
  } = useSubmissionFlowStore();

  // 하단 버튼 영역 패딩 계산
  const footerPaddingBottom = useMemo(
    () =>
      keyboardHeight > 0
        ? `calc(16px + env(safe-area-inset-bottom, 0px))`
        : `calc(60px + env(safe-area-inset-bottom, 0px))`,
    [keyboardHeight]
  );

  // 메인 콘텐츠 영역 패딩 계산
  const mainPaddingBottom = useMemo(
    () => (keyboardHeight > 0 ? keyboardHeight + 32 : 32),
    [keyboardHeight]
  );

  // 인증 확인 - 세션이 없거나 cohortId가 없으면 앱 홈으로 이동
  useEffect(() => {
    if (!sessionLoading && (!participant || !cohortId)) {
      router.replace('/app');
    }
  }, [sessionLoading, participant, cohortId, router]);

  // 메타 정보 설정 + 제출 날짜 결정
  useEffect(() => {
    if (participant && cohortId) {
      const participationCodeValue = participant.participationCode || participant.id;
      setMetaInfo(participant.id, participationCodeValue, cohortId, existingSubmissionId || undefined);

      // 새로운 제출이고 아직 날짜가 설정되지 않은 경우에만 날짜 설정
      if (!existingSubmissionId && !submissionDate) {
        const date = getSubmissionDate();
        setSubmissionDate(date);
      }
    }
  }, [participant, cohortId, existingSubmissionId, setMetaInfo, submissionDate, setSubmissionDate]);

  // 뒤로가기 핸들러
  const handleBack = () => {
    router.back();
  };

  // 채팅 화면으로 이동 (Step 1에서 사용)
  const handleBackToChat = () => {
    if (cohortId) {
      router.push(appRoutes.chat(cohortId));
    } else {
      router.push('/app');
    }
  };

  return {
    // 라우팅
    router,
    cohortId,
    existingSubmissionId,

    // 인증
    participant,
    sessionLoading,

    // 스토어
    participantId,
    participationCode,
    submissionDate,

    // 키보드
    keyboardHeight,
    footerPaddingBottom,
    mainPaddingBottom,

    // 유틸
    toast,
    handleBack,
    handleBackToChat,
  };
}
