'use client';

import { CheckCircle, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { VoterInfo } from '@/features/socializing/actions/socializing-actions';
import type { SocializingStats } from '../../hooks/use-socializing-admin';
import { formatSafeDate } from '../../constants/socializing-constants';

interface SocializingOption {
  id: string;
  date: string;
  time: string;
  location: string;
}

interface VoteRankingProps {
  options: SocializingOption[];
  stats: SocializingStats;
  selectedWinnerId: string | null;
  onSelectWinner: (id: string | null) => void;
  onOpenVoterDialog: (e: React.MouseEvent, title: string, voters: VoterInfo[]) => void;
}

export default function VoteRanking({
  options,
  stats,
  selectedWinnerId,
  onSelectWinner,
  onOpenVoterDialog,
}: VoteRankingProps) {
  const total = Object.values(stats.optionVotes).reduce((a, b) => a + b, 0) + stats.cantAttendCount;

  if (options.length === 0) return null;

  const optionsWithCounts = options
    .map((opt) => ({
      ...opt,
      count: stats.optionVotes[opt.id] || 0,
    }))
    .filter((opt) => opt.count > 0)
    .sort((a, b) => b.count - a.count);

  const hasNoVotes = optionsWithCounts.length === 0 && stats.cantAttendCount === 0;

  return (
    <div className="space-y-3 mt-4 border rounded-lg p-4 bg-slate-50">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-700">득표 현황</h4>
        <span className="text-xs text-gray-500">총 {total}표</span>
      </div>
      {optionsWithCounts.length > 0 && (
        <p className="text-xs text-muted-foreground mb-2">
          * 항목을 클릭하여 최종 후보를 직접 선택할 수 있습니다.
        </p>
      )}
      <div className="space-y-2">
        {hasNoVotes && (
          <p className="text-xs text-muted-foreground text-center py-4">아직 투표가 없습니다.</p>
        )}
        {optionsWithCounts.map((option, idx) => {
          const percent = total > 0 ? Math.round((option.count / total) * 100) : 0;
          const isWinner = selectedWinnerId ? selectedWinnerId === option.id : idx === 0;
          const voters = stats.optionVoters[option.id] || [];

          return (
            <div
              key={option.id}
              className={cn(
                'space-y-1 p-2 rounded cursor-pointer transition-all border',
                isWinner
                  ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300'
                  : 'bg-white border-transparent hover:bg-gray-100'
              )}
              onClick={() => onSelectWinner(selectedWinnerId === option.id ? null : option.id)}
            >
              <div className="flex items-center justify-between text-xs">
                <span className={cn('font-medium flex items-center', isWinner && 'text-primary')}>
                  {idx + 1}. {formatSafeDate(option.date)} {option.time} {option.location}
                  {isWinner && <CheckCircle className="inline w-3 h-3 ml-1 text-blue-500" />}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">
                    {option.count}표 ({percent}%)
                  </span>
                  {voters.length > 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 rounded-full hover:bg-blue-100"
                      onClick={(e) =>
                        onOpenVoterDialog(
                          e,
                          `${formatSafeDate(option.date)} ${option.time} ${option.location}`,
                          voters
                        )
                      }
                    >
                      <Users className="w-3 h-3 text-gray-500" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-1">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    isWinner ? 'bg-blue-500' : 'bg-gray-300'
                  )}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        })}
        {stats.cantAttendCount > 0 && (
          <div className="space-y-1 opacity-60 p-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-gray-500">불참</span>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">{stats.cantAttendCount}명</span>
                {stats.cantAttendVoters.length > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 rounded-full hover:bg-gray-200"
                    onClick={(e) => onOpenVoterDialog(e, '불참', stats.cantAttendVoters)}
                  >
                    <Users className="w-3 h-3 text-gray-500" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
