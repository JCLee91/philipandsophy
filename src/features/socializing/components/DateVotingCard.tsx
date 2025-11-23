'use client';

import { useState, useTransition, useEffect } from 'react';
import { Calendar, Check, Loader2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { voteForDate } from '@/features/socializing/actions/socializing-actions';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import UnifiedButton from '@/components/UnifiedButton';

interface DateVotingCardProps {
    cohortId: string;
    availableDates: string[];
    currentVote?: string[];
    voteStats: Record<string, number>;
    onRefresh?: () => Promise<void>;
}

export default function DateVotingCard({
    cohortId,
    availableDates,
    currentVote,
    voteStats,
    onRefresh
}: DateVotingCardProps) {
    // Normalize currentVote to array, handling legacy string data
    const normalizedCurrentVote = Array.isArray(currentVote) 
        ? currentVote 
        : (currentVote ? [currentVote] : []);

    const [selectedDates, setSelectedDates] = useState<string[]>(normalizedCurrentVote);
    const [localVoteStats, setLocalVoteStats] = useState(voteStats);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    // Sync with props when voteStats changes from parent
    useEffect(() => {
        setLocalVoteStats(voteStats);
    }, [voteStats]);

    // Sync with props when currentVote changes
    useEffect(() => {
        const normalized = Array.isArray(currentVote) 
            ? currentVote 
            : (currentVote ? [currentVote] : []);
        setSelectedDates(normalized);
    }, [currentVote]);

    const handleSelect = (date: string) => {
        setSelectedDates(prev => {
            if (prev.includes(date)) {
                return prev.filter(d => d !== date);
            } else {
                return [...prev, date];
            }
        });
    };

    const handleSubmit = () => {
        if (selectedDates.length === 0) return;

        startTransition(async () => {
            // Optimistic Update: 즉시 UI 반영
            const optimisticStats = { ...localVoteStats };

            // 이전 투표 제거 (기존 currentVote에 있는 것들)
            // Handle both string and array formats for currentVote
            const previousVotes = Array.isArray(currentVote) 
                ? currentVote 
                : (currentVote ? [currentVote] : []);

            previousVotes.forEach(date => {
                if (optimisticStats[date]) {
                    optimisticStats[date] = Math.max(0, optimisticStats[date] - 1);
                }
            });

            // 새 투표 추가
            selectedDates.forEach(date => {
                optimisticStats[date] = (optimisticStats[date] || 0) + 1;
            });
            setLocalVoteStats(optimisticStats);

            // 서버에 투표 전송
            const result = await voteForDate(cohortId, selectedDates);

            if (result.success) {
                // 서버에서 실제 데이터 가져와서 동기화
                await onRefresh?.();
            } else {
                // 실패 시 롤백
                await onRefresh?.();
                toast({
                    title: '투표 실패',
                    description: result.error,
                    variant: 'destructive',
                });
            }
        });
    };

    const totalVotes = Object.values(localVoteStats).reduce((a, b) => a + b, 0);
    const isVoted = normalizedCurrentVote.length > 0;
    // Check if selection changed: length mismatch or some item not included
    const isSelectionChanged = selectedDates.length !== normalizedCurrentVote.length || 
        !selectedDates.every(date => normalizedCurrentVote.includes(date));

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-900">
                    <Calendar className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="font-bold text-lg text-gray-900">날짜 투표</h3>
                    <p className="text-sm text-gray-500">가능한 날짜를 모두 선택해주세요 (복수 선택 가능)</p>
                </div>
            </div>

            <div className="space-y-3">
                {availableDates.map((date) => {
                    const voteCount = localVoteStats[date] || 0;
                    const isSelected = selectedDates.includes(date);
                    const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;

                    return (
                        <button
                            key={date}
                            onClick={() => handleSelect(date)}
                            disabled={isPending}
                            aria-pressed={isSelected}
                            className={cn(
                                "w-full relative overflow-hidden rounded-xl border-2 transition-all p-4 text-left group",
                                isSelected
                                    ? "border-primary bg-primary/5"
                                    : "border-gray-100 hover:border-gray-200 bg-white active:bg-gray-50"
                            )}
                        >
                            {/* Progress Bar Background */}
                            <div
                                className="absolute left-0 top-0 bottom-0 bg-primary/10 transition-all duration-500"
                                style={{ width: `${percentage}%` }}
                            />

                            <div className="relative flex items-center justify-between z-10">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                                        isSelected ? "border-primary bg-primary" : "border-gray-300"
                                    )}>
                                        {isSelected && <Check className="w-3 h-3 text-white" />}
                                    </div>
                                    <span className={cn(
                                        "font-medium",
                                        isSelected ? "text-primary" : "text-gray-700"
                                    )}>
                                        {format(new Date(date), 'M월 d일 (EEE)', { locale: ko })}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2 text-sm">
                                    {voteCount > 0 && (
                                        <div className="flex items-center gap-1 text-gray-500 bg-white/80 px-2 py-1 rounded-full backdrop-blur-sm">
                                            <Users className="w-3 h-3" />
                                            <span>{voteCount}명</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            <UnifiedButton
                fullWidth
                onClick={handleSubmit}
                disabled={isPending || selectedDates.length === 0}
                loading={isPending}
                loadingText="투표 중..."
                variant={isVoted && !isSelectionChanged ? "outline" : "primary"}
                className="mt-6"
            >
                {isVoted && !isSelectionChanged 
                    ? "투표 완료" 
                    : selectedDates.length > 0 
                        ? (isVoted ? "투표 수정하기" : `${selectedDates.length}개 날짜 투표하기`) 
                        : "투표하기"}
            </UnifiedButton>

            <div className="mt-4 text-center">
                <p className="text-xs text-gray-400">
                    * 투표는 언제든지 변경할 수 있어요
                </p>
            </div>
        </div>
    );
}
