'use client';

import { Suspense, useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sparkles, Users, Check, X, Loader2 } from 'lucide-react';
import { getTodayString } from '@/lib/date-utils';
import { getDailyQuestionText } from '@/constants/daily-questions';
import { useSession } from '@/hooks/use-session';
import PageTransition from '@/components/PageTransition';
import UnifiedButton from '@/components/UnifiedButton';
import HeaderNavigation from '@/components/HeaderNavigation';
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

  const [isMatching, setIsMatching] = useState(false);
  const [matchingResult, setMatchingResult] = useState<MatchingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submissionCount, setSubmissionCount] = useState<number>(0);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

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
    if (!matchingResult?.matching.assignments) return [];

    return cohortParticipants
      .filter((participant) => !participant.isAdmin)
      .map((participant) => {
        const assignment = matchingResult.matching.assignments?.[participant.id];
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
  }, [matchingResult, cohortParticipants, participantsById]);

  // 권한 체크
  useEffect(() => {
    if (!sessionLoading) {
      if (!currentUser) {
        router.replace('/app');
        return;
      }
      if (!currentUser.isAdmin) {
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

  // 기존 매칭 결과 및 제출 현황 로드
  const fetchMatchingStatus = useCallback(async () => {
    if (!cohortId || !sessionToken) return;
    try {
      setIsLoadingStatus(true);

      // 기존 매칭 결과 조회
      const matchingResponse = await fetch(
        `/api/admin/matching?cohortId=${cohortId}&date=${today}`,
        {
          headers: {
            'Authorization': `Bearer ${sessionToken}`,
          },
        }
      );

      if (matchingResponse.ok) {
        const data = await matchingResponse.json();
        setMatchingResult(data);
      }

      // 제출 현황 조회
      const statusResponse = await fetch(
        `/api/admin/matching/status?cohortId=${cohortId}&date=${today}`,
        {
          headers: {
            'Authorization': `Bearer ${sessionToken}`,
          },
        }
      );

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        setSubmissionCount(statusData.submissionCount || 0);
      }
    } catch (error) {
      console.error('데이터 로드 실패:', error);
    } finally {
      setIsLoadingStatus(false);
    }
  }, [cohortId, today, sessionToken]);

  useEffect(() => {
    if (cohortId) {
      fetchMatchingStatus();
    }
  }, [cohortId, fetchMatchingStatus]);

  const handleOpenProfile = (participantId: string, theme: 'similar' | 'opposite') => {
    if (!cohortId) return;
    router.push(appRoutes.profile(participantId, cohortId, theme));
  };

  const handleStartMatching = async () => {
    if (!cohortId || !sessionToken) return;

    setIsMatching(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/matching', {
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

      setMatchingResult(data);
      
      // 매칭 후 제출 현황 갱신
      await fetchMatchingStatus();
      
      const matchedCount =
        data.totalParticipants ??
        (data.matching?.assignments
          ? Object.keys(data.matching.assignments).length
          : 0);

      toast({
        title: '✨ 매칭 완료!',
        description: `${matchedCount}명의 참가자를 성공적으로 매칭했습니다.`,
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
      setIsMatching(false);
    }
  };

  // 로딩 중
  if (sessionLoading) {
    return (
      <PageTransition>
        <div className="app-shell flex flex-col overflow-hidden">
          <HeaderNavigation title="매칭 관리" />
          <main className="flex-1 flex items-center justify-center" style={{ backgroundColor: '#F5F7FA' }}>
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#4FA3FF' }} />
          </main>
        </div>
      </PageTransition>
    );
  }

  // 권한 없음
  if (!currentUser?.isAdmin || !cohortId) {
    return null;
  }

  const canMatch = submissionCount >= 4;

  return (
    <PageTransition>
      <div className="app-shell flex flex-col overflow-hidden">
        <HeaderNavigation
          title="AI 매칭 관리"
          showBackButton
          onBackClick={() => router.push(`/app/chat?cohort=${cohortId}`)}
        />

        <main className="flex-1 overflow-y-auto" style={{ backgroundColor: '#F5F7FA' }}>
          <div className="mx-auto max-w-md px-4 py-6 space-y-4">
            {/* 상태 카드 */}
            <div className="bg-white rounded-xl border border-[#E1E5E9] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.08)] space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-12 h-12 rounded-full" style={{ backgroundColor: 'rgba(79, 163, 255, 0.1)' }}>
                  <Users className="h-6 w-6" style={{ color: '#4FA3FF' }} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold" style={{ color: '#1E2A44' }}>오늘의 제출 현황</h2>
                  <p className="text-sm" style={{ color: '#6B7280' }}>{today}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: '#6B7280' }}>제출 완료</span>
                  <span className="text-2xl font-bold" style={{ color: '#4FA3FF' }}>
                    {isLoadingStatus ? '...' : `${submissionCount}명`}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: '#6B7280' }}>매칭 가능 여부</span>
                  {canMatch ? (
                    <span className="flex items-center gap-1 text-sm font-semibold" style={{ color: '#10B981' }}>
                      <Check className="h-4 w-4" />
                      가능
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-sm font-semibold" style={{ color: '#EF4444' }}>
                      <X className="h-4 w-4" />
                      불가능 (최소 4명 필요)
                    </span>
                  )}
                </div>
              </div>

              {/* 오늘의 질문 */}
              <div className="pt-4 border-t" style={{ borderColor: '#E1E5E9' }}>
                <p className="text-xs font-semibold mb-2" style={{ color: '#6B7280' }}>
                  오늘의 질문
                </p>
                <p className="text-sm leading-relaxed" style={{ color: '#2A2D34' }}>
                  {todayQuestion}
                </p>
              </div>
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="rounded-xl p-4 border" style={{ backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' }}>
                <p className="text-sm" style={{ color: '#991B1B' }}>{error}</p>
              </div>
            )}

            {/* 매칭 시작 버튼 */}
            {!matchingResult && (
              <UnifiedButton
                variant="primary"
                onClick={handleStartMatching}
                disabled={!canMatch || isMatching}
                icon={
                  isMatching ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Sparkles className="h-5 w-5" />
                  )
                }
                className="w-full"
              >
                {isMatching ? 'AI 분석 중...' : '매칭 시작하기'}
              </UnifiedButton>
            )}

            {/* 매칭 결과 */}
            {matchingResult && (
              <div className="space-y-4">
                {/* 매칭 완료 상태 카드 */}
                <div className="bg-white rounded-xl border p-5 shadow-[0_2px_8px_rgba(0,0,0,0.08)]" style={{ borderColor: '#E1E5E9' }}>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <h3 className="text-lg font-semibold" style={{ color: '#1E2A44' }}>매칭 완료</h3>
                      <p className="text-xs" style={{ color: '#6B7280' }}>{matchingResult.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs" style={{ color: '#6B7280' }}>매칭 인원</p>
                      <p className="text-xl font-bold" style={{ color: '#4FA3FF' }}>
                        {(matchingResult.totalParticipants ?? submissionCount) || 0}명
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
                      disabled={!canMatch || isMatching}
                      icon={
                        isMatching ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Sparkles className="h-5 w-5" />
                        )
                      }
                    >
                      {isMatching ? 'AI 분석 중...' : '다시 매칭하기'}
                    </UnifiedButton>
                  </div>
                </div>

                {/* 참가자별 추천 테이블 */}
                <div className="bg-white rounded-xl border p-5 shadow-[0_2px_8px_rgba(0,0,0,0.08)]" style={{ borderColor: '#E1E5E9' }}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold" style={{ color: '#1E2A44' }}>참가자별 추천 현황</h3>
                    <span className="text-xs font-medium" style={{ color: '#6B7280' }}>
                      총 {assignmentRows.length}명
                    </span>
                  </div>

                  {participantsLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-6 w-6 animate-spin" style={{ color: '#4FA3FF' }} />
                    </div>
                  ) : assignmentRows.length === 0 ? (
                    <p className="text-sm" style={{ color: '#6B7280' }}>
                      추천 데이터가 없습니다.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {assignmentRows.map((row) => (
                        <div
                          key={row.viewerId}
                          className="rounded-lg border p-3 space-y-2"
                          style={{ borderColor: '#E5E7EB', backgroundColor: '#FAFAFA' }}
                        >
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-sm" style={{ color: '#111827' }}>
                              {row.viewerName}
                            </p>
                            <UnifiedButton
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenProfile(row.viewerId, 'similar')}
                            >
                              프로필 보기
                            </UnifiedButton>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <p className="font-semibold mb-1" style={{ color: '#2563EB' }}>비슷한 가치관</p>
                              {row.similarTargets.length > 0 ? (
                                <div className="space-y-0.5">
                                  {row.similarTargets.map((target) => (
                                    <p
                                      key={`${row.viewerId}-similar-${target.id}`}
                                      className="cursor-pointer hover:underline"
                                      style={{ color: '#374151' }}
                                      onClick={() => handleOpenProfile(target.id, 'similar')}
                                    >
                                      • {target.name}
                                    </p>
                                  ))}
                                </div>
                              ) : (
                                <p style={{ color: '#9CA3AF' }}>없음</p>
                              )}
                            </div>

                            <div>
                              <p className="font-semibold mb-1" style={{ color: '#B45309' }}>반대 가치관</p>
                              {row.oppositeTargets.length > 0 ? (
                                <div className="space-y-0.5">
                                  {row.oppositeTargets.map((target) => (
                                    <p
                                      key={`${row.viewerId}-opposite-${target.id}`}
                                      className="cursor-pointer hover:underline"
                                      style={{ color: '#374151' }}
                                      onClick={() => handleOpenProfile(target.id, 'opposite')}
                                    >
                                      • {target.name}
                                    </p>
                                  ))}
                                </div>
                              ) : (
                                <p style={{ color: '#9CA3AF' }}>없음</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 안내 메시지 */}
            <div className="rounded-xl p-4 border" style={{ backgroundColor: '#F0F8FF', borderColor: '#E1E5E9' }}>
              <p className="text-xs leading-relaxed" style={{ color: '#6B7280' }}>
                💡 <strong style={{ color: '#1E2A44' }}>매칭 운영 가이드</strong>
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
        <div className="app-shell flex items-center justify-center" style={{ backgroundColor: '#F5F7FA' }}>
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#4FA3FF' }} />
        </div>
      }
    >
      <MatchingPageContent />
    </Suspense>
  );
}
