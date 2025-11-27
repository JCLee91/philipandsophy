'use client';

import { useState, useTransition, useEffect, useMemo, useRef } from 'react';
import { Calendar, Clock, MapPin, Check, XCircle, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { voteForOptions, type VoterInfo } from '@/features/socializing/actions/socializing-actions';
import { format, parseISO, isValid } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import UnifiedButton from '@/components/UnifiedButton';
import type { Cohort } from '@/types/database';
import ParticipantListDialog from './ParticipantListDialog';
import CountdownTimer from './CountdownTimer';

interface OptionVotingCardProps {
    cohortId: string;
    combinations: NonNullable<Cohort['socializingOptions']>['combinations'];
    currentVotes?: string[];
    currentCantAttend?: boolean;
    voteStats: Record<string, number>;
    optionVoters: Record<string, VoterInfo[]>;
    cantAttendCount: number;
    cantAttendVoters: VoterInfo[];
    deadline?: string;
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

export default function OptionVotingCard({
    cohortId,
    combinations,
    currentVotes = [],
    currentCantAttend = false,
    voteStats,
    optionVoters,
    cantAttendCount,
    cantAttendVoters,
    deadline,
    onRefresh
}: OptionVotingCardProps) {
    const [selectedDateTimes, setSelectedDateTimes] = useState<Set<string>>(new Set());
    const [selectedLocations, setSelectedLocations] = useState<Set<string>>(new Set());
    const [isCantAttend, setIsCantAttend] = useState(currentCantAttend);
    
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    // Dialog State
    const [isParticipantDialogOpen, setIsParticipantDialogOpen] = useState(false);
    const [dialogVoters, setDialogVoters] = useState<VoterInfo[]>([]);
    const [dialogTitle, setDialogTitle] = useState('');

    // Extract Unique Options
    const { uniqueDateTimes, uniqueLocations } = useMemo(() => {
        const dateSet = new Set<string>();
        const locSet = new Set<string>();
        
        combinations.forEach(c => {
            dateSet.add(`${c.date}|${c.time}`);
            locSet.add(c.location);
        });

        return {
            uniqueDateTimes: Array.from(dateSet).map(dt => {
                const [date, time] = dt.split('|');
                return { date, time, key: dt };
            }).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)),
            uniqueLocations: Array.from(locSet).sort()
        };
    }, [combinations]);

    // Track if component has been initialized with server data
    const isInitialized = useRef(false);
    const isUserInteracting = useRef(false);

    // Sync state from server when currentVotes/currentCantAttend changes
    useEffect(() => {
        // Always sync on first mount
        if (!isInitialized.current) {
            isInitialized.current = true;
        } else if (isUserInteracting.current) {
            // Skip if user is actively interacting (but not on first mount)
            return;
        }

        // Reset interaction flag when server data arrives
        isUserInteracting.current = false;
        
        if (currentCantAttend) {
            setIsCantAttend(true);
            setSelectedDateTimes(new Set());
            setSelectedLocations(new Set());
        } else {
            setIsCantAttend(false);
            const newDateTimes = new Set<string>();
            const newLocations = new Set<string>();
    
            currentVotes.forEach(voteId => {
                const combo = combinations.find(c => c.id === voteId);
                if (combo) {
                    newDateTimes.add(`${combo.date}|${combo.time}`);
                    newLocations.add(combo.location);
                }
            });
    
            setSelectedDateTimes(newDateTimes);
            setSelectedLocations(newLocations);
        }
    }, [currentVotes, currentCantAttend, combinations]);

    // Handlers
    const toggleDateTime = (key: string) => {
        isUserInteracting.current = true;
        if (isCantAttend) setIsCantAttend(false);
        const newSet = new Set(selectedDateTimes);
        if (newSet.has(key)) newSet.delete(key);
        else newSet.add(key);
        setSelectedDateTimes(newSet);
    };

    const toggleLocation = (loc: string) => {
        isUserInteracting.current = true;
        if (isCantAttend) setIsCantAttend(false);
        const newSet = new Set(selectedLocations);
        if (newSet.has(loc)) newSet.delete(loc);
        else newSet.add(loc);
        setSelectedLocations(newSet);
    };

    const toggleCantAttend = () => {
        isUserInteracting.current = true;
        if (isCantAttend) {
            setIsCantAttend(false);
        } else {
            setIsCantAttend(true);
            setSelectedDateTimes(new Set());
            setSelectedLocations(new Set());
        }
    };

    const openVoterDialog = (e: React.MouseEvent, title: string, voters: VoterInfo[]) => {
        e.stopPropagation();
        setDialogTitle(title);
        setDialogVoters(voters);
        setIsParticipantDialogOpen(true);
    };

    const handleSubmit = () => {
        if (!isCantAttend && (selectedDateTimes.size === 0 || selectedLocations.size === 0)) {
             toast({
                title: '선택 필요',
                description: '날짜와 지역을 각각 최소 1개 이상 선택해주세요.',
                variant: 'destructive',
            });
            return;
        }

        startTransition(async () => {
            // Derive option IDs from selections
            let optionIds: string[] = [];
            if (!isCantAttend) {
                optionIds = combinations
                    .filter(c => 
                        selectedDateTimes.has(`${c.date}|${c.time}`) && 
                        selectedLocations.has(c.location)
                    )
                    .map(c => c.id);
            }

            const result = await voteForOptions(cohortId, optionIds, isCantAttend);

            if (result.success) {
                // 버튼 스타일 변경으로 피드백 제공
                // Reset interaction flag so server data can sync
                isUserInteracting.current = false;
                await onRefresh?.();
            } else {
                toast({
                    title: '투표 실패',
                    description: result.error,
                    variant: 'destructive',
                });
            }
        });
    };

    // Helper to get voters count for specific criteria
    const getVotersForDateTime = (date: string, time: string) => {
        const relevantOptionIds = combinations
            .filter(c => c.date === date && c.time === time)
            .map(c => c.id);
        
        const votersMap = new Map<string, VoterInfo>();
        relevantOptionIds.forEach(id => {
            optionVoters[id]?.forEach(v => votersMap.set(v.id, v));
        });
        return Array.from(votersMap.values());
    };

    const getVotersForLocation = (location: string) => {
        const relevantOptionIds = combinations
            .filter(c => c.location === location)
            .map(c => c.id);
        
        const votersMap = new Map<string, VoterInfo>();
        relevantOptionIds.forEach(id => {
            optionVoters[id]?.forEach(v => votersMap.set(v.id, v));
        });
        return Array.from(votersMap.values());
    };

    const hasChanges = useMemo(() => {
         // Compare current selections with props
         const propDateTimes = new Set<string>();
         const propLocations = new Set<string>();
         
         if (currentCantAttend) return !isCantAttend;

         currentVotes.forEach(voteId => {
            const combo = combinations.find(c => c.id === voteId);
            if (combo) {
                propDateTimes.add(`${combo.date}|${combo.time}`);
                propLocations.add(combo.location);
            }
         });

         if (isCantAttend) return true;

         const datesChanged = 
            propDateTimes.size !== selectedDateTimes.size || 
            [...selectedDateTimes].some(d => !propDateTimes.has(d));
            
         const locsChanged = 
            propLocations.size !== selectedLocations.size || 
            [...selectedLocations].some(l => !propLocations.has(l));

         return datesChanged || locsChanged;
    }, [currentVotes, currentCantAttend, selectedDateTimes, selectedLocations, isCantAttend, combinations]);

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-900">
                    <Calendar className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="font-bold text-heading-lg text-text-primary">언제, 어디서 만날까요?</h3>
                    <p className="text-sm text-text-secondary">가능한 날짜와 장소를 모두 선택해주세요</p>
                </div>
            </div>

            <div className="space-y-6">
                {/* Date Selection */}
                <div>
                    <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        날짜 선택
                    </h4>
                    <div className="grid grid-cols-1 gap-2">
                        {uniqueDateTimes.map(({ date, time, key }) => {
                            const isSelected = selectedDateTimes.has(key);
                            const voters = getVotersForDateTime(date, time);
                            
                            return (
                                <button
                                    key={key}
                                    onClick={() => toggleDateTime(key)}
                                    disabled={isPending}
                                    className={cn(
                                        "flex items-center justify-between p-4 rounded-xl border transition-all text-left",
                                        isSelected 
                                            ? "border-gray-900 bg-gray-50" 
                                            : "border-gray-100 hover:border-gray-200 bg-white"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                                            isSelected ? "bg-gray-900 border-gray-900" : "border-gray-300"
                                        )}>
                                            {isSelected && <Check className="w-3 h-3 text-white" />}
                                        </div>
                                        <div>
                                            <span className={cn("font-medium block", isSelected ? "text-gray-900" : "text-gray-900")}>
                                                {formatSafeDate(date)}
                                            </span>
                                            <span className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                                                <Clock className="w-3 h-3" /> {time}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    {/* Participants */}
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-gray-500">
                                            {voters.length}명 선택됨
                                        </span>
                                        {voters.length > 0 && (
                                            <div
                                                onClick={(e) => openVoterDialog(e, `${formatSafeDate(date)} ${time}`, voters)}
                                                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                                            >
                                                <Users className="w-4 h-4 text-gray-400" />
                                            </div>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Location Selection */}
                <div>
                    <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        지역 선택
                    </h4>
                    <div className="grid grid-cols-1 gap-2">
                        {uniqueLocations.map((location) => {
                            const isSelected = selectedLocations.has(location);
                            const voters = getVotersForLocation(location);

                            return (
                                <button
                                    key={location}
                                    onClick={() => toggleLocation(location)}
                                    disabled={isPending}
                                    className={cn(
                                        "flex items-center justify-between p-4 rounded-xl border transition-all text-left",
                                        isSelected 
                                            ? "border-gray-900 bg-gray-50" 
                                            : "border-gray-100 hover:border-gray-200 bg-white"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                                            isSelected ? "bg-gray-900 border-gray-900" : "border-gray-300"
                                        )}>
                                            {isSelected && <Check className="w-3 h-3 text-white" />}
                                        </div>
                                        <span className={cn("font-medium", isSelected ? "text-gray-900" : "text-gray-900")}>
                                            {location}
                                        </span>
                                    </div>

                                    {/* Participants */}
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-gray-500">
                                            {voters.length}명 선택됨
                                        </span>
                                        {voters.length > 0 && (
                                            <div
                                                onClick={(e) => openVoterDialog(e, location, voters)}
                                                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                                            >
                                                <Users className="w-4 h-4 text-gray-400" />
                                            </div>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Cant Attend */}
                <button
                    onClick={toggleCantAttend}
                    disabled={isPending}
                    className={cn(
                        "w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left",
                        isCantAttend
                            ? "border-gray-900 bg-gray-50"
                            : "border-gray-100 hover:border-gray-200 bg-white"
                    )}
                >
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                            isCantAttend ? "bg-gray-900 border-gray-900" : "border-gray-300"
                        )}>
                            {isCantAttend && <XCircle className="w-3 h-3 text-white" />}
                        </div>
                        <span className={cn("font-medium", isCantAttend ? "text-gray-900" : "text-gray-500")}>
                            참석이 어려워요
                        </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-500">
                            {cantAttendCount}명 선택됨
                        </span>
                        {cantAttendCount > 0 && (
                            <div
                                onClick={(e) => openVoterDialog(e, "불참", cantAttendVoters)}
                                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                            >
                                <Users className="w-4 h-4 text-gray-400" />
                            </div>
                        )}
                    </div>
                </button>
            </div>

            {/* Deadline */}
            {deadline && (
                <CountdownTimer deadline={deadline} className="mt-6" />
            )}

            {/* Submit Button */}
            <UnifiedButton
                fullWidth
                onClick={handleSubmit}
                disabled={isPending || (!hasChanges && !isCantAttend)} // Allow submit if cant attend toggled or changes
                loading={isPending}
                loadingText="저장 중..."
                variant={!hasChanges ? "outline" : "primary"}
                className="mt-6"
            >
                {!hasChanges ? "선택 완료" : "투표하기"}
            </UnifiedButton>

            <ParticipantListDialog 
                open={isParticipantDialogOpen}
                onOpenChange={setIsParticipantDialogOpen}
                title={dialogTitle}
                voters={dialogVoters}
            />
        </div>
    );
}
