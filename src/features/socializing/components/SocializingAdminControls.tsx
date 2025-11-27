'use client';

import { useState, useTransition, useEffect, useMemo } from 'react';
import { Calendar as CalendarIcon, Clock, MapPin, CheckCircle, Loader2, RefreshCw, Trophy, AlertCircle, Plus, Trash2, Users, UserCheck, UserX, XCircle, ChevronDown, ChevronUp, Link } from 'lucide-react';
import { updateCohortPhase, resetSocializing, startAttendanceCheck, confirmSocializing, updateSocializingUrl } from '@/features/socializing/actions/socializing-admin-actions';
import { getSocializingStats, type VoterInfo } from '@/features/socializing/actions/socializing-actions';
import { subscribeToCohortParticipants } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Cohort, Participant } from '@/types/database';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, parseISO, isValid } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import ParticipantListDialog from './ParticipantListDialog';

interface SocializingAdminControlsProps {
    cohort: Cohort;
    onUpdate?: () => void;
}

const PHASES = ['idle', 'option_vote', 'attendance_check', 'confirmed'] as const;
const PHASE_LABELS = {
    idle: '대기 중',
    option_vote: '선택지 투표',
    attendance_check: '참불 조사',
    confirmed: '모임 확정',
};

const SEOUL_HOTSPOTS = [
    { category: '강남권', places: ['강남', '신논현', '양재', '잠실'] },
    { category: '마포권', places: ['홍대', '합정', '망원', '연남'] },
    { category: '중구/종로', places: ['을지로', '종로', '광화문', '혜화'] },
    { category: '성동/용산', places: ['성수', '건대', '이태원', '한남'] },
];

const TIME_PRESETS = ['18:00', '18:30', '19:00', '19:30', '20:00'];

function formatSafeDate(dateString: string): string {
    try {
        const date = parseISO(dateString);
        if (!isValid(date)) return dateString;
        return format(date, 'M/d(EEE)', { locale: ko });
    } catch {
        return dateString;
    }
}

