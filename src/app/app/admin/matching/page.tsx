'use client';

import { Suspense, useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sparkles, Users, Check, X, Loader2, BookOpen, Brain } from 'lucide-react';
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

interface MatchingResult {
  success: boolean;
  date: string;
  question?: string;
  totalParticipants?: number;
  matching: {
    similar: string[];
    opposite: string[];
    reasons?: MatchingReasons | null;
  };
  participants: {
    similar: Array<{ id: string; name: string }>;
    opposite: Array<{ id: string; name: string }>;
  };
  reasons?: MatchingReasons | null;
}

interface FeaturedParticipantDetail {
  id: string;
  name: string;
  theme: 'similar' | 'opposite';
  occupation?: string;
  bio?: string;
  currentBookTitle?: string;
  profileBookUrl?: string;
  profileImage?: string;
}

interface FeaturedParticipantCardProps {
  participant: FeaturedParticipantDetail;
  onOpenProfile: (participantId: string, theme: 'similar' | 'opposite') => void;
}

function FeaturedParticipantCard({ participant, onOpenProfile }: FeaturedParticipantCardProps) {
  const isSimilar = participant.theme === 'similar';
  const themeStyles = isSimilar
    ? {
        badgeBg: 'rgba(79, 163, 255, 0.15)',
        badgeColor: '#2563EB',
        cardBg: '#F5FAFF',
        borderColor: '#DBEAFE',
        textColor: '#1E2A44',
        accentColor: '#2563EB',
      }
    : {
        badgeBg: 'rgba(245, 158, 11, 0.15)',
        badgeColor: '#B45309',
        cardBg: '#FFFBEB',
        borderColor: '#FCD34D',
        textColor: '#1E2A44',
        accentColor: '#B45309',
      };

  return (
    <div
      className="rounded-xl border p-4 space-y-4"
      style={{ backgroundColor: themeStyles.cardBg, borderColor: themeStyles.borderColor }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <p className="font-semibold truncate" style={{ color: themeStyles.textColor }}>
            {participant.name}
          </p>
          {participant.occupation && (
            <p className="text-sm truncate" style={{ color: '#6B7280' }}>
              {participant.occupation}
            </p>
          )}
          {participant.bio && (
            <p className="text-xs leading-relaxed" style={{ color: '#4B5563' }}>
              {participant.bio}
            </p>
          )}
        </div>
        <span
          className="px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
          style={{ backgroundColor: themeStyles.badgeBg, color: themeStyles.badgeColor }}
        >
          {isSimilar ? '유사 매칭' : '반대 매칭'}
        </span>
      </div>

      {participant.currentBookTitle && (
        <div className="flex items-start gap-2 text-xs leading-relaxed" style={{ color: '#4B5563' }}>
          <BookOpen className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: themeStyles.accentColor }} />
          <span>
            현재 읽는 책: <span className="font-semibold" style={{ color: themeStyles.textColor }}>{participant.currentBookTitle}</span>
          </span>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <UnifiedButton
          variant="secondary"
          size="sm"
          className="border-0"
          onClick={() => onOpenProfile(participant.id, participant.theme)}
        >
          프로필 열기
        </UnifiedButton>
        {participant.profileBookUrl && (
          <UnifiedButton
            variant="outline"
            size="sm"
            onClick={() => window.open(participant.profileBookUrl!, '_blank', 'noopener')}
          >
            프로필북 링크
          </UnifiedButton>
        )}
      </div>
    </div>
  );
}

function MatchingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cohortId = searchParams.get('cohort');
  const { currentUser, isLoading: sessionLoading } = useSession();
  const { toast } = useToast();
  const { data: cohortParticipants = [], isLoading: participantsLoading } = useParticipantsByCohort(cohortId || undefined);

  const [isMatching, setIsMatching] = useState(false);
  const [matchingResult, setMatchingResult] = useState<MatchingResult | null>(null);
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

  const similarFeatured = useMemo<FeaturedParticipantDetail[]>(() => {
    if (!matchingResult) return [];
    return matchingResult.matching.similar.map((id) => {
      const participant = participantsById.get(id);
      const fallback = matchingResult.participants.similar.find((p) => p.id === id);
      return {
        id,
        name: participant?.name ?? fallback?.name ?? '알 수 없음',
        theme: 'similar' as const,
        occupation: participant?.occupation,
        bio: participant?.bio,
        currentBookTitle: participant?.currentBookTitle,
        profileBookUrl: participant?.profileBookUrl,
        profileImage: participant?.profileImage,
      };
    });
  }, [matchingResult, participantsById]);

  const oppositeFeatured = useMemo<FeaturedParticipantDetail[]>(() => {
    if (!matchingResult) return [];
    return matchingResult.matching.opposite.map((id) => {
      const participant = participantsById.get(id);
      const fallback = matchingResult.participants.opposite.find((p) => p.id === id);
      return {
        id,
        name: participant?.name ?? fallback?.name ?? '알 수 없음',
        theme: 'opposite' as const,
        occupation: participant?.occupation,
        bio: participant?.bio,
        currentBookTitle: participant?.currentBookTitle,
        profileBookUrl: participant?.profileBookUrl,
        profileImage: participant?.profileImage,
      };
    });
  }, [matchingResult, participantsById]);

  const matchingReasons: MatchingReasons | null = useMemo(() => {
    if (!matchingResult) return null;
    return (
      matchingResult.reasons ??
      matchingResult.matching.reasons ??
      null
    );
  }, [matchingResult]);

  const similarReasonText =
    matchingReasons?.similar ?? 'AI가 별도의 사유를 제공하지 않았습니다.';
  const oppositeReasonText =
    matchingReasons?.opposite ?? 'AI가 별도의 사유를 제공하지 않았습니다.';
  const summaryReasonText = matchingReasons?.summary ?? null;

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
    if (!cohortId) return;
    try {
      setIsLoadingStatus(true);

      // 기존 매칭 결과 조회
      const matchingResponse = await fetch(
        `/api/admin/matching?cohortId=${cohortId}&date=${today}`
      );

      if (matchingResponse.ok) {
        const data = await matchingResponse.json();
        setMatchingResult(data);
      }

      // 제출 현황 조회
      const statusResponse = await fetch(
        `/api/admin/matching/status?cohortId=${cohortId}&date=${today}`
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
  }, [cohortId, today]);

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
    if (!cohortId) return;

    setIsMatching(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/matching', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
        (Array.isArray(data.matching?.similar) && Array.isArray(data.matching?.opposite)
          ? data.matching.similar.length + data.matching.opposite.length
          : undefined) ??
        0;

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
                <div className="bg-white rounded-xl border p-5 shadow-[0_2px_8px_rgba(0,0,0,0.08)]" style={{ borderColor: '#E1E5E9' }}>
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold" style={{ color: '#1E2A44' }}>오늘의 AI 매칭 요약</h3>
                        <p className="text-xs" style={{ color: '#6B7280' }}>{matchingResult.date}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs" style={{ color: '#6B7280' }}>분석 대상</p>
                        <p className="text-xl font-bold" style={{ color: '#4FA3FF' }}>
                          {(matchingResult.totalParticipants ?? submissionCount) || 0}명
                        </p>
                      </div>
                    </div>

                    <div className="rounded-lg px-4 py-3 flex items-start gap-3" style={{ backgroundColor: 'rgba(79, 163, 255, 0.08)' }}>
                      <BookOpen className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: '#4FA3FF' }} />
                      <div>
                        <p className="text-xs font-semibold" style={{ color: '#4FA3FF' }}>오늘의 질문</p>
                        <p className="text-sm leading-relaxed" style={{ color: '#2A2D34' }}>
                          {matchingResult.question || todayQuestion}
                        </p>
                      </div>
                    </div>

                    {summaryReasonText && (
                      <div className="rounded-lg px-4 py-3 flex items-start gap-3" style={{ backgroundColor: '#F8F9FC' }}>
                        <Sparkles className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: '#8B5CF6' }} />
                        <div>
                          <p className="text-xs font-semibold" style={{ color: '#8B5CF6' }}>AI 요약</p>
                          <p className="text-sm leading-relaxed" style={{ color: '#2A2D34' }}>{summaryReasonText}</p>
                        </div>
                      </div>
                    )}

                    <div className="grid gap-2">
                      <div className="rounded-lg px-4 py-3 flex items-start gap-3" style={{ backgroundColor: '#F0F8FF', border: '1px solid #DBEAFE' }}>
                        <Brain className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: '#2563EB' }} />
                        <div>
                          <p className="text-xs font-semibold" style={{ color: '#2563EB' }}>비슷한 가치관 선정 이유</p>
                          <p className="text-sm leading-relaxed" style={{ color: '#1E2A44' }}>{similarReasonText}</p>
                        </div>
                      </div>
                      <div className="rounded-lg px-4 py-3 flex items-start gap-3" style={{ backgroundColor: '#FFFBEB', border: '1px solid #FCD34D' }}>
                        <Brain className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: '#B45309' }} />
                        <div>
                          <p className="text-xs font-semibold" style={{ color: '#B45309' }}>반대 가치관 선정 이유</p>
                          <p className="text-sm leading-relaxed" style={{ color: '#1E2A44' }}>{oppositeReasonText}</p>
                        </div>
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
                </div>

                <div className="bg-white rounded-xl border p-5 shadow-[0_2px_8px_rgba(0,0,0,0.08)]" style={{ borderColor: '#E1E5E9' }}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold" style={{ color: '#1E2A44' }}>오늘 참가자들에게 전달될 프로필북</h3>
                    <span className="text-xs font-medium" style={{ color: '#6B7280' }}>
                      총 {similarFeatured.length + oppositeFeatured.length}명 선정
                    </span>
                  </div>

                  {participantsLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-6 w-6 animate-spin" style={{ color: '#4FA3FF' }} />
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <div className="space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#2563EB' }}>
                          비슷한 가치관
                        </p>
                        {similarFeatured.length > 0 ? (
                          <div className="space-y-3">
                            {similarFeatured.map((participant) => (
                              <FeaturedParticipantCard
                                key={participant.id}
                                participant={participant}
                                onOpenProfile={handleOpenProfile}
                              />
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm" style={{ color: '#6B7280' }}>선정된 참가자가 없습니다.</p>
                        )}
                      </div>

                      <div className="space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#B45309' }}>
                          반대 가치관
                        </p>
                        {oppositeFeatured.length > 0 ? (
                          <div className="space-y-3">
                            {oppositeFeatured.map((participant) => (
                              <FeaturedParticipantCard
                                key={participant.id}
                                participant={participant}
                                onOpenProfile={handleOpenProfile}
                              />
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm" style={{ color: '#6B7280' }}>선정된 참가자가 없습니다.</p>
                        )}
                      </div>
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
