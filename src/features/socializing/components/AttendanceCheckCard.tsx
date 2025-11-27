'use client';

import { useState, useTransition, useEffect } from 'react';
import { Calendar, Clock, MapPin, UserCheck, UserX, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { voteAttendance, type VoterInfo } from '@/features/socializing/actions/socializing-actions';
import { format, parseISO, isValid } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import UnifiedButton from '@/components/UnifiedButton';
import type { Cohort } from '@/types/database';

import CountdownTimer from './CountdownTimer';
import ParticipantListDialog from './ParticipantListDialog';

interface AttendanceCheckCardProps {
    cohortId: string;
    result: NonNullable<Cohort['socializingResult']>;
    currentVote?: 'attending' | 'not_attending';
    attendanceStats: {
        attending: number;
        notAttending: number;
        attendingVoters: VoterInfo[];
        notAttendingVoters: VoterInfo[];
    };
    deadline?: string;  // 마감 시간
    onRefresh?: () => Promise<void>;
}

function formatSafeDate(dateString: string): string {
    try {
        const date = parseISO(dateString);
        if (!isValid(date)) return dateString;
        return format(date, 'M월 d일 (EEE)', { locale: ko });
    } catch {
        return dateString;
    }
}

export default function AttendanceCheckCard({
    cohortId,
    result,
    currentVote,
    attendanceStats,
    deadline,
    onRefresh
}: AttendanceCheckCardProps) {
    const [selectedAttendance, setSelectedAttendance] = useState<'attending' | 'not_attending' | null>(currentVote || null);
    const [localStats, setLocalStats] = useState(attendanceStats);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Sync with props
    useEffect(() => {
        setLocalStats(attendanceStats);
    }, [attendanceStats]);

    useEffect(() => {
        setSelectedAttendance(currentVote || null);
    }, [currentVote]);

    const handleVote = (attendance: 'attending' | 'not_attending') => {
        if (selectedAttendance === attendance) return;

        setSelectedAttendance(attendance);

        startTransition(async () => {
            // Optimistic Update
            const optimisticStats = { ...localStats };

            // Remove previous vote
            if (currentVote) {
                if (currentVote === 'attending') {
                    optimisticStats.attending = Math.max(0, optimisticStats.attending - 1);
                } else {
                    optimisticStats.notAttending = Math.max(0, optimisticStats.notAttending - 1);
                }
            }

            // Add new vote
            if (attendance === 'attending') {
                optimisticStats.attending++;
            } else {
                optimisticStats.notAttending++;
            }

            setLocalStats(optimisticStats);

            // Server call
            const res = await voteAttendance(cohortId, attendance);

            if (res.success) {
                await onRefresh?.();
            } else {
                await onRefresh?.();
                toast({
                    title: '투표 실패',
                    description: res.error,
                    variant: 'destructive',
                });
            }
        });
    };

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-900">
                    <Users className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="font-bold text-heading-lg text-text-primary">참석 확인</h3>
                    <p className="text-sm text-text-secondary">가장 많이 선택된 일정이에요!</p>
                </div>
            </div>

            {/* Selected Option Display */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-200">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-text-primary">
                        <Calendar className="w-5 h-5 text-gray-900" />
                        <span className="font-bold text-heading-lg">{formatSafeDate(result.date)}</span>
                    </div>
                    <div className="flex items-center gap-4 text-text-secondary">
                        <div className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span>{result.time}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            <span>{result.location}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Attendance Stats (Simplified) */}
            <div className="flex items-center justify-between bg-white border border-gray-100 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-2">
                     <div className="w-2 h-2 rounded-full bg-gray-900" />
                     <span className="font-medium text-gray-900">참석 예정</span>
                     <span className="font-bold text-gray-900 ml-1">{localStats.attending}명</span>
                </div>
                {localStats.attending > 0 && (
                    <button 
                        onClick={() => setIsDialogOpen(true)}
                        className="text-sm text-gray-500 hover:text-gray-900 underline"
                    >
                        참여자 보기
                    </button>
                )}
            </div>

            {/* Vote Buttons */}
            <div className="space-y-4">
                {/* 마감 카운트다운 */}
                {deadline && (
                    <CountdownTimer deadline={deadline} />
                )}

                <div className="grid grid-cols-2 gap-3">
                    <UnifiedButton
                        onClick={() => handleVote('attending')}
                        disabled={isPending}
                        loading={isPending && selectedAttendance === 'attending'}
                        variant={selectedAttendance === 'attending' ? 'primary' : 'outline'}
                        className={cn(
                            "flex items-center justify-center gap-2 py-4",
                            selectedAttendance === 'attending' && "ring-2 ring-gray-900 ring-offset-2"
                        )}
                    >
                        <UserCheck className="w-5 h-5" />
                        <span>참석합니다</span>
                    </UnifiedButton>

                    <UnifiedButton
                        onClick={() => handleVote('not_attending')}
                        disabled={isPending}
                        loading={isPending && selectedAttendance === 'not_attending'}
                        variant={selectedAttendance === 'not_attending' ? 'secondary' : 'outline'}
                        className={cn(
                            "flex items-center justify-center gap-2 py-4",
                            selectedAttendance === 'not_attending' && "ring-2 ring-gray-200 ring-offset-2 bg-gray-100"
                        )}
                    >
                        <UserX className="w-5 h-5" />
                        <span>불참합니다</span>
                    </UnifiedButton>
                </div>
            </div>

            <div className="mt-4 text-center">
                <p className="text-xs text-muted-foreground">
                    * 참석 여부는 언제든지 변경할 수 있어요
                </p>
            </div>

            <ParticipantListDialog 
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                title="참석 예정 멤버"
                voters={localStats.attendingVoters}
            />
        </div>
    );
}
