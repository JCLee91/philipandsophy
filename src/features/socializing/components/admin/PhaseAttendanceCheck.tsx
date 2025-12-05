'use client';

import { Calendar as CalendarIcon, Clock, MapPin, RefreshCw, UserCheck, UserX, Users } from 'lucide-react';
import { UnifiedButton } from '@/components/common';
import { cn } from '@/lib/utils';
import type { VoterInfo } from '@/features/socializing/actions/socializing-actions';
import type { Cohort } from '@/types/database';
import type { SocializingStats } from '../../hooks/use-socializing-admin';

interface PhaseAttendanceCheckProps {
  cohort: Cohort;
  stats: SocializingStats;
  isPending: boolean;
  onRefreshStats: () => void;
  onConfirm: () => void;
  openVoterDialog: (e: React.MouseEvent, title: string, voters: VoterInfo[]) => void;
}

export default function PhaseAttendanceCheck({
  cohort,
  stats,
  isPending,
  onRefreshStats,
  onConfirm,
  openVoterDialog,
}: PhaseAttendanceCheckProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">참불 현황</span>
        <UnifiedButton
          variant="ghost"
          size="sm"
          onClick={onRefreshStats}
          disabled={isPending}
          className="h-7 text-xs"
          icon={<RefreshCw className={cn('w-3 h-3', isPending && 'animate-spin')} />}
        >
          새로고침
        </UnifiedButton>
      </div>

      {/* Confirmed Option Display */}
      {cohort.socializingResult && (
        <div className="p-4 border-2 border-primary/30 rounded-lg bg-primary/5">
          <p className="text-xs text-primary font-medium mb-2">확정 유력 일정</p>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <CalendarIcon className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{cohort.socializingResult.date}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{cohort.socializingResult.time}</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{cohort.socializingResult.location}</span>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 border rounded-lg space-y-1 bg-green-50 border-green-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-green-600" />
              <p className="text-xs text-green-700">참석</p>
            </div>
            {stats.attendanceStats.attendingVoters.length > 0 && (
              <UnifiedButton
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-full hover:bg-green-100 -mr-2"
                onClick={(e) => openVoterDialog(e, '참석자 명단', stats.attendanceStats.attendingVoters)}
              >
                <Users className="w-3 h-3 text-green-600" />
              </UnifiedButton>
            )}
          </div>
          <p className="text-2xl font-bold text-green-700">{stats.attendanceStats.attending}명</p>
        </div>
        <div className="p-4 border rounded-lg space-y-1 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserX className="w-4 h-4 text-gray-500" />
              <p className="text-xs text-gray-500">불참</p>
            </div>
            {stats.attendanceStats.notAttendingVoters.length > 0 && (
              <UnifiedButton
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-full hover:bg-gray-200 -mr-2"
                onClick={(e) =>
                  openVoterDialog(e, '불참자 명단', stats.attendanceStats.notAttendingVoters)
                }
              >
                <Users className="w-3 h-3 text-gray-500" />
              </UnifiedButton>
            )}
          </div>
          <p className="text-2xl font-bold text-gray-600">{stats.attendanceStats.notAttending}명</p>
        </div>
      </div>

      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
        <div className="space-y-1">
          <p className="text-sm font-medium">모임 확정하기</p>
          <p className="text-xs text-muted-foreground">참불 조사를 마감하고 최종 확정합니다.</p>
        </div>
        <UnifiedButton onClick={onConfirm} disabled={isPending} loading={isPending} size="sm">
          모임 확정
        </UnifiedButton>
      </div>
    </div>
  );
}
