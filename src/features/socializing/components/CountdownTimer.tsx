'use client';

import { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CountdownTimerProps {
    deadline: string;  // ISO 8601 형식
    onExpire?: () => void;
    className?: string;
}

interface TimeLeft {
    hours: number;
    minutes: number;
    seconds: number;
    total: number;
}

function calculateTimeLeft(deadline: string): TimeLeft {
    const deadlineTime = new Date(deadline).getTime();
    const now = Date.now();
    const diff = deadlineTime - now;

    if (diff <= 0) {
        return { hours: 0, minutes: 0, seconds: 0, total: 0 };
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return { hours, minutes, seconds, total: diff };
}

export default function CountdownTimer({ deadline, onExpire, className }: CountdownTimerProps) {
    const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => calculateTimeLeft(deadline));
    const [hasExpired, setHasExpired] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => {
            const newTimeLeft = calculateTimeLeft(deadline);
            setTimeLeft(newTimeLeft);

            if (newTimeLeft.total <= 0 && !hasExpired) {
                setHasExpired(true);
                onExpire?.();
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [deadline, hasExpired, onExpire]);

    // 1시간 미만일 때 긴급 스타일
    const isUrgent = timeLeft.total > 0 && timeLeft.hours === 0;
    // 마감됨
    const isExpired = timeLeft.total <= 0;

    if (isExpired) {
        return (
            <div className={cn(
                "flex flex-col items-center justify-center gap-2 px-4 py-4 rounded-xl bg-gray-100 text-gray-500 text-center",
                className
            )}>
                <Clock className="w-5 h-5" />
                <span className="text-sm font-bold">투표가 마감되었습니다</span>
            </div>
        );
    }

    return (
        <div className={cn(
            "flex flex-col items-center justify-center px-4 py-4 rounded-xl transition-colors space-y-1",
            isUrgent 
                ? "bg-red-50 border border-red-200" 
                : "bg-primary/5 border border-primary/20",
            className
        )}>
            <div className="flex items-center gap-1.5 text-xs font-medium mb-1">
                {isUrgent ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                ) : (
                    <Clock className="w-3.5 h-3.5 text-primary" />
                )}
                <span className={cn(
                    isUrgent ? "text-red-600" : "text-gray-500"
                )}>
                    투표가 마감됩니다
                </span>
            </div>

            <div className="flex items-baseline gap-1">
                {/* 시간 */}
                <span className={cn(
                    "text-2xl font-bold tabular-nums leading-none",
                    isUrgent ? "text-red-600" : "text-primary"
                )}>
                    {String(timeLeft.hours).padStart(2, '0')}
                </span>
                <span className={cn("text-sm font-medium", isUrgent ? "text-red-400" : "text-gray-400")}>:</span>
                
                {/* 분 */}
                <span className={cn(
                    "text-2xl font-bold tabular-nums leading-none",
                    isUrgent ? "text-red-600" : "text-primary"
                )}>
                    {String(timeLeft.minutes).padStart(2, '0')}
                </span>
                <span className={cn("text-sm font-medium", isUrgent ? "text-red-400" : "text-gray-400")}>:</span>
                
                {/* 초 */}
                <span className={cn(
                    "text-2xl font-bold tabular-nums leading-none",
                    isUrgent ? "text-red-600 animate-pulse" : "text-primary"
                )}>
                    {String(timeLeft.seconds).padStart(2, '0')}
                </span>
            </div>
        </div>
    );
}
