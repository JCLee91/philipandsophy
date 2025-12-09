'use client';

import { Suspense, useState, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle2, Users, BarChart3, ChevronDown, ChevronUp, RefreshCw, PlayCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

import PageTransition from '@/components/PageTransition';
import TopBar from '@/components/TopBar';
import UnifiedButton from '@/components/UnifiedButton';
import { useAuth } from '@/contexts/AuthContext';
import { useViewMode } from '@/contexts/ViewModeContext';
import { useToast } from '@/hooks/use-toast';
import { useParticipantsByCohort } from '@/hooks/use-participants';
import { useCohort } from '@/hooks/use-cohorts';
import { useYesterdaySubmissionCount } from '@/hooks/use-yesterday-submission-count';
import { useTodaySubmissionCount } from '@/hooks/use-today-submission-count';
import { useDailySubmissionsList } from '@/hooks/use-daily-submissions-list';
import { getMatchingTargetDate, getSubmissionDate } from '@/lib/date-utils';
import { cn } from '@/lib/utils';
import { Cluster } from '@/types/schemas';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// -----------------------------------------------------------------------------
// Sub-components
// -----------------------------------------------------------------------------

function StatCard({ title, value, subtext, icon: Icon, highlight = false, onClick, isLoading = false, className }: {
  title: string;
  value: string | number;
  subtext?: string;
  icon: any;
  highlight?: boolean;
  onClick?: () => void;
  isLoading?: boolean;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "border-none shadow-xs",
        highlight ? "bg-primary/5 border-primary/20 border" : "bg-card",
        className
      )}
    >
      <CardContent className="p-4 flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-2xl font-bold", highlight ? "text-primary" : "text-foreground")}>
              {value}
            </span>
            {subtext && <span className="text-xs text-muted-foreground">{subtext}</span>}
          </div>
        </div>
        {onClick ? (
          <button
            onClick={onClick}
            className={cn(
              "p-2 rounded-full transition-colors",
              highlight ? "bg-primary/10 text-primary hover:bg-primary/20" : "bg-secondary text-muted-foreground hover:bg-secondary/80",
              "active:scale-95"
            )}
            aria-label="새로고침"
          >
            <Icon className={cn("h-5 w-5", isLoading && "animate-spin")} />
          </button>
        ) : (
          <div className={cn("p-2 rounded-full", highlight ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground")}>
            <Icon className={cn("h-5 w-5", isLoading && "animate-spin")} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MatchingGroupsList({ clusters, participants }: {
  clusters: Record<string, Cluster>;
  participants: any[];
}) {
  const clusterList = Object.values(clusters);

  if (clusterList.length === 0) return null;

  return (
    <div className="space-y-3">
      {clusterList.map((cluster) => (
        <Card key={cluster.id} className="bg-white border-none shadow-xs overflow-hidden">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">{cluster.emoji}</span>
              <span className="font-medium text-sm text-slate-900">{cluster.name}</span>
            </div>
            <Badge variant="outline" className="bg-white text-xs font-normal">
              {cluster.theme}
            </Badge>
          </div>
          <CardContent className="p-4 space-y-4">
            <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
              {cluster.reasoning}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">매칭 멤버 ({cluster.memberIds.length}명)</p>
              <div className="flex flex-wrap gap-2">
                {cluster.memberIds.map((memberId) => {
                  const member = participants.find((p) => p.id === memberId);
                  return (
                    <div key={memberId} className="flex items-center gap-2 bg-slate-50 pr-3 pl-1 py-1 rounded-full border border-slate-100">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={member?.profileImageCircle || member?.profileImage} />
                        <AvatarFallback className="text-[10px]">{member?.name?.[0] || '?'}</AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium text-slate-700">{member?.name || '알 수 없음'}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cohortId = searchParams.get('cohort');

  const { participant } = useAuth();
  const { viewMode, canSwitchMode, isReady: viewModeReady } = useViewMode();
  const { toast } = useToast();

  // 날짜 관련
  const matchingTargetDate = useMemo(() => getMatchingTargetDate(), []);
  const todayDate = useMemo(() => getSubmissionDate(), []);

  // 데이터 훅
  const { data: cohort, refetch: refetchCohort } = useCohort(cohortId || undefined);
  const { data: participants = [] } = useParticipantsByCohort(cohortId || undefined);

  // 인증 카운트
  const { count: yesterdayCount } = useYesterdaySubmissionCount(cohortId || undefined);
  const { count: todayCount } = useTodaySubmissionCount(cohortId || undefined);

  // 어제 인증 리스트 (매칭 대상)
  const { submissions: yesterdaySubmissions, isLoading: submissionsLoading } = useDailySubmissionsList(matchingTargetDate, cohortId || undefined);

  // 리스트 접기/펼치기 상태
  const [isListOpen, setIsListOpen] = useState(false);

  // 수동 매칭 관련 상태
  const [isMatchingDialogOpen, setIsMatchingDialogOpen] = useState(false);
  const [isMatchingProcessing, setIsMatchingProcessing] = useState(false);

  // 새로고침 애니메이션 상태
  const [isRefreshingToday, setIsRefreshingToday] = useState(false);

  // 권한 체크 (Early return 제거 -> 렌더링 시 처리)
  const isAuthorized = viewModeReady && canSwitchMode && viewMode === 'admin' && cohortId;

  // 통계 계산
  const totalParticipants = participants.length || 1; // 0 방지
  const participationRate = Math.round((yesterdayCount / totalParticipants) * 100);

  // 매칭 완료 여부 확인
  // dailyFeaturedParticipants에 matchingTargetDate 키가 있고 데이터가 있으면 완료로 간주
  const isMatchingDone = useMemo(() => {
    if (!cohort?.dailyFeaturedParticipants) return false;
    const todayEntry = cohort.dailyFeaturedParticipants[matchingTargetDate];
    return !!todayEntry && Object.keys(todayEntry.assignments || {}).length > 0;
  }, [cohort, matchingTargetDate]);

  // 소셜링 상태
  const socializingPhase = cohort?.socializingPhase || 'idle';
  const phaseLabels: Record<string, string> = {
    idle: '대기 중',
    option_vote: '1차 투표 중',
    attendance_check: '참/불 확인 중',
    confirmed: '최종 확정'
  };

  // 어제 인증한 유저 매핑
  const verifiedUsers = useMemo(() => {
    if (!yesterdaySubmissions.length || !participants.length) return [];

    // submission -> participant 매핑
    return yesterdaySubmissions.map(sub => {
      const p = participants.find(p => p.id === sub.participantId);
      return {
        id: sub.participantId,
        name: p?.name || '알 수 없음',
        profileImage: p?.profileImageCircle || p?.profileImage || null,
        submittedAt: sub.submittedAt ? format(sub.submittedAt.toDate(), 'HH:mm') : '-'
      };
    }).sort((a, b) => {
      // submittedAt이 '-'인 경우 처리 (마지막으로)
      if (a.submittedAt === '-') return 1;
      if (b.submittedAt === '-') return -1;

      // HH:mm 형식 파싱
      const [aHour, aMin] = a.submittedAt.split(':').map(Number);
      const [bHour, bMin] = b.submittedAt.split(':').map(Number);

      // 02:00 기준이므로 00:00~02:00은 전날 마지막으로 취급 (24를 더함)
      // 02:01부터는 다음날 시작
      const aAdjusted = (aHour < 2 || (aHour === 2 && aMin === 0)) ? aHour + 24 : aHour;
      const bAdjusted = (bHour < 2 || (bHour === 2 && bMin === 0)) ? bHour + 24 : bHour;

      // 시간 비교
      if (aAdjusted !== bAdjusted) {
        return aAdjusted - bAdjusted;
      }
      // 시간이 같으면 분 비교
      return aMin - bMin;
    });
  }, [yesterdaySubmissions, participants]);

  // 수동 매칭 핸들러
  const handleManualMatching = useCallback(async () => {
    if (!cohortId) return;

    setIsMatchingProcessing(true);
    try {
      // 매칭 실행 API 호출
      const response = await fetch('/api/admin/matching', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cohortId,
          useClusterMatching: cohort?.useClusterMatching
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '매칭 실행에 실패했습니다.');
      }

      toast({
        title: "매칭 완료 ✅",
        description: "성공적으로 매칭이 완료되었습니다.",
      });

      setIsMatchingDialogOpen(false);
      // 데이터 갱신을 위해 리프레시
      refetchCohort();

    } catch (error) {
      const message = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
      toast({
        title: "매칭 실패 ❌",
        description: message,
        variant: "destructive"
      });
    } finally {
      setIsMatchingProcessing(false);
    }
  }, [cohortId, cohort?.useClusterMatching, toast, refetchCohort]);

  const handleRefreshToday = useCallback(() => {
    setIsRefreshingToday(true);
    setTimeout(() => {
      setIsRefreshingToday(false);
    }, 1000);
  }, []);

  if (!isAuthorized) {
    return null;
  }

  return (
    <PageTransition>
      <div className="app-shell flex flex-col bg-slate-50 min-h-screen">
        <TopBar
          title="관리자 대시보드"
          onBack={() => router.push(`/app/chat?cohort=${cohortId}`)}
          align="left"
          className="bg-white border-b"
        />

        <main className="flex-1 overflow-y-auto p-4 space-y-6 pb-20">

          {/* 1. 어제 인증 현황 (핵심) */}
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground ml-1 flex items-center justify-between">
              <span>어제 인증 현황 ({matchingTargetDate})</span>
              <Badge variant={isMatchingDone ? "default" : "secondary"} className="text-xs">
                {isMatchingDone ? "매칭 완료" : "매칭 대기"}
              </Badge>
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                title="인증 완료"
                value={`${yesterdayCount}명`}
                icon={CheckCircle2}
                highlight={true}
              />
              <StatCard
                title="인증률"
                value={`${participationRate}%`}
                subtext={`/ ${totalParticipants}명`}
                icon={BarChart3}
              />
            </div>

            {/* 인증 멤버 리스트 (Collapsible) */}
            <Collapsible open={isListOpen} onOpenChange={setIsListOpen} className="bg-white rounded-xl border shadow-xs">
              <CollapsibleTrigger className="flex items-center justify-between w-full p-4 text-sm font-medium">
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  인증 멤버 확인하기
                  <Badge variant="outline" className="ml-1 text-xs font-normal bg-slate-50">
                    {verifiedUsers.length}명
                  </Badge>
                </span>
                {isListOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="px-4 pb-4 pt-0 space-y-3 border-t border-slate-100 mt-2 pt-4">
                  {submissionsLoading ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : verifiedUsers.length > 0 ? (
                    <div className="grid grid-cols-1 gap-2">
                      {verifiedUsers.map(user => (
                        <div key={user.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                          <Avatar className="h-8 w-8 border">
                            <AvatarImage src={user.profileImage || undefined} />
                            <AvatarFallback className="text-xs">{user.name[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{user.name}</p>
                          </div>
                          <span className="text-xs text-muted-foreground font-mono bg-slate-100 px-2 py-1 rounded">
                            {user.submittedAt}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-sm text-muted-foreground">
                      인증 내역이 없습니다.
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* 1.5 수동 매칭 실행 (매칭이 안되어 있을 때만 표시) */}
          {!isMatchingDone && (
            <Card className="bg-amber-50 border-amber-100 shadow-xs">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-bold text-amber-700">
                    <AlertCircle className="h-4 w-4" />
                    매칭 미완료
                  </div>
                  <p className="text-xs text-amber-600">
                    아직 매칭 결과가 생성되지 않았습니다.
                  </p>
                </div>
                <UnifiedButton
                  size="sm"
                  onClick={() => setIsMatchingDialogOpen(true)}
                  className="bg-amber-500 hover:bg-amber-600 text-white border-none"
                >
                  수동 매칭 실행
                </UnifiedButton>
              </CardContent>
            </Card>
          )}



          {/* 2. 오늘 실시간 현황 (위치 변경: 매칭 결과 위로) */}
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground ml-1">오늘 실시간 현황 ({todayDate})</h2>
            <StatCard
              title="현재 인증"
              value={`${todayCount}명`}
              subtext="실시간 집계 중"
              icon={RefreshCw}
              onClick={handleRefreshToday}
              isLoading={isRefreshingToday}
            />
          </div>

          {/* 1.6 매칭 결과 (매칭 완료 시 표시) */}
          {isMatchingDone && cohort?.dailyFeaturedParticipants?.[matchingTargetDate]?.clusters && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground ml-1">매칭 결과 ({matchingTargetDate})</h2>
              <MatchingGroupsList
                clusters={cohort.dailyFeaturedParticipants[matchingTargetDate].clusters}
                participants={participants}
              />
            </div>
          )}

          {/* 3. 소셜링 현황 */}
          {cohort?.socializingPhase && cohort.socializingPhase !== 'idle' && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground ml-1">소셜링 진행 현황</h2>
              <Card className="bg-white border-none shadow-xs">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-muted-foreground">현재 단계</span>
                    <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-100">
                      {phaseLabels[socializingPhase]}
                    </Badge>
                  </div>

                  {/* 단계별 간단 정보 */}
                  {socializingPhase === 'option_vote' && (
                    <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                      멤버들이 모임 날짜와 장소를 투표하고 있습니다.
                    </div>
                  )}
                  {socializingPhase === 'attendance_check' && (
                    <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                      최종 확정된 일정에 대한 참석 여부를 확인 중입니다.
                    </div>
                  )}
                  {socializingPhase === 'confirmed' && (
                    <div className="space-y-2">
                      <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                        모임이 최종 확정되었습니다.
                      </div>
                      {cohort.socializingResult && (
                        <div className="text-sm grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 px-1">
                          <span className="text-muted-foreground">날짜</span>
                          <span className="font-medium">{cohort.socializingResult.date}</span>
                          <span className="text-muted-foreground">시간</span>
                          <span className="font-medium">{cohort.socializingResult.time}</span>
                          <span className="text-muted-foreground">장소</span>
                          <span className="font-medium truncate">{cohort.socializingResult.location}</span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

        </main>

        {/* 수동 매칭 확인 다이얼로그 */}
        <Dialog open={isMatchingDialogOpen} onOpenChange={setIsMatchingDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>수동 매칭 실행</DialogTitle>
              <DialogDescription>
                현재 인증 데이터를 기준으로 AI 매칭을 즉시 실행합니다.<br />
                이 작업은 되돌릴 수 없으며, 기존 매칭 결과가 있다면 덮어쓰게 됩니다.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <UnifiedButton
                variant="secondary"
                onClick={() => setIsMatchingDialogOpen(false)}
                disabled={isMatchingProcessing}
              >
                취소
              </UnifiedButton>
              <UnifiedButton
                variant="primary"
                onClick={handleManualMatching}
                loading={isMatchingProcessing}
              >
                매칭 실행하기
              </UnifiedButton>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
}

export default function MobileAdminDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="app-shell flex items-center justify-center bg-slate-50">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
