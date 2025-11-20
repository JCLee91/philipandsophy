'use client';

/**
 * 오늘의 서재 v3.1 - 온라인 독서모임 테이블
 *
 * 클러스터 멤버들의 감상평과 가치관 답변을 직접 보여주는 독서모임 형식
 * - 클러스터 테마 헤더
 * - 감상평 미리보기 섹션 (클릭하여 전체 감상평 보기)
 * - 가치관 질문 섹션
 * - 가치관 답변 아코디언 리스트
 *
 * @version 3.1.0
 * @date 2025-11-19
 */

import { Suspense, useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import PageTransition from '@/components/PageTransition';
import TopBar from '@/components/TopBar';
import FooterActions from '@/components/FooterActions';
import TodayLibraryFooter from '@/components/TodayLibraryFooter';
import ReviewPreviewCard from '@/components/ReviewPreviewCard';
import ValueAnswerAccordion from '@/components/ValueAnswerAccordion';
import { useCohort } from '@/hooks/use-cohorts';
import { useToast } from '@/hooks/use-toast';
import { useLockedToast } from '@/hooks/use-locked-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useAccessControl } from '@/hooks/use-access-control';
import { useParticipantSubmissionsRealtime } from '@/hooks/use-submissions';
import { useClusterSubmissions } from '@/hooks/use-cluster-submissions';
import { getDb } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useQuery } from '@tanstack/react-query';
import type { Participant, Cluster, ReadingSubmission } from '@/types/database';
import { appRoutes } from '@/lib/navigation';
import { getSubmissionDate } from '@/lib/date-utils';
import { getResizedImageUrl } from '@/lib/image-utils';
import { Lock } from 'lucide-react';

// ✅ Disable static generation
export const dynamic = 'force-dynamic';

type ClusterMemberWithSubmission = Participant & {
  submission?: ReadingSubmission;
  review: string;
  dailyAnswer: string;
  dailyQuestion: string;
  bookCoverUrl?: string;
  bookImageUrl?: string;
};

/**
 * 클러스터 매칭 데이터 조회
 */
interface ClusterMatchingData {
  clusterId: string;
  cluster: Cluster;
  assignedIds: string[];
  matchingDate: string;
}

/**
 * 참가자의 최신 클러스터 매칭 찾기
 */
function findLatestClusterMatching(
  dailyFeaturedParticipants: Record<string, any>,
  participantId: string,
  preferredDate?: string
): ClusterMatchingData | null {
  const dates = Object.keys(dailyFeaturedParticipants).sort().reverse();

  // 1차: preferredDate 우선
  if (preferredDate && dailyFeaturedParticipants[preferredDate]) {
    const dayData = dailyFeaturedParticipants[preferredDate];
    if (dayData.matchingVersion === 'cluster' && dayData.assignments?.[participantId]) {
      const assignment = dayData.assignments[participantId];
      const clusterId = assignment.clusterId;
      const cluster = dayData.clusters?.[clusterId];

      if (cluster && assignment.assigned) {
        return {
          clusterId,
          cluster,
          assignedIds: assignment.assigned,
          matchingDate: preferredDate
        };
      }
    }
  }

  // 2차: 가장 최근 클러스터 매칭
  for (const date of dates) {
    const dayData = dailyFeaturedParticipants[date];
    if (dayData.matchingVersion === 'cluster' && dayData.assignments?.[participantId]) {
      const assignment = dayData.assignments[participantId];
      const clusterId = assignment.clusterId;
      const cluster = dayData.clusters?.[clusterId];

      if (cluster && assignment.assigned) {
        return {
          clusterId,
          cluster,
          assignedIds: assignment.assigned,
          matchingDate: date
        };
      }
    }
  }

  return null;
}