export default function SocializingAdminControls({ cohort, onUpdate }: SocializingAdminControlsProps) {
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const router = useRouter();
    
    // Collapsible State
    const [isExpanded, setIsExpanded] = useState(true);

    // Manual selection for winner (Phase 1 -> 2)
    const [selectedWinnerId, setSelectedWinnerId] = useState<string | null>(null);

    const [stats, setStats] = useState<{
        optionVotes: Record<string, number>;
        optionVoters: Record<string, VoterInfo[]>;
        cantAttendCount: number;
        cantAttendVoters: VoterInfo[];
        attendanceStats: { 
            attending: number; 
            notAttending: number;
            attendingVoters: VoterInfo[];
            notAttendingVoters: VoterInfo[];
        };
        totalVoterCount: number;
        totalVoters: VoterInfo[];
    }>({ 
        optionVotes: {}, 
        optionVoters: {}, 
        cantAttendCount: 0, 
        cantAttendVoters: [], 
        attendanceStats: { 
            attending: 0, 
            notAttending: 0, 
            attendingVoters: [], 
            notAttendingVoters: [] 
        },
        totalVoterCount: 0,
        totalVoters: []
    });

    // New State for Phase 0
    const [selectedDates, setSelectedDates] = useState<Date[]>([]);
    const [selectedTime, setSelectedTime] = useState<string>('19:00');
    const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
    const [customLocation, setCustomLocation] = useState('');
    
    // Open Chat URL State
    const [openChatUrl, setOpenChatUrl] = useState(cohort.socializingOpenChatUrl || '');

    // Dialog State
    const [isParticipantDialogOpen, setIsParticipantDialogOpen] = useState(false);
    const [dialogVoters, setDialogVoters] = useState<VoterInfo[]>([]);
    const [dialogTitle, setDialogTitle] = useState('');

    // 투표 마감 시간 (시간 단위)
    const [deadlineHours, setDeadlineHours] = useState<number>(12);
    
    // 마감 예상 시간 계산
    const estimatedDeadline = useMemo(() => {
        const date = new Date();
        date.setHours(date.getHours() + deadlineHours);
        return format(date, 'M월 d일 a h시', { locale: ko });
    }, [deadlineHours]);

    // Track which date picker is open - Not needed for multi-select calendar
    // const [openDatePickerId, setOpenDatePickerId] = useState<string | null>(null);

    // Realtime subscription for vote stats during active phases
    useEffect(() => {
        if (!cohort.socializingPhase || cohort.socializingPhase === 'idle') return;

        // Use realtime subscription for immediate updates
        const unsubscribe = subscribeToCohortParticipants(cohort.id, (participants: Participant[]) => {
            const optionVotes: Record<string, number> = {};
            const optionVoters: Record<string, VoterInfo[]> = {};
            let cantAttendCount = 0;
            const cantAttendVoters: VoterInfo[] = [];
            let attendingCount = 0;
            let notAttendingCount = 0;
            const attendingVoters: VoterInfo[] = [];
            const notAttendingVoters: VoterInfo[] = [];

            let totalVoterCount = 0;
            const totalVoters: VoterInfo[] = [];

            participants.forEach(p => {
                const votes = p.socializingVotes;
                const voterInfo: VoterInfo = {
                    id: p.id,
                    name: p.name,
                    profileImageCircle: p.profileImageCircle,
                };

                // Check if user participated in phase 1
                const hasVotedOptions = votes?.optionIds && votes.optionIds.length > 0;
                const isCantAttend = votes?.cantAttend;
                
                if (hasVotedOptions || isCantAttend) {
                     totalVoterCount++;
                     totalVoters.push(voterInfo);
                }

                if (votes?.cantAttend) {
                    cantAttendCount++;
                    cantAttendVoters.push(voterInfo);
                } else if (votes?.optionIds && votes.optionIds.length > 0) {
                    votes.optionIds.forEach(optionId => {
                        optionVotes[optionId] = (optionVotes[optionId] || 0) + 1;
                        if (!optionVoters[optionId]) {
                            optionVoters[optionId] = [];
                        }
                        optionVoters[optionId].push(voterInfo);
                    });
                }

                if (votes?.attendance === 'attending') {
                    attendingCount++;
                    attendingVoters.push(voterInfo);
                } else if (votes?.attendance === 'not_attending') {
                    notAttendingCount++;
                    notAttendingVoters.push(voterInfo);
                }
            });

            setStats({
                optionVotes,
                optionVoters,
                cantAttendCount,
                cantAttendVoters,
                attendanceStats: {
                    attending: attendingCount,
                    notAttending: notAttendingCount,
                    attendingVoters,
                    notAttendingVoters,
                },
                totalVoterCount,
                totalVoters
            });
        });

        return () => unsubscribe();
    }, [cohort.id, cohort.socializingPhase]);

    const currentPhase = cohort.socializingPhase || 'idle';
    const currentPhaseIndex = PHASES.indexOf(currentPhase);

    // Toggle location
    const toggleLocation = (loc: string) => {
        if (selectedLocations.includes(loc)) {
            setSelectedLocations(selectedLocations.filter(l => l !== loc));
        } else {
            setSelectedLocations([...selectedLocations, loc]);
        }
    };

    // Add custom location
    const addCustomLocation = () => {
        if (customLocation.trim()) {
            if (!selectedLocations.includes(customLocation.trim())) {
                setSelectedLocations([...selectedLocations, customLocation.trim()]);
            }
            setCustomLocation('');
        }
    };

    // Calculate total combinations
    const totalCombinations = selectedDates.length * selectedLocations.length;

    // 마감 시간 계산 (현재 시간 + deadlineHours)
    const calculateDeadline = (hours: number): string => {
        const deadline = new Date();
        deadline.setHours(deadline.getHours() + hours);
        return deadline.toISOString();
    };

    // Start option voting
    const handleStartVoting = () => {
        if (selectedDates.length === 0 || selectedLocations.length === 0) {
            toast({ title: '최소 1개의 날짜와 장소를 선택해주세요', variant: 'destructive' });
            return;
        }

        // Generate Cartesian Product
        const combinations = [];
        let count = 1;
        // Sort dates first
        const sortedDates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime());
        
        for (const d of sortedDates) {
            for (const loc of selectedLocations) {
                combinations.push({
                    id: `opt-${count++}`,
                    date: format(d, 'yyyy-MM-dd'),
                    time: selectedTime,
                    location: loc
                });
            }
        }

        const deadline = calculateDeadline(deadlineHours);

        startTransition(async () => {
            const res = await updateCohortPhase(cohort.id, 'option_vote', { combinations }, deadline);
            if (res.success) {
                toast({ title: '투표가 시작되었습니다!', description: `${deadlineHours}시간 후 마감 (${estimatedDeadline})` });
                onUpdate?.();
                router.refresh();
            } else {
                toast({ title: '실패', description: res.error, variant: 'destructive' });
            }
        });
    };

    // Start attendance check
    const handleStartAttendanceCheck = () => {
        // Check if we have a winner (either automatic or manual)
        const winner = getTopVote();
        
        if (!winner && !selectedWinnerId) {
             toast({ title: '선택된 후보가 없습니다', description: '투표가 없으면 수동으로 선택해주세요.', variant: 'destructive' });
             return;
        }

        if (!confirm('현재 선택된 일정으로 참불 조사를 시작하시겠습니까?')) return;

        const deadline = calculateDeadline(deadlineHours);

        startTransition(async () => {
            const res = await startAttendanceCheck(cohort.id, deadline, selectedWinnerId || undefined);
            if (res.success) {
                toast({ title: '참불 조사가 시작되었습니다!', description: `${res.winningOption?.date} ${res.winningOption?.time} @ ${res.winningOption?.location} (${deadlineHours}시간 후 마감)` });
                onUpdate?.();
                router.refresh();
            } else {
                toast({ title: '실패', description: res.error, variant: 'destructive' });
            }
        });
    };

    // Confirm socializing
    const handleConfirm = () => {
        if (!confirm('참불 조사를 마감하고 모임을 확정하시겠습니까?')) return;

        startTransition(async () => {
            const res = await confirmSocializing(cohort.id);
            if (res.success) {
                toast({ title: '모임이 확정되었습니다!', description: `참석 ${res.attendeeCount}명, 불참 ${res.absenteeCount}명` });
                onUpdate?.();
                router.refresh();
            } else {
                toast({ title: '실패', description: res.error, variant: 'destructive' });
            }
        });
    };

    // Reset all
    const handleReset = () => {
        if (!confirm('초기화 하시겠습니까? 모든 투표 데이터가 삭제됩니다.')) return;

        startTransition(async () => {
                    const res = await resetSocializing(cohort.id);
                    if (res.success) {
                        toast({ title: '초기화 완료' });
                        setStats({ 
                            optionVotes: {}, 
                            optionVoters: {}, 
                            cantAttendCount: 0, 
                            cantAttendVoters: [], 
                            attendanceStats: { attending: 0, notAttending: 0, attendingVoters: [], notAttendingVoters: [] },
                            totalVoterCount: 0,
                            totalVoters: []
                        });
                        setSelectedDates([]);
                setSelectedLocations([]);
                setCustomLocation('');
                onUpdate?.();
                router.refresh();
            } else {
                toast({ title: '실패', description: res.error, variant: 'destructive' });
            }
        });
    };

    // Refresh stats (실시간 구독이 있으므로 수동 새로고침은 백업용)
    const handleRefreshStats = () => {
        startTransition(async () => {
            const newStats = await getSocializingStats(cohort.id);
            setStats(newStats);
        });
    };

    // Update Open Chat URL
    const handleUpdateUrl = () => {
        startTransition(async () => {
            const res = await updateSocializingUrl(cohort.id, openChatUrl || null);
            if (res.success) {
                toast({ title: '오픈카톡방 URL이 저장되었습니다.' });
                onUpdate?.();
                router.refresh();
            } else {
                toast({ title: '실패', description: res.error, variant: 'destructive' });
            }
        });
    };

    const openVoterDialog = (e: React.MouseEvent, title: string, voters: VoterInfo[]) => {
        e.stopPropagation();
        setDialogTitle(title);
        setDialogVoters(voters);
        setIsParticipantDialogOpen(true);
    };

    // Get top vote
    const getTopVote = () => {
        if (selectedWinnerId) {
            return { optionId: selectedWinnerId, count: stats.optionVotes[selectedWinnerId] || 0 };
        }
        const sorted = Object.entries(stats.optionVotes).sort((a, b) => b[1] - a[1]);
        if (sorted.length === 0) return null;
        return { optionId: sorted[0][0], count: sorted[0][1] };
    };

    // Ranking Component
    const VoteRanking = () => {
        const options = cohort.socializingOptions?.combinations || [];
        const total = Object.values(stats.optionVotes).reduce((a, b) => a + b, 0) + stats.cantAttendCount;

        if (options.length === 0) return null;

        // Map options to include counts and sort - only show options with votes
        const optionsWithCounts = options
            .map(opt => ({
                ...opt,
                count: stats.optionVotes[opt.id] || 0
            }))
            .filter(opt => opt.count > 0)
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
                        <p className="text-xs text-muted-foreground text-center py-4">
                            아직 투표가 없습니다.
                        </p>
                    )}
                    {optionsWithCounts.map((option, idx) => {
                        const percent = total > 0 ? Math.round((option.count / total) * 100) : 0;
                        const isWinner = selectedWinnerId ? selectedWinnerId === option.id : idx === 0;
                        const voters = stats.optionVoters[option.id] || [];

                        return (
                            <div 
                                key={option.id} 
                                className={cn(
                                    "space-y-1 p-2 rounded cursor-pointer transition-all border", 
                                    isWinner ? "bg-blue-50 border-blue-300 ring-1 ring-blue-300" : "bg-white border-transparent hover:bg-gray-100"
                                )}
                                onClick={() => setSelectedWinnerId(prev => prev === option.id ? null : option.id)}
                            >
                                <div className="flex items-center justify-between text-xs">
                                    <span className={cn("font-medium flex items-center", isWinner && "text-primary")}>
                                        {idx + 1}. {formatSafeDate(option.date)} {option.time} {option.location}
                                        {isWinner && <CheckCircle className="inline w-3 h-3 ml-1 text-blue-500" />}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-500">{option.count}표 ({percent}%)</span>
                                        {voters.length > 0 && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 rounded-full hover:bg-blue-100"
                                                onClick={(e) => openVoterDialog(e, `${formatSafeDate(option.date)} ${option.time} ${option.location}`, voters)}
                                            >
                                                <Users className="w-3 h-3 text-gray-500" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-1">
                                    <div
                                        className={cn("h-full rounded-full transition-all", isWinner ? "bg-blue-500" : "bg-gray-300")}
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
                                            onClick={(e) => openVoterDialog(e, "불참", stats.cantAttendVoters)}
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
    };

    return (
        <Card className="w-full transition-all duration-300">
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-muted-foreground" />
                        <CardTitle>애프터 다이닝 관리</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={handleReset} 
                            disabled={isPending} 
                            className="text-muted-foreground h-8"
                        >
                            <RefreshCw className="w-3 h-3 mr-1" /> 초기화
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 hover:bg-gray-100 transition-colors"
                            onClick={() => setIsExpanded(!isExpanded)}
                        >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                    </div>
                </div>
                
                {isExpanded && (
                    <div className="animate-in fade-in slide-in-from-top-1 duration-300">
                        <CardDescription>
                            애프터 다이닝의 진행 단계를 관리하고 투표 현황을 모니터링합니다.
                        </CardDescription>

                        {/* Stepper */}
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
                                );
                            })}
                        </div>
                    </div>
                )}
            </CardHeader>

            {isExpanded && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <Separator />
                    <CardContent className="pt-6">
                        {/* Phase 0: Idle - 선택지 추가 */}
                        {currentPhase === 'idle' && (
                    <div className="space-y-6">
                        <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                            <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
                            <div className="space-y-1">
                                <p className="text-sm font-medium">투표 선택지를 구성하세요 (매트릭스 방식)</p>
                                <p className="text-xs text-muted-foreground">
                                    원하는 날짜와 장소를 여러 개 선택하면 모든 조합이 자동으로 생성됩니다.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* 1. 날짜 선택 */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-bold flex items-center gap-2">
                                    <CalendarIcon className="w-4 h-4" /> 날짜 및 시간 선택
                                </h4>
                                <div className="border rounded-md p-3 bg-white">
                                    <Calendar
                                        mode="multiple"
                                        selected={selectedDates}
                                        onSelect={setSelectedDates}
                                        locale={ko}
                                        className="rounded-md w-full flex justify-center [&_.rdp-button_previous]:opacity-100 [&_.rdp-button_next]:opacity-100 [&_button]:visible"
                                        classNames={{
                                            today: "text-indigo-600 font-bold ring-2 ring-offset-2 ring-indigo-400",
                                            selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                                            day_button: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground",
                                        }}
                                    />
                                </div>
                                <div className="flex items-center gap-3 bg-muted/30 p-3 rounded-lg">
                                    <Clock className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-sm font-medium">기본 시간:</span>
                                    <select
                                        value={selectedTime}
                                        onChange={(e) => setSelectedTime(e.target.value)}
                                        className="h-9 flex-1 px-2 rounded-md border border-input bg-background text-sm"
                                    >
                                        {TIME_PRESETS.map(t => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* 2. 장소 선택 */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-bold flex items-center gap-2">
                                    <MapPin className="w-4 h-4" /> 장소 후보 선택
                                </h4>
                                
                                {/* Quick Presets */}
                                <div className="space-y-4">
                                    {SEOUL_HOTSPOTS.map((category) => (
                                        <div key={category.category} className="space-y-2">
                                            <p className="text-xs font-semibold text-muted-foreground">{category.category}</p>
                                            <div className="flex flex-wrap gap-2">
                                                {category.places.map(place => {
                                                    const isSelected = selectedLocations.includes(place);
                                                    return (
                                                        <Button
                                                            key={place}
                                                            variant={isSelected ? "default" : "outline"}
                                                            size="sm"
                                                            onClick={() => toggleLocation(place)}
                                                            className={cn(
                                                                "h-8 px-3 text-xs transition-all",
                                                                isSelected ? "ring-2 ring-primary/20" : "hover:bg-gray-100"
                                                            )}
                                                        >
                                                            {place}
                                                            {isSelected && <CheckCircle className="w-3 h-3 ml-1.5" />}
                                                        </Button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <Separator />

                                {/* Custom Input */}
                                <div className="space-y-2">
                                    <p className="text-xs font-semibold text-muted-foreground">직접 입력</p>
                                    <div className="flex gap-2">
                                        <Input
                                            value={customLocation}
                                            onChange={(e) => setCustomLocation(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && addCustomLocation()}
                                            placeholder="장소 직접 입력..."
                                            className="h-9"
                                        />
                                        <Button onClick={addCustomLocation} size="sm" className="h-9">추가</Button>
                                    </div>
                                </div>

                                {/* Selected Locations Chips */}
                                {selectedLocations.length > 0 && (
                                    <div className="p-3 bg-blue-50/50 border rounded-lg">
                                        <p className="text-xs text-muted-foreground mb-2">선택된 장소 ({selectedLocations.length})</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {selectedLocations.map(loc => (
                                                <Badge 
                                                    key={loc} 
                                                    variant="secondary"
                                                    className="pl-2 pr-1 py-0.5 text-xs bg-white border-blue-100 hover:bg-red-50 hover:text-red-600 cursor-pointer transition-colors group"
                                                    onClick={() => toggleLocation(loc)}
                                                >
                                                    {loc}
                                                    <XCircle className="w-3 h-3 ml-1 text-gray-400 group-hover:text-red-500" />
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <Separator />

                        {/* Summary & Actions */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
                                <div className="space-y-1">
                                    <p className="text-sm font-medium">예상 생성 결과</p>
                                    <p className="text-xs text-muted-foreground">
                                        날짜 {selectedDates.length}개 × 장소 {selectedLocations.length}개 = 
                                        <span className="font-bold text-primary"> 총 {totalCombinations}개 선택지</span>
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded border">
                                    <Clock className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-xs font-medium text-muted-foreground">마감 시간:</span>
                                    <select
                                        value={deadlineHours}
                                        onChange={(e) => setDeadlineHours(Number(e.target.value))}
                                        className="h-6 px-1 rounded border-none bg-transparent text-xs font-bold focus:ring-0 cursor-pointer"
                                    >
                                        <option value={6}>6시간</option>
                                        <option value={12}>12시간</option>
                                        <option value={24}>24시간</option>
                                        <option value={48}>48시간</option>
                                    </select>
                                    <span className="text-xs text-gray-400">({estimatedDeadline})</span>
                                </div>
                            </div>

                            <Button onClick={handleStartVoting} disabled={isPending || totalCombinations === 0} className="w-full h-11 text-base font-semibold shadow-lg shadow-primary/20">
                                {isPending && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
                                투표 시작하기
                            </Button>
                        </div>
                    </div>
                )}

                {/* Phase 1: Option Vote */}
                {currentPhase === 'option_vote' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">실시간 투표 현황</span>
                            <Button variant="ghost" size="sm" onClick={handleRefreshStats} disabled={isPending} className="h-7 text-xs">
                                <RefreshCw className={cn("w-3 h-3 mr-1", isPending && "animate-spin")} /> 새로고침
                            </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 border rounded-lg space-y-1">
                                <p className="text-xs text-muted-foreground">현재 1위</p>
                                <p className="text-lg font-bold">
                                    {getTopVote()
                                        ? (() => {
                                            const option = cohort.socializingOptions?.combinations?.find(o => o.id === getTopVote()!.optionId);
                                            return option
                                                ? `${formatSafeDate(option.date)} ${option.time} ${option.location} (${getTopVote()!.count}표)`
                                                : '집계 중...';
                                        })()
                                        : '집계 중...'
                                    }
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
                                            onClick={(e) => openVoterDialog(e, "전체 참여자 명단", stats.totalVoters)}
                                        >
                                            <Users className="w-3 h-3 text-gray-500" />
                                        </Button>
                                    )}
                                </div>
                                <p className="text-lg font-bold">
                                    {stats.totalVoterCount}명
                                </p>
                            </div>
                        </div>

                        <VoteRanking />

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
                            <Button onClick={handleStartAttendanceCheck} disabled={isPending} size="sm">
                                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                참불 조사 시작 ({deadlineHours}시간)
                            </Button>
                        </div>
                    </div>
                )}

                {/* Phase 2: Attendance Check */}
                {currentPhase === 'attendance_check' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">참불 현황</span>
                            <Button variant="ghost" size="sm" onClick={handleRefreshStats} disabled={isPending} className="h-7 text-xs">
                                <RefreshCw className={cn("w-3 h-3 mr-1", isPending && "animate-spin")} /> 새로고침
                            </Button>
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
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 rounded-full hover:bg-green-100 -mr-2"
                                            onClick={(e) => openVoterDialog(e, "참석자 명단", stats.attendanceStats.attendingVoters)}
                                        >
                                            <Users className="w-3 h-3 text-green-600" />
                                        </Button>
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
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 rounded-full hover:bg-gray-200 -mr-2"
                                            onClick={(e) => openVoterDialog(e, "불참자 명단", stats.attendanceStats.notAttendingVoters)}
                                        >
                                            <Users className="w-3 h-3 text-gray-500" />
                                        </Button>
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
                            <Button onClick={handleConfirm} disabled={isPending} size="sm">
                                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                모임 확정
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
                                애프터 다이닝 일정이 확정되었습니다.
                            </p>
                        </div>

                        {cohort.socializingResult && (
                            <div className="w-full space-y-3">
                                <div className="flex gap-4 text-sm border p-3 rounded-lg bg-muted/20 justify-center">
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
                                <div className="flex justify-center gap-6 text-sm">
                                    <div className="flex items-center gap-2">
                                        <UserCheck className="w-4 h-4 text-green-600" />
                                        <span>참석 {cohort.socializingResult.attendees?.length || 0}명</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <UserX className="w-4 h-4 text-gray-400" />
                                        <span>불참 {cohort.socializingResult.absentees?.length || 0}명</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 오픈카톡방 URL 설정 */}
                        <div className="w-full mt-6 border-t pt-6">
                            <div className="flex flex-col space-y-2 text-left">
                                <label className="text-sm font-medium flex items-center gap-2">
                                    <Link className="w-4 h-4" /> 오픈카톡방 URL 설정
                                </label>
                                <div className="flex gap-2">
                                    <Input 
                                        placeholder="https://open.kakao.com/..." 
                                        value={openChatUrl}
                                        onChange={(e) => setOpenChatUrl(e.target.value)}
                                    />
                                    <Button onClick={handleUpdateUrl} disabled={isPending}>
                                        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : '저장'}
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    * 입력한 URL은 모임 하루 전부터 사용자에게 '입장하기' 버튼으로 노출됩니다.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
                    </CardContent>
                </div>
            )}

            <ParticipantListDialog 
                open={isParticipantDialogOpen}
                onOpenChange={setIsParticipantDialogOpen}
                title={dialogTitle}
                voters={dialogVoters}
            />
        </Card>
    );
}
