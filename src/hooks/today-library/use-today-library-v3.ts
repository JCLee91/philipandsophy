'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useAccessControl } from '@/hooks/use-access-control';
import { useParticipantSubmissionsRealtime } from '@/hooks/use-submissions';
import { useCohort } from '@/hooks/use-cohorts';
import { useClusterSubmissions } from '@/hooks/use-cluster-submissions';
import { useToast } from '@/hooks/use-toast';
import { useLockedToast } from '@/hooks/use-locked-toast';
import { useQuery } from '@tanstack/react-query';
import { getDb } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { findLatestClusterMatching, findClusterById } from '@/lib/matching-utils';
import { getSubmissionDate, isMatchingInProgress, isAfterProgram } from '@/lib/date-utils';
import { appRoutes } from '@/lib/navigation';
import { getFirstName } from '@/lib/utils';
import { format, parseISO, addDays, differenceInDays } from 'date-fns';
import type { Participant, Cohort } from '@/types/database';
import type { ClusterMemberWithSubmission } from '@/types/today-library';

export function useTodayLibraryV3() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cohortId = searchParams.get('cohort');
  const targetClusterIdParam = searchParams.get('cluster');
  const urlMatchingDate = searchParams.get('matchingDate');
  const fromRecap = searchParams.get('from') === 'recap';

  const { participant, isLoading: sessionLoading } = useAuth();
  const currentUserId = participant?.id;
  const { isSuperAdmin, isLocked } = useAccessControl();

  const { data: cohort, isLoading: cohortLoading } = useCohort(cohortId || undefined);
  const { toast } = useToast();
  const { showLockedToast } = useLockedToast();

  const todayDate = getSubmissionDate();
  const { data: viewerSubmissions = [], isLoading: viewerSubmissionLoading } = useParticipantSubmissionsRealtime(currentUserId);

  const viewerSubmissionDates = useMemo(
    () => new Set(viewerSubmissions.map(s => s.submissionDate)),
    [viewerSubmissions]
  );
  const viewerHasSubmittedToday = viewerSubmissionDates.has(todayDate);
  const preferredMatchingDate = viewerHasSubmittedToday ? todayDate : undefined;

  const totalSubmissionCount = viewerSubmissions.length;
  const isFirstTimeUser = totalSubmissionCount === 0;

  // 내 클러스터 매칭 데이터
  const myClusterMatching = useMemo(() => {
    if (!cohort?.dailyFeaturedParticipants || !currentUserId) return null;
    const effectiveDate = urlMatchingDate || preferredMatchingDate;
    return findLatestClusterMatching(cohort.dailyFeaturedParticipants, currentUserId, effectiveDate);
  }, [cohort?.dailyFeaturedParticipants, currentUserId, urlMatchingDate, preferredMatchingDate]);

  // 다른 클러스터 구경 시
  const targetClusterMatching = useMemo(() => {
    if (!targetClusterIdParam || !cohort?.dailyFeaturedParticipants) return null;
    const effectiveDate = urlMatchingDate || preferredMatchingDate;
    return findClusterById(cohort.dailyFeaturedParticipants, targetClusterIdParam, effectiveDate);
  }, [cohort?.dailyFeaturedParticipants, targetClusterIdParam, urlMatchingDate, preferredMatchingDate]);

  const clusterMatching = targetClusterIdParam ? targetClusterMatching : myClusterMatching;
  const isViewingOtherCluster = targetClusterIdParam && myClusterMatching?.clusterId !== targetClusterIdParam;

  const visibleProfileIds = useMemo(() => {
    if (!clusterMatching) return [];
    return clusterMatching.assignedIds;
  }, [clusterMatching]);

  // 전체 멤버 정보 조회 (LikesTab용)
  const { data: allParticipants = [], isLoading: allParticipantsLoading } = useQuery<Participant[]>({
    queryKey: ['all-participants-v3', cohortId],
    queryFn: async () => {
      if (!cohortId) return [];
      const db = getDb();
      const q = query(collection(db, 'participants'), where('cohortId', '==', cohortId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Participant);
    },
    enabled: !!cohortId,
    staleTime: 5 * 60 * 1000,
  });

  // 클러스터 멤버 정보 쿼리 (최적화: allParticipants에서 필터링)
  const clusterMembers = useMemo(() => {
    if (!visibleProfileIds.length || !allParticipants.length) return [];

    const members = allParticipants.filter(p => visibleProfileIds.includes(p.id));

    return members.map(p => {
      const inferCircleUrl = (url?: string) => {
        if (!url) return undefined;
        const [base, queryStr] = url.split('?');
        if (!base.includes('_full')) return undefined;
        const circleBase = base.replace('_full', '_circle');
        return queryStr ? `${circleBase}?${queryStr}` : circleBase;
      };

      const circleImage = p.profileImageCircle || inferCircleUrl(p.profileImage);
      return { ...p, profileImage: circleImage || p.profileImage, profileImageCircle: circleImage };
    });
  }, [visibleProfileIds, allParticipants]);

  const membersLoading = allParticipantsLoading;

  // 인증 데이터 쿼리
  const { data: submissionsMap = {}, isLoading: submissionsLoading } = useClusterSubmissions(
    visibleProfileIds,
    clusterMatching?.matchingDate || '',
    !!clusterMatching?.matchingDate
  );

  // 멤버 + 인증 데이터 결합
  const clusterMembersWithSubmissions = useMemo<ClusterMemberWithSubmission[]>(() => {
    const members = clusterMembers.map(member => {
      const submission = submissionsMap[member.id];
      const isMe = member.id === currentUserId;

      return {
        ...member,
        name: isMe ? '나' : getFirstName(member.name),
        submission,
        review: submission?.review || '',
        dailyAnswer: submission?.dailyAnswer || '',
        dailyQuestion: submission?.dailyQuestion || '',
        bookCoverUrl: submission?.bookCoverUrl,
        bookImageUrl: submission?.bookImageUrl,
      };
    });

    return members.sort((a, b) => {
      if (a.id === currentUserId) return -1;
      if (b.id === currentUserId) return 1;
      return 0;
    });
  }, [clusterMembers, submissionsMap, currentUserId]);

  const dailyQuestion = clusterMembersWithSubmissions.find(m => m.dailyQuestion)?.dailyQuestion || '';

  // 답변 확장 상태
  const [expandedAnswers, setExpandedAnswers] = useState<Set<string>>(new Set());

  // 클러스터 변경 시 expandedAnswers 초기화
  useEffect(() => {
    setExpandedAnswers(new Set());
  }, [targetClusterIdParam, clusterMatching?.clusterId]);

  const toggleAnswer = (participantId: string) => {
    const isMe = participantId === currentUserId;

    if (isLocked && !isSuperAdmin && !isMe) {
      showLockedToast('answer');
      return;
    }

    setExpandedAnswers(prev => {
      const next = new Set(prev);
      if (next.has(participantId)) {
        next.delete(participantId);
      } else {
        next.add(participantId);
      }
      return next;
    });
  };

  // 세션 검증
  useEffect(() => {
    if (!sessionLoading && !cohortLoading) {
      if (!participant) {
        toast({ title: '로그인이 필요합니다', description: '접근 코드를 입력해주세요' });
        router.replace('/app');
        return;
      }
      if (!cohortId || (cohortId && !cohort)) {
        toast({ title: '잘못된 접근입니다', description: '올바른 접근 코드로 다시 입장해주세요' });
        router.replace('/app');
        return;
      }
    }
  }, [sessionLoading, cohortLoading, participant, cohortId, cohort, router, toast]);

  // 알림 제거
  useEffect(() => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CLEAR_NOTIFICATIONS_BY_TYPE',
        notificationType: 'matching',
      });
    }
  }, []);

  // 핸들러
  const handleProfileClick = (participantId: string) => {
    const isMe = participantId === currentUserId;

    if (isLocked && !isSuperAdmin && !isMe) {
      showLockedToast('profile');
      return;
    }

    if (!clusterMatching?.matchingDate) {
      toast({ title: '프로필북 정보를 불러올 수 없습니다', description: '잠시 후 다시 시도해주세요' });
      return;
    }

    router.push(`${appRoutes.profile(participantId, cohortId!)}&matchingDate=${encodeURIComponent(clusterMatching.matchingDate)}`);
  };

  const handleReviewClick = (participantId: string) => {
    const isMe = participantId === currentUserId;

    if (isLocked && !isSuperAdmin && !isMe) {
      showLockedToast('review');
      return;
    }

    router.push(`/app/chat/today-library/review/${encodeURIComponent(participantId)}?date=${clusterMatching?.matchingDate}&cohort=${cohortId}`);
  };

  const handleBack = () => {
    if (fromRecap) {
      router.push(appRoutes.todayLibrary(cohortId!));
    } else if (isViewingOtherCluster) {
      router.push(appRoutes.todayLibraryOtherClusters(cohortId!));
    } else {
      router.push(appRoutes.chat(cohortId!));
    }
  };

  const handleReturnToMyCluster = () => {
    const matchingDate = clusterMatching?.matchingDate;
    if (matchingDate) {
      router.push(`${appRoutes.todayLibrary(cohortId!)}&matchingDate=${encodeURIComponent(matchingDate)}`);
    } else {
      router.push(appRoutes.todayLibrary(cohortId!));
    }
  };

  // TopBar 타이틀 계산
  const getTopBarTitle = () => {
    if (isViewingOtherCluster) return "다른 모임 구경 중";

    const matchingDate = clusterMatching?.matchingDate;
    if (!matchingDate) return "오늘의 서재";

    const meetingDate = addDays(parseISO(matchingDate), 1);
    const meetingDateStr = format(meetingDate, 'yyyy-MM-dd');
    const isToday = meetingDateStr === todayDate;

    if (fromRecap && cohort?.startDate) {
      const programStartDate = parseISO(cohort.startDate);
      const dayNumber = differenceInDays(meetingDate, programStartDate);
      return `Day ${dayNumber} 모임`;
    }

    if (isToday) return "오늘의 서재";
    return `${format(meetingDate, 'M/d')} 모임`;
  };

  // 날짜 배지 계산
  const getMeetingDateBadge = () => {
    const matchingDate = clusterMatching?.matchingDate;
    if (!matchingDate) return { label: '오늘 모임', isToday: true };

    const meetingDate = addDays(parseISO(matchingDate), 1);
    const meetingDateStr = format(meetingDate, 'yyyy-MM-dd');
    const isToday = meetingDateStr === todayDate;

    return {
      label: isToday ? '오늘 모임' : `${format(meetingDate, 'M/d')} 모임`,
      isToday,
    };
  };

  const isLoading = sessionLoading || cohortLoading || viewerSubmissionLoading || membersLoading || submissionsLoading;
  const isValidSession = !!participant && !!cohort && !!cohortId;
  const isPostProgram = cohort ? isAfterProgram(cohort) : false;
  const showPostProgramView = isPostProgram && !urlMatchingDate;

  return {
    // 상태
    cohortId,
    cohort,
    currentUserId,
    isLoading,
    isValidSession,
    
    // 조건
    isFirstTimeUser,
    isMatchingInProgress: isMatchingInProgress(),
    isPostProgram,
    showPostProgramView,
    fromRecap,
    isViewingOtherCluster,
    isSuperAdmin,
    isLocked,
    
    // 클러스터 데이터
    clusterMatching,
    clusterMembersWithSubmissions,
    dailyQuestion,

    // 추가 데이터 (LikesTab용)
    allParticipants,

    // 답변 확장 상태
    expandedAnswers,
    toggleAnswer,
    
    // 핸들러
    handleProfileClick,
    handleReviewClick,
    handleBack,
    handleReturnToMyCluster,
    getTopBarTitle,
    getMeetingDateBadge,
    
    router,
    toast,
  };
}