function TodayLibraryV3Content() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cohortId = searchParams.get('cohort');

  const { participant, isLoading: sessionLoading } = useAuth();
  const currentUserId = participant?.id;
  const { isSuperAdmin, isLocked } = useAccessControl();

  const { data: cohort, isLoading: cohortLoading } = useCohort(cohortId || undefined);
  const { toast } = useToast();
  const { showLockedToast } = useLockedToast();

  const todayDate = getSubmissionDate();
  const { data: viewerSubmissions = [], isLoading: viewerSubmissionLoading } = useParticipantSubmissionsRealtime(currentUserId);

  // 오늘 인증 여부
  const viewerSubmissionDates = useMemo(
    () => new Set(viewerSubmissions.map(s => s.submissionDate)),
    [viewerSubmissions]
  );
  const viewerHasSubmittedToday = viewerSubmissionDates.has(todayDate);
  const preferredMatchingDate = viewerHasSubmittedToday ? todayDate : undefined;

  // 누적 인증 횟수
  const totalSubmissionCount = viewerSubmissions.length;
  const isFirstTimeUser = totalSubmissionCount === 0;

  // 클러스터 매칭 데이터 조회
  const clusterMatching = useMemo(() => {
    if (!cohort?.dailyFeaturedParticipants || !currentUserId) {
      return null;
    }

    return findLatestClusterMatching(
      cohort.dailyFeaturedParticipants,
      currentUserId,
      preferredMatchingDate
    );
  }, [cohort?.dailyFeaturedParticipants, currentUserId, preferredMatchingDate]);

  // 비인증 시 표시할 프로필 개수
  const unlockedProfileCount = isFirstTimeUser ? 0 : isLocked ? 1 : clusterMatching?.assignedIds.length || 0;

  // 표시할 프로필 IDs - 모든 클러스터 멤버 표시
  const visibleProfileIds = useMemo(() => {
    if (!clusterMatching) return [];
    return clusterMatching.assignedIds;
  }, [clusterMatching]);

  // 클러스터 멤버 정보 + 인증 데이터 가져오기
  const { data: clusterMembers = [], isLoading: membersLoading } = useQuery<Participant[]>({
    queryKey: ['cluster-members-v3', clusterMatching?.clusterId, clusterMatching?.matchingDate],
    queryFn: async () => {
      if (!visibleProfileIds.length) return [];

      const db = getDb();
      const participantsRef = collection(db, 'participants');

      // Firestore 'in' 쿼리 제한 (최대 10개) → 청크로 나눠서 조회
      const chunks: Participant[] = [];
      for (let i = 0; i < visibleProfileIds.length; i += 10) {
        const chunk = visibleProfileIds.slice(i, i + 10);
        const q = query(participantsRef, where('__name__', 'in', chunk));
        const snapshot = await getDocs(q);
        chunks.push(...snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Participant[]);
      }

      // 원형 이미지 처리
      return chunks.map(p => {
        const inferCircleUrl = (url?: string) => {
          if (!url) return undefined;
          const [base, query] = url.split('?');
          if (!base.includes('_full')) return undefined;
          const circleBase = base.replace('_full', '_circle');
          return query ? `${circleBase}?${query}` : circleBase;
        };

        const circleImage = p.profileImageCircle || inferCircleUrl(p.profileImage);

        return {
          ...p,
          profileImage: circleImage || p.profileImage,
          profileImageCircle: circleImage,
        };
      });
    },
    enabled: visibleProfileIds.length > 0 && !!clusterMatching,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // 클러스터 멤버들의 인증 데이터 가져오기
  const { data: submissionsMap = {}, isLoading: submissionsLoading } = useClusterSubmissions(
    visibleProfileIds,
    clusterMatching?.matchingDate || '',
    !!clusterMatching?.matchingDate
  );

  // 멤버 + 인증 데이터 결합 (내 프로필을 맨 앞으로 정렬)
  const clusterMembersWithSubmissions = useMemo<ClusterMemberWithSubmission[]>(() => {
    const members = clusterMembers.map(member => {
      const submission = submissionsMap[member.id];
      const isMe = member.id === currentUserId;

      return {
        ...member,
        name: isMe ? `${member.name} (나)` : member.name, // 이름에 (나) 표시
        submission,
        review: submission?.review || '',
        dailyAnswer: submission?.dailyAnswer || '',
        dailyQuestion: submission?.dailyQuestion || '',
        bookCoverUrl: submission?.bookCoverUrl,
        bookImageUrl: submission?.bookImageUrl,
      };
    });

    // 내 프로필을 맨 앞으로, 나머지는 이름순(또는 기본순)
    return members.sort((a, b) => {
      if (a.id === currentUserId) return -1;
      if (b.id === currentUserId) return 1;
      return 0;
    });
  }, [clusterMembers, submissionsMap, currentUserId]);

  // 가치관 질문 (첫 번째 멤버의 질문 사용, 모두 같음)
  // 첫 번째 멤버(나)가 인증을 안했을 수 있으므로, 전체 멤버 중 dailyQuestion이 있는 것을 찾음
  const dailyQuestion = clusterMembersWithSubmissions.find(m => m.dailyQuestion)?.dailyQuestion || '';

  // 답변 확장 상태 관리
  const [expandedAnswers, setExpandedAnswers] = useState<Set<string>>(new Set());

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
        toast({
          title: '로그인이 필요합니다',
          description: '접근 코드를 입력해주세요'
        });
        router.replace('/app');
        return;
      }
      if (!cohortId || (cohortId && !cohort)) {
        toast({
          title: '잘못된 접근입니다',
          description: '올바른 접근 코드로 다시 입장해주세요'
        });
        router.replace('/app');
        return;
      }
    }
  }, [sessionLoading, cohortLoading, participant, cohortId, cohort, router, toast]);

  // 프로필북 도착 알림 제거
  useEffect(() => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CLEAR_NOTIFICATIONS_BY_TYPE',
        notificationType: 'matching'
      });
    }
  }, []);

  // 프로필 클릭 핸들러
  const handleProfileClick = (participantId: string) => {
    const isMe = participantId === currentUserId;

    if (isLocked && !isSuperAdmin && !isMe) {
      showLockedToast('profile');
      return;
    }

    if (!clusterMatching?.matchingDate) {
      toast({
        title: '프로필북 정보를 불러올 수 없습니다',
        description: '잠시 후 다시 시도해주세요'
      });
      return;
    }

    const profileUrl = `${appRoutes.profile(participantId, cohortId!)}&matchingDate=${encodeURIComponent(clusterMatching.matchingDate)}`;
    router.push(profileUrl);
  };

  // 리뷰 클릭 핸들러
  const handleReviewClick = (participantId: string) => {
    const isMe = participantId === currentUserId;

    if (isLocked && !isSuperAdmin && !isMe) {
      showLockedToast('review');
      return;
    }

    // 본인인데 미인증 상태라면 (리뷰가 없음)
    if (isMe && isLocked && !isSuperAdmin) {
      toast({
        title: '작성된 감상평이 없습니다',
        description: '오늘의 독서를 인증해주세요'
      });
      return;
    }

    router.push(`/app/chat/today-library/review/${participantId}?date=${clusterMatching?.matchingDate}&cohort=${cohortId}`);
  };

  // 로딩 상태
  if (sessionLoading || cohortLoading || viewerSubmissionLoading || membersLoading || submissionsLoading) {
    return <LoadingSkeleton />;
  }

  // 세션 검증 실패
  if (!participant || !cohort || !cohortId) {
    return null;
  }

  // ========================================
  // 1단계: 최초 인증자 (누적 0회)
  // ========================================
  if (isFirstTimeUser) {
    return (
      <PageTransition>
        <div className="app-shell flex flex-col overflow-hidden">
          <TopBar title="오늘의 서재" onBack={() => router.back()} align="left" />

          <main className="app-main-content flex flex-1 overflow-y-auto items-center justify-center bg-background">
            <div className="mx-auto max-w-md px-6">
              <div className="text-center space-y-6">
                {/* Icon */}
                <div className="flex justify-center">
                  <div className="size-20 rounded-full bg-gray-100 flex items-center justify-center">
                    <svg className="size-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>

                {/* Message */}
                <div className="space-y-3">
                  <h3 className="font-bold text-lg text-gray-900">
                    첫 인증을 완료했어요! 🎉
                  </h3>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 leading-relaxed">
                      독서모임 테이블은 <strong className="text-gray-900">인증 다음날 오후 2시</strong>부터
                      <br />
                      열어볼 수 있어요
                    </p>
                    <p className="text-xs text-gray-500">
                      매일 AI가 비슷한 생각을 한 멤버들을 연결해드립니다
                    </p>
                  </div>
                </div>

                {/* CTA */}
                <button
                  type="button"
                  onClick={() => router.push(appRoutes.profile(currentUserId || '', cohortId))}
                  className="bg-black text-white rounded-lg px-6 py-3 font-semibold text-base transition-colors hover:bg-gray-800 active:bg-gray-900"
                >
                  내 프로필 북 보기
                </button>
              </div>
            </div>
          </main>
        </div>
      </PageTransition>
    );
  }

  // ========================================
  // 2단계: 클러스터 매칭 데이터 없음
  // ========================================
  if (!clusterMatching) {
    return (
      <PageTransition>
        <div className="app-shell flex flex-col overflow-hidden">
          <TopBar title="오늘의 서재" onBack={() => router.back()} align="left" />

          <main className="app-main-content flex flex-1 overflow-y-auto items-center justify-center bg-background">
            <div className="mx-auto max-w-md px-6">
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <div className="size-20 rounded-full bg-gray-100 flex items-center justify-center">
                    <svg className="size-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-bold text-lg text-gray-900">
                    아직 준비중이에요
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    매일 오후 2시에 새로운 독서모임이 시작됩니다
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => router.push(appRoutes.profile(currentUserId || '', cohortId))}
                  className="bg-black text-white rounded-lg px-6 py-3 font-semibold text-base transition-colors hover:bg-gray-800 active:bg-gray-900"
                >
                  내 프로필 북 보기
                </button>
              </div>
            </div>
          </main>
        </div>
      </PageTransition>
    );
  }

  // ========================================
  // 3단계: 온라인 독서모임 테이블
  // ========================================

  const { cluster, assignedIds } = clusterMatching;
  const totalCount = assignedIds.length;
  const lockedCount = Math.max(totalCount - unlockedProfileCount, 0);

  return (
    <PageTransition>
      <div className="app-shell flex flex-col overflow-hidden bg-[#F7F8FA]">
        <TopBar title="오늘의 서재" onBack={() => router.back()} align="left" />

        <main className="app-main-content flex-1 overflow-y-auto">
          {/* 1. 클러스터 헤더 (배경색 위) */}
          <div className="px-6 pb-8 pt-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm">
              <span className="text-3xl">{cluster.emoji}</span>
            </div>
            <h1 className="text-[24px] font-bold text-[#31363e] mb-2 break-keep leading-tight">
              {cluster.theme}
            </h1>
            <p className="text-[14px] text-[#8f98a3] leading-relaxed px-2 mb-4 break-keep">
              {cluster.reasoning}
            </p>

            {/* 클러스터 멤버 프로필 이미지 */}
            <div className="flex items-center justify-center gap-2 mt-4">
              {clusterMembers.map(member => (
                <div
                  key={member.id}
                  className="relative h-10 w-10 overflow-hidden rounded-full border-2 border-white shadow-sm bg-white cursor-pointer"
                  onClick={() => handleProfileClick(member.id)}
                >
                  <Image
                    src={getResizedImageUrl(member.profileImageCircle || member.profileImage) || member.profileImage || '/image/default-profile.svg'}
                    alt={member.name}
                    fill
                    className="object-cover"
                    sizes="40px"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 2. 흰색 카드 컨테이너 (프로필북 스타일) */}
          <div className="bg-white rounded-t-[32px] min-h-full px-6 pt-8 pb-12 shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">

            {/* 감상평 섹션 */}
            <section className="mb-10">
              <h2 className="text-[20px] font-bold text-[#31363e] mb-4">오늘의 감상평</h2>
              <div className="flex flex-col gap-3">
                {clusterMembersWithSubmissions.map(member => (
                  <ReviewPreviewCard
                    key={member.id}
                    participantId={member.id}
                    participantName={member.name}
                    profileImage={getResizedImageUrl(member.profileImageCircle || member.profileImage) || member.profileImage}
                    bookCoverUrl={member.bookCoverUrl}
                    bookTitle={member.submission?.bookTitle || ''}
                    bookAuthor={member.submission?.bookAuthor}
                    review={member.review || '감상평이 아직 작성되지 않았습니다.'}
                    onClick={() => handleReviewClick(member.id)}
                    onProfileClick={() => handleProfileClick(member.id)}
                    isMe={member.id === currentUserId}
                  />
                ))}
              </div>
            </section>

            {/* 가치관 질문 섹션 */}
            {dailyQuestion && (
              <section className="mb-4">
                <h2 className="text-[20px] font-bold text-[#31363e] mb-4">오늘의 가치관 질문</h2>

                {/* 질문 박스 */}
                <div className="mb-6 rounded-xl bg-[#F0F4FF] p-5 text-center">
                  <p className="text-[16px] font-medium leading-relaxed text-[#31363e]">
                    "{dailyQuestion}"
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  {clusterMembersWithSubmissions.map(member => (
                    <ValueAnswerAccordion
                      key={member.id}
                      participantId={member.id}
                      participantName={member.name}
                      profileImage={getResizedImageUrl(member.profileImageCircle || member.profileImage) || member.profileImage}
                      question={dailyQuestion}
                      answer={member.dailyAnswer || '답변이 아직 작성되지 않았습니다.'}
                      isExpanded={expandedAnswers.has(member.id)}
                      onToggle={() => toggleAnswer(member.id)}
                      onProfileClick={() => handleProfileClick(member.id)}
                      isMe={member.id === currentUserId}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        </main>

        {/* CTA: 오늘 인증 안한 경우 */}
        <TodayLibraryFooter
          viewerHasSubmittedToday={viewerHasSubmittedToday}
          cohortId={cohortId!}
        />
      </div>
    </PageTransition>
  );
}

function LoadingSkeleton() {
  const router = useRouter();
  return (
    <PageTransition>
      <div className="app-shell flex flex-col overflow-hidden">
        <TopBar title="오늘의 서재" onBack={() => router.back()} align="left" />
        <main className="app-main-content flex-1 overflow-y-auto bg-background">
          <div className="mx-auto max-w-md px-6 w-full pt-6 pb-6">
            <div className="flex flex-col gap-8">
              {/* 클러스터 헤더 스켈레톤 */}
              <div className="flex items-center gap-3">
                <div className="size-12 shimmer rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-6 w-40 shimmer rounded" />
                  <div className="h-4 w-60 shimmer rounded" />
                </div>
              </div>

              {/* 감상평 스켈레톤 */}
              <div className="space-y-4">
                <div className="h-6 w-32 shimmer rounded" />
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-24 shimmer rounded-lg" />
                  ))}
                </div>
              </div>

              {/* 가치관 답변 스켈레톤 */}
              <div className="space-y-4">
                <div className="h-6 w-40 shimmer rounded" />
                <div className="h-16 shimmer rounded-lg" />
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-20 shimmer rounded-lg" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </PageTransition>
  );
}

export default function TodayLibraryV3Page() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <TodayLibraryV3Content />
    </Suspense>
  );
}
