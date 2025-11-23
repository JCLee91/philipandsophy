'use client';

import { useState, useTransition, useEffect } from 'react';
import { Calendar as CalendarIcon, MapPin, CheckCircle, ArrowRight, Loader2, BarChart3, RefreshCw, Trophy, AlertCircle } from 'lucide-react';
import { updateCohortPhase, finalizeSocializing } from '@/features/socializing/actions/socializing-admin-actions';
import { getSocializingStats } from '@/features/socializing/actions/socializing-actions';
import { useToast } from '@/hooks/use-toast';
import type { Cohort } from '@/types/database';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useRouter } from 'next/navigation';

interface SocializingAdminControlsProps {
    cohort: Cohort;
    onUpdate?: () => void;
}

const PHASES = ['idle', 'date_vote', 'location_vote', 'confirmed'] as const;
const PHASE_LABELS = {
    idle: '대기 중',
    date_vote: '날짜 투표',
    location_vote: '장소 투표',
    confirmed: '모임 확정',
};

const LOCATION_PRESETS = ['강남', '홍대', '을지로', '성수', '이태원', '잠실'];

export default function SocializingAdminControls({ cohort, onUpdate }: SocializingAdminControlsProps) {
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const router = useRouter();
    const [stats, setStats] = useState<{ dateVotes: Record<string, number>; locationVotes: Record<string, number> }>({ dateVotes: {}, locationVotes: {} });

    // Form States
    const [selectedDates, setSelectedDates] = useState<Date[] | undefined>([]);
    const [locationsInput, setLocationsInput] = useState('');

    // Fetch stats periodically or on mount
    useEffect(() => {
        if (cohort.socializingPhase && cohort.socializingPhase !== 'idle') {
            getSocializingStats(cohort.id).then(setStats);
        }
    }, [cohort.id, cohort.socializingPhase]);

    const currentPhase = cohort.socializingPhase || 'idle';
    const currentPhaseIndex = PHASES.indexOf(currentPhase);

    const handleStartDateVoting = () => {
        if (!selectedDates || selectedDates.length === 0) {
            toast({ title: '날짜를 선택해주세요', variant: 'destructive' });
            return;
        }

        const formattedDates = selectedDates.map(date => format(date, 'yyyy-MM-dd'));

        startTransition(async () => {
            const res = await updateCohortPhase(cohort.id, 'date_vote', { dates: formattedDates });
            if (res.success) {
                toast({ title: '날짜 투표 시작!' });
                onUpdate?.();
                router.refresh();
            }
            else toast({ title: '실패', description: res.error, variant: 'destructive' });
        });
    };

    const handleStartLocationVoting = () => {
        const locations = locationsInput.split(',').map(s => s.trim()).filter(Boolean);
        if (locations.length === 0) {
            toast({ title: '장소를 입력해주세요', variant: 'destructive' });
            return;
        }

        startTransition(async () => {
            const res = await updateCohortPhase(cohort.id, 'location_vote', {
                dates: cohort.socializingOptions?.dates, // Keep existing dates
                locations
            });
            if (res.success) {
                toast({ title: '장소 투표 시작!' });
                onUpdate?.();
                router.refresh();
            }
            else toast({ title: '실패', description: res.error, variant: 'destructive' });
        });
    };

    const handleFinalize = () => {
        if (!confirm('투표를 마감하고 모임을 확정하시겠습니까?')) return;

        startTransition(async () => {
            const res = await finalizeSocializing(cohort.id);
            if (res.success) {
                toast({ title: '모임 확정 완료!', description: `${res.winningDate} @ ${res.winningLocation}` });
                onUpdate?.();
                router.refresh();
            }
            else toast({ title: '실패', description: res.error, variant: 'destructive' });
        });
    };

    const handleReset = () => {
        if (!confirm('초기화 하시겠습니까? 모든 투표 데이터가 초기화됩니다.')) return;
        startTransition(async () => {
            await updateCohortPhase(cohort.id, 'idle');
            toast({ title: '초기화 완료' });
            onUpdate?.();
            router.refresh();
        });
    };

    const addLocationPreset = (loc: string) => {
        const current = locationsInput.split(',').map(s => s.trim()).filter(Boolean);
        if (!current.includes(loc)) {
            setLocationsInput([...current, loc].join(', '));
        }
    };

    // Helper to get top vote
    const getTopVote = (votes: Record<string, number>) => {
        const sorted = Object.entries(votes).sort((a, b) => b[1] - a[1]);
        if (sorted.length === 0) return '집계 중...';
        return `${sorted[0][0]} (${sorted[0][1]}표)`;
    };

    // Ranking Component
    const VoteRanking = ({ votes, title }: { votes: Record<string, number>; title: string }) => {
        const sorted = Object.entries(votes).sort((a, b) => b[1] - a[1]);
        const total = sorted.reduce((acc, [, count]) => acc + count, 0);

        if (sorted.length === 0) return null;

        return (
            <div className="space-y-3 mt-4 border rounded-lg p-4 bg-slate-50">
                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-700">{title} 득표 현황</h4>
                    <span className="text-xs text-gray-500">총 {total}표</span>
                </div>
                <div className="space-y-2">
                    {sorted.map(([key, count], idx) => {
                        const percent = total > 0 ? Math.round((count / total) * 100) : 0;
                        const isWinner = idx === 0 || count === sorted[0][1]; // 동점자 포함 1등 강조

                        return (
                            <div key={key} className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                    <span className={cn("font-medium", isWinner && "text-primary")}>
                                        {idx + 1}. {key} {isWinner && <Trophy className="inline w-3 h-3 ml-1 text-amber-500" />}
                                    </span>
                                    <span className="text-gray-500">{count}표 ({percent}%)</span>
                                </div>
                                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div 
                                        className={cn("h-full rounded-full transition-all", isWinner ? "bg-primary" : "bg-gray-400")}
                                        style={{ width: `${percent}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <Card className="w-full">
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-muted-foreground" />
                        <CardTitle>소셜링 관제탑</CardTitle>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleReset} disabled={isPending} className="text-muted-foreground h-8">
                        <RefreshCw className="w-3 h-3 mr-1" /> 초기화
                    </Button>
                </div>
                <CardDescription>
                    뒷풀이 모임의 진행 단계를 관리하고 투표 현황을 모니터링합니다.
                </CardDescription>

                {/* Minimal Stepper */}
                <div className="flex items-center justify-between mt-6 relative">
                    <div className="absolute top-1/2 left-0 w-full h-[1px] bg-border -z-10" />
                    {PHASES.map((phase, idx) => {
                        const isActive = idx === currentPhaseIndex;
                        const isCompleted = idx < currentPhaseIndex;
                        return (
                            <div key={phase} className="flex flex-col items-center gap-2 bg-background px-2">
                                <div className={cn(
                                    "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border transition-colors",
                                    isActive ? "border-primary bg-primary text-primary-foreground" :
                                        isCompleted ? "border-primary text-primary" :
                                            "border-muted-foreground text-muted-foreground bg-background"
                                )}>
                                    {isCompleted ? <CheckCircle className="w-3 h-3" /> : idx + 1}
                                </div>
                                <span className={cn(
                                    "text-xs font-medium",
                                    isActive ? "text-foreground" : "text-muted-foreground"
                                )}>
                                    {PHASE_LABELS[phase]}
                                </span>
                            </div>
                        )
                    })}
                </div>
            </CardHeader>

            <Separator />

            <CardContent className="pt-6">
                {/* Phase 0: Idle */}
                {currentPhase === 'idle' && (
                    <div className="space-y-4">
                        <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                            <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
                            <div className="space-y-1">
                                <p className="text-sm font-medium">소셜링을 시작할 준비가 되셨나요?</p>
                                <p className="text-xs text-muted-foreground">프로그램 종료 후, 뒷풀이 날짜 투표를 시작하여 참여를 유도하세요.</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">후보 날짜 선택</label>
                            <div className="flex flex-col gap-2">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !selectedDates && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {selectedDates && selectedDates.length > 0 ? (
                                                <span>{selectedDates.length}개 날짜 선택됨</span>
                                            ) : (
                                                <span>날짜를 선택하세요</span>
                                            )}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="multiple"
                                            selected={selectedDates}
                                            onSelect={setSelectedDates}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>

                                {selectedDates && selectedDates.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {selectedDates.map((date) => (
                                            <Badge key={date.toISOString()} variant="secondary" className="text-xs">
                                                {format(date, 'MM/dd (eee)', { locale: ko })}
                                            </Badge>
                                        ))}
                                    </div>
                                )}

                                <Button onClick={handleStartDateVoting} disabled={isPending} className="mt-2 w-full">
                                    {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    투표 시작
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Phase 1: Date Vote */}
                {currentPhase === 'date_vote' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 border rounded-lg space-y-1">
                                <p className="text-xs text-muted-foreground">현재 1위 날짜</p>
                                <p className="text-lg font-bold">{getTopVote(stats.dateVotes)}</p>
                            </div>
                            <div className="p-4 border rounded-lg space-y-1">
                                <p className="text-xs text-muted-foreground">총 투표 참여</p>
                                <p className="text-lg font-bold">{Object.values(stats.dateVotes).reduce((a, b) => a + b, 0)}명</p>
                            </div>
                        </div>

                        {/* 전체 득표 현황 */}
                        <VoteRanking votes={stats.dateVotes} title="날짜" />

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium">다음 단계: 장소 투표</label>
                                <div className="flex gap-1">
                                    {LOCATION_PRESETS.map(loc => (
                                        <Badge
                                            key={loc}
                                            variant="outline"
                                            className="cursor-pointer hover:bg-muted"
                                            onClick={() => addLocationPreset(loc)}
                                        >
                                            + {loc}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="예: 강남, 홍대, 을지로"
                                    value={locationsInput}
                                    onChange={(e) => setLocationsInput(e.target.value)}
                                />
                                <Button onClick={handleStartLocationVoting} disabled={isPending}>
                                    {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    장소 투표 시작
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Phase 2: Location Vote */}
                {currentPhase === 'location_vote' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 border rounded-lg space-y-1 bg-muted/20">
                                <p className="text-xs text-muted-foreground">확정 유력 날짜</p>
                                <p className="text-lg font-bold">{getTopVote(stats.dateVotes)}</p>
                            </div>
                            <div className="p-4 border rounded-lg space-y-1">
                                <p className="text-xs text-muted-foreground">현재 1위 장소</p>
                                <p className="text-lg font-bold text-primary">{getTopVote(stats.locationVotes)}</p>
                            </div>
                        </div>

                        {/* 전체 득표 현황 */}
                        <VoteRanking votes={stats.locationVotes} title="장소" />

                        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                            <div className="space-y-1">
                                <p className="text-sm font-medium">투표를 마감하시겠습니까?</p>
                                <p className="text-xs text-muted-foreground">가장 표를 많이 받은 날짜와 장소로 모임이 자동 생성됩니다.</p>
                            </div>
                            <Button onClick={handleFinalize} disabled={isPending} size="sm">
                                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                모임 확정하기
                            </Button>
                        </div>
                    </div>
                )}

                {/* Phase 3: Confirmed */}
                {currentPhase === 'confirmed' && (
                    <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
                        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                            <CheckCircle className="w-6 h-6 text-green-600" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="font-bold text-lg">모임 확정 완료</h3>
                            <p className="text-sm text-muted-foreground">
                                새로운 모임 기수가 생성되었고,<br />
                                참가자들이 단톡방으로 이동되었습니다.
                            </p>
                        </div>
                        <div className="flex gap-4 text-sm border p-3 rounded-lg bg-muted/20">
                            <div>
                                <span className="text-muted-foreground mr-2">날짜:</span>
                                <span className="font-medium">{getTopVote(stats.dateVotes).split('(')[0]}</span>
                            </div>
                            <Separator orientation="vertical" className="h-auto" />
                            <div>
                                <span className="text-muted-foreground mr-2">장소:</span>
                                <span className="font-medium">{getTopVote(stats.locationVotes).split('(')[0]}</span>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
