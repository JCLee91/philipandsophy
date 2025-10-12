'use client';

import { Suspense, useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Users, Check, X, Loader2 } from 'lucide-react';
import { getTodayString } from '@/lib/date-utils';
import { getDailyQuestionText } from '@/constants/daily-questions';
import { MATCHING_CONFIG } from '@/constants/matching';
import { logger } from '@/lib/logger';
import { useSession } from '@/hooks/use-session';
import { useSubmissionCount } from '@/hooks/use-submission-count';
import PageTransition from '@/components/PageTransition';
import UnifiedButton from '@/components/UnifiedButton';
import HeaderNavigation from '@/components/HeaderNavigation';
import ParticipantAssignmentTable from '@/components/admin/ParticipantAssignmentTable';
import { useToast } from '@/hooks/use-toast';
import { useParticipantsByCohort } from '@/hooks/use-participants';
import type { Participant } from '@/types/database';
import { appRoutes } from '@/lib/navigation';

interface MatchingReasons {
  similar?: string;
  opposite?: string;
  summary?: string;
}

interface ParticipantAssignment {
  similar: string[];
  opposite: string[];
  reasons?: MatchingReasons | null;
}

interface MatchingResponse {
  success: boolean;
  date: string;
  question?: string;
  totalParticipants?: number;
  matching: {
    featured?: {
      similar: string[];
      opposite: string[];
      reasons?: MatchingReasons | null;
    };
    assignments?: Record<string, ParticipantAssignment>;
  };
  featuredParticipants?: {
    similar: Array<{ id: string; name: string }>;
    opposite: Array<{ id: string; name: string }>;
  };
}

interface AssignmentRow {
  viewerId: string;
  viewerName: string;
  viewerOccupation?: string;
  similarTargets: Array<{ id: string; name: string }>;
  oppositeTargets: Array<{ id: string; name: string }>;
  reasons?: MatchingReasons | null;
}

function MatchingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cohortId = searchParams.get('cohort');
  const { currentUser, isLoading: sessionLoading, sessionToken } = useSession();
  const { toast } = useToast();
  const { data: cohortParticipants = [], isLoading: participantsLoading } = useParticipantsByCohort(cohortId || undefined);

  // 실시간 제출 카운트 (Firebase onSnapshot)
  const { count: submissionCount, isLoading: isLoadingCount } = useSubmissionCount(cohortId || undefined);

  // 매칭 상태 관리: idle | previewing | confirmed
  const [matchingState, setMatchingState] = useState<'idle' | 'previewing' | 'confirmed'>('idle');
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewResult, setPreviewResult] = useState<MatchingResponse | null>(null);
  const [confirmedResult, setConfirmedResult] = useState<MatchingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const today = getTodayString();
  const todayQuestion = getDailyQuestionText();

  const participantsById = useMemo(() => {
    const map = new Map<string, Participant>();
    cohortParticipants.forEach((participant) => {
      map.set(participant.id, participant);
    });
    return map;
  }, [cohortParticipants]);

  const assignmentRows = useMemo<AssignmentRow[]>(() => {
    // 프리뷰 또는 확인된 결과 중 하나 사용
    const currentResult = previewResult || confirmedResult;
    if (!currentResult?.matching.assignments) return [];

    return cohortParticipants
      .filter((participant) => !participant.isAdmin && !participant.isAdministrator)
      .map((participant) => {
        const assignment = currentResult.matching.assignments?.[participant.id];
        const similarTargets = assignment?.similar ?? [];
        const oppositeTargets = assignment?.opposite ?? [];

        return {
          viewerId: participant.id,
          viewerName: participant.name,
          viewerOccupation: participant.occupation,
          similarTargets: similarTargets.map((id) => {
            const target = participantsById.get(id);
            return {
              id,
              name: target?.name ?? `참가자 ${id}`,
            };
          }),
          oppositeTargets: oppositeTargets.map((id) => {
            const target = participantsById.get(id);
            return {
              id,
              name: target?.name ?? `참가자 ${id}`,
            };
          }),
          reasons: assignment?.reasons ?? null,
        };
      });
  }, [previewResult, confirmedResult, cohortParticipants, participantsById]);

  // 권한 체크
  useEffect(() => {
    if (!sessionLoading) {
      if (!currentUser) {
        router.replace('/app');
        return;
      }
      // 🔒 isAdmin + isAdministrator 이중 체크 (필드명 호환성)
      if (!currentUser.isAdmin && !currentUser.isAdministrator) {
        toast({
          title: '접근 권한 없음',
          description: '관리자만 접근할 수 있는 페이지입니다.',
          variant: 'destructive',
        });
        router.replace(`/app/chat?cohort=${cohortId}`);
        return;
      }
      if (!cohortId) {
        router.replace('/app');
        return;
      }
    }
  }, [sessionLoading, currentUser, cohortId, router, toast]);

  // 기존 매칭 결과 로드 (제출 현황은 useSubmissionCount가 실시간 처리)
  const fetchMatchingResult = useCallback(async () => {
    if (!cohortId || !sessionToken) return;
    try {
      const response = await fetch(
        `/api/admin/matching?cohortId=${cohortId}&date=${today}`,
        {
          headers: {
            'Authorization': `Bearer ${sessionToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setConfirmedResult(data);
        setMatchingState('confirmed');
      }
    } catch (error) {
      logger.error('매칭 결과 로드 실패', error);
    }
  }, [cohortId, today, sessionToken]);

  useEffect(() => {
    if (cohortId) {
      fetchMatchingResult();
    }
  }, [cohortId, fetchMatchingResult]);

  const handleOpenProfile = (participantId: string, theme: 'similar' | 'opposite') => {
    if (!cohortId) return;
    router.push(appRoutes.profile(participantId, cohortId, theme));
  };

  // 1단계: AI 매칭 프리뷰 (저장하지 않음)
  const handleStartMatching = async () => {
    if (!cohortId || !sessionToken) return;

    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/matching/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ cohortId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || '매칭 실행 실패');
      }

      setPreviewResult(data);
      setMatchingState('previewing');

      const matchedCount =
        data.totalParticipants ??
        (data.matching?.assignments
          ? Object.keys(data.matching.assignments).length
          : 0);

      toast({
        title: 'AI 매칭 완료',
        description: `${matchedCount}명의 참가자 매칭 결과를 확인하세요.`,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : '매칭 실행 중 오류가 발생했습니다.';
      setError(errorMessage);
      toast({
        title: '매칭 실패',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // 2단계: 매칭 결과 최종 확인 및 저장
  const handleConfirmMatching = async () => {
    if (!cohortId || !sessionToken || !previewResult) return;

    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/matching/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          cohortId,
          matching: previewResult.matching,
          date: previewResult.date,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || '매칭 저장 실패');
      }

      // 프리뷰 결과를 확인된 결과로 이동
      setConfirmedResult(previewResult);
      setPreviewResult(null);
      setMatchingState('confirmed');

      toast({
        title: '매칭 적용 완료',
        description: '오늘의 서재에서 참가자들이 확인할 수 있습니다.',
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : '매칭 저장 중 오류가 발생했습니다.';
      setError(errorMessage);
      toast({
        title: '저장 실패',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // 로딩 중
  if (sessionLoading) {
    return (
      <PageTransition>
        <div className="app-shell flex flex-col overflow-hidden">
          <HeaderNavigation title="매칭 관리" />
          <main className="flex-1 flex items-center justify-center bg-background">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </main>
        </div>
      </PageTransition>
    );
  }

  // 권한 없음
  if ((!currentUser?.isAdmin && !currentUser?.isAdministrator) || !cohortId) {
    return null;
  }

  const canMatch = submissionCount >= MATCHING_CONFIG.MIN_SUBMISSIONS_FOR_MATCHING;

  return (
    <PageTransition>
      <div className="app-shell flex flex-col overflow-hidden">
        <HeaderNavigation
          title="AI 매칭 관리"
          showBackButton
          onBackClick={() => router.push(`/app/chat?cohort=${cohortId}`)}
        />

        <main className="flex-1 overflow-y-auto bg-[#eff6ff]">
          <div className="mx-auto max-w-md px-4 py-6 space-y-4">
            {/* 상태 카드 */}
            <div className="bg-white rounded-xl border border-[#dddddd] p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#cee7ff]">
                  <Users className="h-6 w-6 text-[#45a1fd]" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-[#31363e]">오늘의 제출 현황</h2>
                  <p className="text-sm text-[#8f98a3]">{today} · Cohort {cohortId}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#8f98a3]">제출 완료</span>
                  <span className="text-2xl font-bold text-[#45a1fd]">
                    {isLoadingCount ? '...' : `${submissionCount}명`}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#8f98a3]">매칭 가능 여부</span>
                  {canMatch ? (
                    <span className="flex items-center gap-1 text-sm font-semibold text-[#45a1fd]">
                      <Check className="h-4 w-4" />
                      가능
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-sm font-semibold text-[#ffd362]">
                      <X className="h-4 w-4" />
                      불가능 (최소 4명 필요)
                    </span>
                  )}
                </div>
              </div>

              {/* 오늘의 질문 */}
              <div className="pt-4 border-t border-[#dddddd]">
                <p className="text-xs font-semibold mb-2 text-[#8f98a3]">
                  오늘의 질문
                </p>
                <p className="text-sm leading-relaxed text-[#575e68]">
                  {todayQuestion}
                </p>
              </div>
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="rounded-xl p-4 border bg-[#fff2d2] border-[#ffd362]">
                <p className="text-sm text-[#575e68]">{error}</p>
              </div>
            )}

            {/* 매칭 시작 버튼 (idle 상태일 때만) */}
            {matchingState === 'idle' && (
              <UnifiedButton
                variant="primary"
                onClick={handleStartMatching}
                disabled={!canMatch || isProcessing}
                icon={
                  isProcessing ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : undefined
                }
                className="w-full"
              >
                {isProcessing ? 'AI 분석 중...' : '매칭 시작하기'}
              </UnifiedButton>
            )}

            {/* 프리뷰 상태: 최종 확인 필요 */}
            {matchingState === 'previewing' && previewResult && (
              <div className="space-y-4">
                {/* 프리뷰 상태 카드 */}
                <div className="bg-[#fff2d2] rounded-xl border border-[#ffd362] p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-[#31363e]">✅ AI 매칭 완료 (미적용)</h3>
                      <p className="text-xs text-[#8f98a3]">{previewResult.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-[#8f98a3]">매칭 인원</p>
                      <p className="text-xl font-bold text-[#ffa940]">
                        {(previewResult.totalParticipants ?? submissionCount) || 0}명
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-[#575e68] mb-4">
                    아래 결과를 확인한 후 <strong>최종 확인 및 적용</strong> 버튼을 눌러주세요.
                    <br />
                    적용 전까지는 참가자들에게 노출되지 않습니다.
                  </p>

                  <div className="flex flex-col gap-2">
                    <UnifiedButton
                      variant="primary"
                      fullWidth
                      onClick={handleConfirmMatching}
                      disabled={isProcessing}
                      icon={
                        isProcessing ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Check className="h-5 w-5" />
                        )
                      }
                    >
                      {isProcessing ? '저장 중...' : '최종 확인 및 적용'}
                    </UnifiedButton>
                    <UnifiedButton
                      variant="outline"
                      fullWidth
                      onClick={handleStartMatching}
                      disabled={!canMatch || isProcessing}
                      icon={
                        isProcessing ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : undefined
                      }
                    >
                      {isProcessing ? 'AI 분석 중...' : '다시 매칭하기'}
                    </UnifiedButton>
                  </div>
                </div>

                {/* 참가자별 추천 테이블 (프리뷰) */}
                <ParticipantAssignmentTable
                  assignmentRows={assignmentRows}
                  participantsLoading={participantsLoading}
                  onOpenProfile={handleOpenProfile}
                />
              </div>
            )}

            {/* 확인된 상태: 매칭 적용 완료 */}
            {matchingState === 'confirmed' && confirmedResult && (
              <div className="space-y-4">
                {/* 확인 완료 상태 카드 */}
                <div className="bg-white rounded-xl border border-[#dddddd] p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-[#31363e]">매칭 완료 ✅</h3>
                      <p className="text-xs text-[#8f98a3]">{confirmedResult.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-[#8f98a3]">매칭 인원</p>
                      <p className="text-xl font-bold text-[#45a1fd]">
                        {(confirmedResult.totalParticipants ?? submissionCount) || 0}명
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <UnifiedButton
                      variant="secondary"
                      fullWidth
                      onClick={() => cohortId && router.push(appRoutes.todayLibrary(cohortId))}
                      icon={<Users className="h-5 w-5" />}
                    >
                      오늘의 서재에서 확인하기
                    </UnifiedButton>
                    <UnifiedButton
                      variant="outline"
                      fullWidth
                      onClick={handleStartMatching}
                      disabled={!canMatch || isProcessing}
                      icon={
                        isProcessing ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : undefined
                      }
                    >
                      {isProcessing ? 'AI 분석 중...' : '다시 매칭하기'}
                    </UnifiedButton>
                  </div>
                </div>

                {/* 참가자별 추천 테이블 (확인됨) */}
                <ParticipantAssignmentTable
                  assignmentRows={assignmentRows}
                  participantsLoading={participantsLoading}
                  onOpenProfile={handleOpenProfile}
                />
              </div>
            )}

            {/* 안내 메시지 */}
            <div className="rounded-xl p-4 border bg-[#cee7ff] border-[#dddddd]">
              <p className="text-xs leading-relaxed text-[#575e68]">
                <strong className="text-[#31363e]">매칭 운영 가이드</strong>
                <br />• 최소 4명의 참가자가 오늘의 질문에 답변해야 AI 매칭을 실행할 수 있습니다.
                <br />• AI는 참가자들의 답변을 분석해 오늘 공개할 프로필북 4개(유사 2, 반대 2)를 선정합니다.
                <br />• 선정된 프로필북은 오늘의 서재에 자동 게시되며, 필요 시 이 페이지에서 재매칭할 수 있습니다.
              </p>
            </div>
          </div>
        </main>
      </div>
    </PageTransition>
  );
}

export default function MatchingPage() {
  return (
    <Suspense
      fallback={
        <div className="app-shell flex items-center justify-center bg-[#eff6ff]">
          <Loader2 className="h-8 w-8 animate-spin text-[#45a1fd]" />
        </div>
      }
    >
      <MatchingPageContent />
    </Suspense>
  );
}
