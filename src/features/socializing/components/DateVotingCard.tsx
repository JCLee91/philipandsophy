'use client';

import { useState, useTransition } from 'react';
import { Calendar, Check, Loader2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { voteForDate } from '@/features/socializing/actions/socializing-actions';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface DateVotingCardProps {
    cohortId: string;
    availableDates: string[];
    currentVote?: string;
    voteStats: Record<string, number>;
}

export default function DateVotingCard({
    cohortId,
    availableDates,
    currentVote,
    voteStats
}: DateVotingCardProps) {
    const [selectedDate, setSelectedDate] = useState<string | undefined>(currentVote);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const handleSelect = (date: string) => {
        setSelectedDate(date);
    };

    const handleSubmit = () => {
        if (!selectedDate) {
            toast({
                title: '날짜를 선택해주세요',
                variant: 'destructive',
            });
            return;
        }

        startTransition(async () => {
            const result = await voteForDate(cohortId, selectedDate);
            if (result.success) {
                toast({
                    title: '투표 완료!',
                    description: `${format(new Date(selectedDate), 'M월 d일 (EEE)', { locale: ko })}에 투표하셨습니다.`,
                });
            } else {
                toast({
                    title: '투표 실패',
                    description: result.error,
                    variant: 'destructive',
                });
            }
        });
    };

    const totalVotes = Object.values(voteStats).reduce((a, b) => a + b, 0);

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                    <Calendar className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="font-bold text-lg text-gray-900">날짜 투표</h3>
                    <p className="text-sm text-gray-500">가장 많은 분들이 선택한 날짜로 결정돼요</p>
                </div>
            </div>

            <div className="space-y-3">
                {availableDates.map((date) => {
                    const voteCount = voteStats[date] || 0;
                    const isSelected = selectedDate === date;
                    const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;

                    return (
                        <button
                            key={date}
                            onClick={() => handleSelect(date)}
                            disabled={isPending}
                            className={cn(
                                "w-full relative overflow-hidden rounded-xl border-2 transition-all p-4 text-left group",
                                isSelected
                                    ? "border-blue-600 bg-blue-50/50"
                                    : "border-gray-100 hover:border-gray-200 bg-white"
                            )}
                        >
                            {/* Progress Bar Background */}
                            <div
                                className="absolute left-0 top-0 bottom-0 bg-blue-100/30 transition-all duration-500"
                                style={{ width: `${percentage}%` }}
                            />

                            <div className="relative flex items-center justify-between z-10">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                                        isSelected ? "border-blue-600 bg-blue-600" : "border-gray-300"
                                    )}>
                                        {isSelected && <Check className="w-3 h-3 text-white" />}
                                    </div>
                                    <span className={cn(
                                        "font-medium",
                                        isSelected ? "text-blue-700" : "text-gray-700"
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

            <button
                onClick={handleSubmit}
                disabled={isPending || !selectedDate}
                className="w-full mt-6 py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {isPending ? '투표 중...' : '투표하기'}
            </button>

            <div className="mt-4 text-center">
                <p className="text-xs text-gray-400">
                    * 투표는 언제든지 변경할 수 있어요
                </p>
            </div>
        </div>
    );
}
