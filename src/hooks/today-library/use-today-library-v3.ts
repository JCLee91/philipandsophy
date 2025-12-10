     1|'use client';
     2|
     3|import { useEffect, useMemo, useState } from 'react';
     4|import { useRouter, useSearchParams } from 'next/navigation';
     5|import { useAuth } from '@/contexts/AuthContext';
     6|import { useAccessControl } from '@/hooks/use-access-control';
     7|import { useParticipantSubmissionsRealtime } from '@/hooks/use-submissions';
     8|import { useCohort } from '@/hooks/use-cohorts';
     9|import { useClusterSubmissions } from '@/hooks/use-cluster-submissions';
    10|import { useToast } from '@/hooks/use-toast';
    11|import { useLockedToast } from '@/hooks/use-locked-toast';
    12|import { useQuery } from '@tanstack/react-query';
    13|import { getDb } from '@/lib/firebase';
    14|import { collection, query, where, getDocs } from 'firebase/firestore';
    15|import { findLatestClusterMatching, findClusterById } from '@/lib/matching-utils';
    16|import { getSubmissionDate, isMatchingInProgress, isAfterProgram } from '@/lib/date-utils';
    17|import { appRoutes } from '@/lib/navigation';
    18|import { getFirstName } from '@/lib/utils';
    19|import { format, parseISO, addDays, differenceInDays } from 'date-fns';
    20|import type { Participant, Cohort } from '@/types/database';
    21|import type { ClusterMemberWithSubmission } from '@/types/today-library';
    22|
    23|export function useTodayLibraryV3() {
    24|  const router = useRouter();
    25|  const searchParams = useSearchParams();
    26|  const cohortId = searchParams.get('cohort');
    27|  const targetClusterIdParam = searchParams.get('cluster');
    28|  const urlMatchingDate = searchParams.get('matchingDate');
    29|  const fromRecap = searchParams.get('from') === 'recap';
    30|
    31|  const { participant, isLoading: sessionLoading } = useAuth();
    32|  const currentUserId = participant?.id;
    33|  const { isSuperAdmin, isLocked } = useAccessControl();
    34|
    35|  const { data: cohort, isLoading: cohortLoading } = useCohort(cohortId || undefined);
    36|  const { toast } = useToast();
    37|  const { showLockedToast } = useLockedToast();
    38|
    39|  const todayDate = getSubmissionDate();
    40|  const { data: viewerSubmissions = [], isLoading: viewerSubmissionLoading } = useParticipantSubmissionsRealtime(currentUserId);
    41|
    42|  const viewerSubmissionDates = useMemo(
    43|    () => new Set(viewerSubmissions.map(s => s.submissionDate)),
    44|    [viewerSubmissions]
    45|  );
    46|  const viewerHasSubmittedToday = viewerSubmissionDates.has(todayDate);
    47|  const preferredMatchingDate = viewerHasSubmittedToday ? todayDate : undefined;
    48|
    49|  const totalSubmissionCount = viewerSubmissions.length;
    50|  const isFirstTimeUser = totalSubmissionCount === 0;
    51|
    52|  // 내 클러스터 매칭 데이터
    53|  const myClusterMatching = useMemo(() => {
    54|    if (!cohort?.dailyFeaturedParticipants || !currentUserId) return null;
    55|    const effectiveDate = urlMatchingDate || preferredMatchingDate;
    56|    return findLatestClusterMatching(cohort.dailyFeaturedParticipants, currentUserId, effectiveDate);
    57|  }, [cohort?.dailyFeaturedParticipants, currentUserId, urlMatchingDate, preferredMatchingDate]);
    58|
    59|  // 다른 클러스터 구경 시
    60|  const targetClusterMatching = useMemo(() => {
    61|    if (!targetClusterIdParam || !cohort?.dailyFeaturedParticipants) return null;
    62|    const effectiveDate = urlMatchingDate || preferredMatchingDate;
    63|    return findClusterById(cohort.dailyFeaturedParticipants, targetClusterIdParam, effectiveDate);
    64|  }, [cohort?.dailyFeaturedParticipants, targetClusterIdParam, urlMatchingDate, preferredMatchingDate]);
    65|
    66|  const clusterMatching = targetClusterIdParam ? targetClusterMatching : myClusterMatching;
    67|  const isViewingOtherCluster = targetClusterIdParam && myClusterMatching?.clusterId !== targetClusterIdParam;
    68|
    69|  const visibleProfileIds = useMemo(() => {
    70|    if (!clusterMatching) return [];
    71|    return clusterMatching.assignedIds;
    72|  }, [clusterMatching]);
    73|
    74|  // 전체 멤버 정보 조회 (LikesTab용)
    75|  const { data: allParticipants = [], isLoading: allParticipantsLoading } = useQuery<Participant[]>({
    76|    queryKey: ['all-participants-v3', cohortId],
    77|    queryFn: async () => {
    78|      if (!cohortId) return [];
    79|      const db = getDb();
    80|      const q = query(collection(db, 'participants'), where('cohortId', '==', cohortId));
    81|      const snapshot = await getDocs(q);
    82|      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Participant);
    83|    },
    84|    enabled: !!cohortId,
    85|    staleTime: 5 * 60 * 1000,
    86|  });
    87|
    88|  // 클러스터 멤버 정보 쿼리 (최적화: allParticipants에서 필터링)
    89|  const clusterMembers = useMemo(() => {
    90|     if (!visibleProfileIds.length || !allParticipants.length) return [];
    91|     
    92|     const members = allParticipants.filter(p => visibleProfileIds.includes(p.id));
    93|     
    94|     return members.map(p => {
    95|        const inferCircleUrl = (url?: string) => {
    96|          if (!url) return undefined;
    97|          const [base, queryStr] = url.split('?');
    98|          if (!base.includes('_full')) return undefined;
    99|          const circleBase = base.replace('_full', '_circle');
   100|          return queryStr ? `${circleBase}?${queryStr}` : circleBase;
   101|        };
   102|
   103|        const circleImage = p.profileImageCircle || inferCircleUrl(p.profileImage);
   104|        return { ...p, profileImage: circleImage || p.profileImage, profileImageCircle: circleImage };
   105|      });
   106|  }, [visibleProfileIds, allParticipants]);
   107|  
   108|  const membersLoading = allParticipantsLoading;
   109|
   110|  // 인증 데이터 쿼리
   111|  const { data: submissionsMap = {}, isLoading: submissionsLoading } = useClusterSubmissions(
   112|    visibleProfileIds,
   113|    clusterMatching?.matchingDate || '',
   114|    !!clusterMatching?.matchingDate
   115|  );
   116|
   117|  // 멤버 + 인증 데이터 결합
   118|  const clusterMembersWithSubmissions = useMemo<ClusterMemberWithSubmission[]>(() => {
   119|    const members = clusterMembers.map(member => {
   120|      const submission = submissionsMap[member.id];
   121|      const isMe = member.id === currentUserId;
   122|
   123|      return {
   124|        ...member,
   125|        name: isMe ? '나' : getFirstName(member.name),
   126|        submission,
   127|        review: submission?.review || '',
   128|        dailyAnswer: submission?.dailyAnswer || '',
   129|        dailyQuestion: submission?.dailyQuestion || '',
   130|        bookCoverUrl: submission?.bookCoverUrl,
   131|        bookImageUrl: submission?.bookImageUrl,
   132|      };
   133|    });
   134|
   135|    return members.sort((a, b) => {
   136|      if (a.id === currentUserId) return -1;
   137|      if (b.id === currentUserId) return 1;
   138|      return 0;
   139|    });
   140|  }, [clusterMembers, submissionsMap, currentUserId]);
   141|
   142|  const dailyQuestion = clusterMembersWithSubmissions.find(m => m.dailyQuestion)?.dailyQuestion || '';
   143|
   144|  // 답변 확장 상태
   145|  const [expandedAnswers, setExpandedAnswers] = useState<Set<string>>(new Set());
   146|
   147|  // 클러스터 변경 시 expandedAnswers 초기화
   148|  useEffect(() => {
   149|    setExpandedAnswers(new Set());
   150|  }, [targetClusterIdParam, clusterMatching?.clusterId]);
   151|
   152|  const toggleAnswer = (participantId: string) => {
   153|    const isMe = participantId === currentUserId;
   154|
   155|    if (isLocked && !isSuperAdmin && !isMe) {
   156|      showLockedToast('answer');
   157|      return;
   158|    }
   159|
   160|    setExpandedAnswers(prev => {
   161|      const next = new Set(prev);
   162|      if (next.has(participantId)) {
   163|        next.delete(participantId);
   164|      } else {
   165|        next.add(participantId);
   166|      }
   167|      return next;
   168|    });
   169|  };
   170|
   171|  // 세션 검증
   172|  useEffect(() => {
   173|    if (!sessionLoading && !cohortLoading) {
   174|      if (!participant) {
   175|        toast({ title: '로그인이 필요합니다', description: '접근 코드를 입력해주세요' });
   176|        router.replace('/app');
   177|        return;
   178|      }
   179|      if (!cohortId || (cohortId && !cohort)) {
   180|        toast({ title: '잘못된 접근입니다', description: '올바른 접근 코드로 다시 입장해주세요' });
   181|        router.replace('/app');
   182|        return;
   183|      }
   184|    }
   185|  }, [sessionLoading, cohortLoading, participant, cohortId, cohort, router, toast]);
   186|
   187|  // 알림 제거
   188|  useEffect(() => {
   189|    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
   190|      navigator.serviceWorker.controller.postMessage({
   191|        type: 'CLEAR_NOTIFICATIONS_BY_TYPE',
   192|        notificationType: 'matching',
   193|      });
   194|    }
   195|  }, []);
   196|
   197|  // 핸들러
   198|  const handleProfileClick = (participantId: string) => {
   199|    const isMe = participantId === currentUserId;
   200|
   201|    if (isLocked && !isSuperAdmin && !isMe) {
   202|      showLockedToast('profile');
   203|      return;
   204|    }
   205|
   206|    if (!clusterMatching?.matchingDate) {
   207|      toast({ title: '프로필북 정보를 불러올 수 없습니다', description: '잠시 후 다시 시도해주세요' });
   208|      return;
   209|    }
   210|
   211|    router.push(`${appRoutes.profile(participantId, cohortId!)}&matchingDate=${encodeURIComponent(clusterMatching.matchingDate)}`);
   212|  };
   213|
   214|  const handleReviewClick = (participantId: string) => {
   215|    const isMe = participantId === currentUserId;
   216|
   217|    if (isLocked && !isSuperAdmin && !isMe) {
   218|      showLockedToast('review');
   219|      return;
   220|    }
   221|
   222|    router.push(`/app/chat/today-library/review/${encodeURIComponent(participantId)}?date=${clusterMatching?.matchingDate}&cohort=${cohortId}`);
   223|  };
   224|
   225|  const handleBack = () => {
   226|    if (fromRecap) {
   227|      router.push(appRoutes.todayLibrary(cohortId!));
   228|    } else if (isViewingOtherCluster) {
   229|      router.push(appRoutes.todayLibraryOtherClusters(cohortId!));
   230|    } else {
   231|      router.push(appRoutes.chat(cohortId!));
   232|    }
   233|  };
   234|
   235|  const handleReturnToMyCluster = () => {
   236|    const matchingDate = clusterMatching?.matchingDate;
   237|    if (matchingDate) {
   238|      router.push(`${appRoutes.todayLibrary(cohortId!)}&matchingDate=${encodeURIComponent(matchingDate)}`);
   239|    } else {
   240|      router.push(appRoutes.todayLibrary(cohortId!));
   241|    }
   242|  };
   243|
   244|  // TopBar 타이틀 계산
   245|  const getTopBarTitle = () => {
   246|    if (isViewingOtherCluster) return "다른 모임 구경 중";
   247|
   248|    const matchingDate = clusterMatching?.matchingDate;
   249|    if (!matchingDate) return "오늘의 서재";
   250|
   251|    const meetingDate = addDays(parseISO(matchingDate), 1);
   252|    const meetingDateStr = format(meetingDate, 'yyyy-MM-dd');
   253|    const isToday = meetingDateStr === todayDate;
   254|
   255|    if (fromRecap && cohort?.startDate) {
   256|      const programStartDate = parseISO(cohort.startDate);
   257|      const dayNumber = differenceInDays(meetingDate, programStartDate);
   258|      return `Day ${dayNumber} 모임`;
   259|    }
   260|
   261|    if (isToday) return "오늘의 서재";
   262|    return `${format(meetingDate, 'M/d')} 모임`;
   263|  };
   264|
   265|  // 날짜 배지 계산
   266|  const getMeetingDateBadge = () => {
   267|    const matchingDate = clusterMatching?.matchingDate;
   268|    if (!matchingDate) return { label: '오늘 모임', isToday: true };
   269|
   270|    const meetingDate = addDays(parseISO(matchingDate), 1);
   271|    const meetingDateStr = format(meetingDate, 'yyyy-MM-dd');
   272|    const isToday = meetingDateStr === todayDate;
   273|
   274|    return {
   275|      label: isToday ? '오늘 모임' : `${format(meetingDate, 'M/d')} 모임`,
   276|      isToday,
   277|    };
   278|  };
   279|
   280|  const isLoading = sessionLoading || cohortLoading || viewerSubmissionLoading || membersLoading || submissionsLoading;
   281|  const isValidSession = !!participant && !!cohort && !!cohortId;
   282|  const isPostProgram = cohort ? isAfterProgram(cohort) : false;
   283|  const showPostProgramView = isPostProgram && !urlMatchingDate;
   284|
   285|  return {
   286|    // 상태
   287|    cohortId,
   288|    cohort,
   289|    currentUserId,
   290|    isLoading,
   291|    isValidSession,
   292|    
   293|    // 조건
   294|    isFirstTimeUser,
   295|    isMatchingInProgress: isMatchingInProgress(),
   296|    isPostProgram,
   297|    showPostProgramView,
   298|    fromRecap,
   299|    isViewingOtherCluster,
   300|    isSuperAdmin,
   301|    isLocked,
   302|    
   303|    // 클러스터 데이터
   304|    clusterMatching,
   305|    clusterMembersWithSubmissions,
   306|    dailyQuestion,
   307|    
   308|    // 추가 데이터 (LikesTab용)
   309|    allParticipants,
   310|    
   311|    // 답변 확장 상태
   312|    expandedAnswers,
   313|    toggleAnswer,
   314|    
   315|    // 핸들러
   316|    handleProfileClick,
   317|    handleReviewClick,
   318|    handleBack,
   319|    handleReturnToMyCluster,
   320|    getTopBarTitle,
   321|    getMeetingDateBadge,
   322|    
   323|    router,
   324|    toast,
   325|  };
   326|}