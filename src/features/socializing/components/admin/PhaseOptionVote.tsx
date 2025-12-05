'use client';

import { RefreshCw, Users, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { VoterInfo } from '@/features/socializing/actions/socializing-actions';
import type { Cohort } from '@/types/database';
import type { SocializingStats } from '../../hooks/use-socializing-admin';
import { formatSafeDate } from '../../constants/socializing-constants';
import VoteRanking from './VoteRanking';

interface PhaseOptionVoteProps {
  cohort: Cohort;
  stats: SocializingStats;
  selectedWinnerId: string | null;
  setSelectedWinnerId: (id: string | null) => void;
  deadlineHours: number;
  setDeadlineHours: (hours: number) => void;
  isPending: boolean;
  getTopVote: () => { optionId: string; count: number } | null;
  onRefreshStats: () => void;
  onStartAttendanceCheck: () => void;
  openVoterDialog: (e: React.MouseEvent, title: string, voters: VoterInfo[]) => void;
}

export default function PhaseOptionVote({
  cohort,
  stats,
  selectedWinnerId,
  setSelectedWinnerId,
  deadlineHours,
  setDeadlineHours,
  isPending,
  getTopVote,
  onRefreshStats,
  onStartAttendanceCheck,
  openVoterDialog,
}: PhaseOptionVoteProps) {
  const topVote = getTopVote();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">실시간 투표 현황</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefreshStats}
          disabled={isPending}
          className="h-7 text-xs"
        >
          <RefreshCw className={cn('w-3 h-3 mr-1', isPending && 'animate-spin')} /> 새로고침
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 border rounded-lg space-y-1">
          <p className="text-xs text-muted-foreground">현재 1위</p>
          <p className="text-lg font-bold">
            {topVote
              ? (() => {
                  const option = cohort.socializingOptions?.combinations?.find(
                    (o) => o.id === topVote.optionId
                  );
                  return option
                    ? `${formatSafeDate(option.date)} ${option.time} ${option.location} (${topVote.count}표)`
                    : '집계 중...';
                })()
              : '집계 중...'}
          </p>
        </div>
        <div className="p-4 border rounded-lg space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">총 투표 참여</p>
            {stats.totalVoters.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-full hover:bg-gray-100 -mr-2"
                onClick={(e) => openVoterDialog(e, '전체 참여자 명단', stats.totalVoters)}
              >
                <Users className="w-3 h-3 text-gray-500" />
              </Button>
            )}
          </div>
          <p className="text-lg font-bold">{stats.totalVoterCount}명</p>
        </div>
      </div>

      <VoteRanking
        options={cohort.socializingOptions?.combinations || []}
        stats={stats}
        selectedWinnerId={selectedWinnerId}
        onSelectWinner={setSelectedWinnerId}
        onOpenVoterDialog={openVoterDialog}
      />

      {/* 참불 조사 마감 시간 설정 */}
      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
        <p className="text-sm">참불 조사 마감 시간</p>
        <select
          value={deadlineHours}
          onChange={(e) => setDeadlineHours(Number(e.target.value))}
          className="h-8 px-2 rounded-md border border-input bg-background text-sm"
        >
          <option value={6}>6시간</option>
          <option value={12}>12시간</option>
          <option value={18}>18시간</option>
          <option value={24}>24시간</option>
          <option value={36}>36시간</option>
          <option value={48}>48시간</option>
        </select>
      </div>

      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
        <div className="space-y-1">
          <p className="text-sm font-medium">다음 단계로 진행</p>
          <p className="text-xs text-muted-foreground">1위 선택지로 참불 조사를 시작합니다.</p>
        </div>
        <Button onClick={onStartAttendanceCheck} disabled={isPending} size="sm">
          {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          참불 조사 시작 ({deadlineHours}시간)
        </Button>
      </div>
    </div>
  );
}
