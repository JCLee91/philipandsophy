'use client';

import { useState, useTransition, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { updateCohortPhase, resetSocializing, startAttendanceCheck, confirmSocializing, updateSocializingUrl } from '@/features/socializing/actions/socializing-admin-actions';
import { getSocializingStats, type VoterInfo } from '@/features/socializing/actions/socializing-actions';
import { subscribeToCohortParticipants } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Cohort, Participant } from '@/types/database';
import { PHASES } from '../constants/socializing-constants';

export interface SocializingStats {
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
}

const INITIAL_STATS: SocializingStats = {
  optionVotes: {},
  optionVoters: {},
  cantAttendCount: 0,
  cantAttendVoters: [],
  attendanceStats: {
    attending: 0,
    notAttending: 0,
    attendingVoters: [],
    notAttendingVoters: [],
  },
  totalVoterCount: 0,
  totalVoters: [],
};

interface UseSocializingAdminProps {
  cohort: Cohort;
  onUpdate?: () => void;
}

export function useSocializingAdmin({ cohort, onUpdate }: UseSocializingAdminProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  // UI 상태
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedWinnerId, setSelectedWinnerId] = useState<string | null>(null);
  const [stats, setStats] = useState<SocializingStats>(INITIAL_STATS);

  // Phase 0 상태
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [selectedTime, setSelectedTime] = useState<string>('19:00');
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [customLocation, setCustomLocation] = useState('');

  // 오픈채팅 URL
  const [openChatUrl, setOpenChatUrl] = useState(cohort.socializingOpenChatUrl || '');

  // 다이얼로그 상태
  const [isParticipantDialogOpen, setIsParticipantDialogOpen] = useState(false);
  const [dialogVoters, setDialogVoters] = useState<VoterInfo[]>([]);
  const [dialogTitle, setDialogTitle] = useState('');

  // 마감 시간
  const [deadlineHours, setDeadlineHours] = useState<number>(12);

  // 마감 예상 시간 계산
  const estimatedDeadline = useMemo(() => {
    const date = new Date();
    date.setHours(date.getHours() + deadlineHours);
    return format(date, 'M월 d일 a h시', { locale: ko });
  }, [deadlineHours]);

  // 현재 Phase
  const currentPhase = cohort.socializingPhase || 'idle';
  const currentPhaseIndex = PHASES.indexOf(currentPhase);

  // 총 조합 수
  const totalCombinations = selectedDates.length * selectedLocations.length;

  // 실시간 구독
  useEffect(() => {
    if (!cohort.socializingPhase || cohort.socializingPhase === 'idle') return;

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

      participants.forEach((p) => {
        const votes = p.socializingVotes;
        const voterInfo: VoterInfo = {
          id: p.id,
          name: p.name,
          profileImageCircle: p.profileImageCircle,
        };

        const hasOptionIds = Array.isArray(votes?.optionIds) && votes.optionIds.length > 0;
        const isCantAttend = Boolean(votes?.cantAttend);

        if (hasOptionIds || isCantAttend) {
          totalVoterCount++;
          totalVoters.push(voterInfo);
        }

        if (isCantAttend) {
          cantAttendCount++;
          cantAttendVoters.push(voterInfo);
        } else if (hasOptionIds) {
          votes!.optionIds!.forEach((optionId) => {
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
        totalVoters,
      });
    });

    return () => unsubscribe();
  }, [cohort.id, cohort.socializingPhase]);

  // 마감 시간 계산
  const calculateDeadline = (hours: number): string => {
    const deadline = new Date();
    deadline.setHours(deadline.getHours() + hours);
    return deadline.toISOString();
  };

  // 장소 토글
  const toggleLocation = (loc: string) => {
    if (selectedLocations.includes(loc)) {
      setSelectedLocations(selectedLocations.filter((l) => l !== loc));
    } else {
      setSelectedLocations([...selectedLocations, loc]);
    }
  };

  // 커스텀 장소 추가
  const addCustomLocation = () => {
    if (customLocation.trim()) {
      if (!selectedLocations.includes(customLocation.trim())) {
        setSelectedLocations([...selectedLocations, customLocation.trim()]);
      }
      setCustomLocation('');
    }
  };

  // 1위 득표 가져오기
  const getTopVote = () => {
    if (selectedWinnerId) {
      return { optionId: selectedWinnerId, count: stats.optionVotes[selectedWinnerId] || 0 };
    }
    const sorted = Object.entries(stats.optionVotes).sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) return null;
    return { optionId: sorted[0][0], count: sorted[0][1] };
  };

  // 투표 시작
  const handleStartVoting = () => {
    if (selectedDates.length === 0 || selectedLocations.length === 0) {
      toast({ title: '최소 1개의 날짜와 장소를 선택해주세요', variant: 'destructive' });
      return;
    }

    const combinations = [];
    let count = 1;
    const sortedDates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime());

    for (const d of sortedDates) {
      for (const loc of selectedLocations) {
        combinations.push({
          id: `opt-${count++}`,
          date: format(d, 'yyyy-MM-dd'),
          time: selectedTime,
          location: loc,
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

  // 참불 조사 시작
  const handleStartAttendanceCheck = () => {
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
        toast({
          title: '참불 조사가 시작되었습니다!',
          description: `${res.winningOption?.date} ${res.winningOption?.time} @ ${res.winningOption?.location} (${deadlineHours}시간 후 마감)`,
        });
        onUpdate?.();
        router.refresh();
      } else {
        toast({ title: '실패', description: res.error, variant: 'destructive' });
      }
    });
  };

  // 모임 확정
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

  // 초기화
  const handleReset = () => {
    if (!confirm('초기화 하시겠습니까? 모든 투표 데이터가 삭제됩니다.')) return;

    startTransition(async () => {
      const res = await resetSocializing(cohort.id);
      if (res.success) {
        toast({ title: '초기화 완료' });
        setStats(INITIAL_STATS);
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

  // 통계 새로고침
  const handleRefreshStats = () => {
    startTransition(async () => {
      const newStats = await getSocializingStats(cohort.id);
      setStats(newStats);
    });
  };

  // 오픈채팅 URL 업데이트
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

  // 투표자 다이얼로그 열기
  const openVoterDialog = (e: React.MouseEvent, title: string, voters: VoterInfo[]) => {
    e.stopPropagation();
    setDialogTitle(title);
    setDialogVoters(voters);
    setIsParticipantDialogOpen(true);
  };

  return {
    // 상태
    isPending,
    isExpanded,
    setIsExpanded,
    selectedWinnerId,
    setSelectedWinnerId,
    stats,
    selectedDates,
    setSelectedDates,
    selectedTime,
    setSelectedTime,
    selectedLocations,
    customLocation,
    setCustomLocation,
    openChatUrl,
    setOpenChatUrl,
    isParticipantDialogOpen,
    setIsParticipantDialogOpen,
    dialogVoters,
    dialogTitle,
    deadlineHours,
    setDeadlineHours,
    estimatedDeadline,
    currentPhase,
    currentPhaseIndex,
    totalCombinations,

    // 핸들러
    toggleLocation,
    addCustomLocation,
    getTopVote,
    handleStartVoting,
    handleStartAttendanceCheck,
    handleConfirm,
    handleReset,
    handleRefreshStats,
    handleUpdateUrl,
    openVoterDialog,
  };
}
