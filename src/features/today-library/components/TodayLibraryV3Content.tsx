'use client';

import { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import PageTransition from '@/components/PageTransition';
import TopBar from '@/components/TopBar';
import UnifiedButton from '@/components/UnifiedButton';
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
import type { Participant } from '@/types/database';
import { appRoutes } from '@/lib/navigation';
import { getSubmissionDate } from '@/lib/date-utils';
import { getResizedImageUrl } from '@/lib/image-utils';

import type { ClusterMemberWithSubmission } from '../types';
import { findLatestClusterMatching } from '../lib/utils';
import { LoadingSkeleton } from './LoadingSkeleton';
import { AccordionContent } from './AccordionContent';

/**
 * TodayLibraryV3Content - 클러스터 매칭 UI (New Design)
 */
export function TodayLibraryV3Content() {
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
  const { data: viewerSubmissions = [], isLoading: viewerSubmissionLoading } =
    useParticipantSubmissionsRealtime(currentUserId);

  // 오늘 인증 여부
  const viewerSubmissionDates = useMemo(
    () => new Set(viewerSubmissions.map((s) => s.submissionDate)),
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
        chunks.push(
          ...(snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Participant[])
        );
      }

      // 원형 이미지 처리
      return chunks.map((p) => {
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
    const members = clusterMembers.map((member) => {
      const submission = submissionsMap[member.id];
      const isMe = member.id === currentUserId;

      return {
        ...member,
        name: isMe ? '나' : member.name, // 본인은 '나'로 표시
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
  const dailyQuestion =
    clusterMembersWithSubmissions.find((m) => m.dailyQuestion)?.dailyQuestion || '';

  // 답변 확장 상태 관리
  const [expandedAnswers, setExpandedAnswers] = useState<Set<string>>(new Set());

  const toggleAnswer = (participantId: string) => {
    const isMe = participantId === currentUserId;

    if (isLocked && !isSuperAdmin && !isMe) {
      showLockedToast('answer');
      return;
    }

    setExpandedAnswers((prev) => {
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
          description: '접근 코드를 입력해주세요',
        });
        router.replace('/app');
        return;
      }
      if (!cohortId || (cohortId && !cohort)) {
        toast({
          title: '잘못된 접근입니다',
          description: '올바른 접근 코드로 다시 입장해주세요',
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
        notificationType: 'matching',
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
        description: '잠시 후 다시 시도해주세요',
      });
      return;
    }

    const profileUrl = `${appRoutes.profile(participantId, cohortId!)}&matchingDate=${encodeURIComponent(clusterMatching.matchingDate)}`;
    router.push(profileUrl);
  };

  // 리뷰 클릭 핸들러
  const handleReviewClick = (participantId: string) => {
    const isMe = participantId === currentUserId;

    // 미인증 사용자 접근 제한 (본인 제외) - isLocked로 통일
    if (isLocked && !isSuperAdmin && !isMe) {
      showLockedToast('review');
      return;
    }

    router.push(
      `/app/chat/today-library/review/${encodeURIComponent(participantId)}?date=${clusterMatching?.matchingDate}&cohort=${cohortId}`
    );
  };

  // 로딩 상태
  if (
    sessionLoading ||
    cohortLoading ||
    viewerSubmissionLoading ||
    membersLoading ||
    submissionsLoading
  ) {
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
                    <svg
                      className="size-10 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                </div>

                {/* Message */}
                <div className="space-y-3">
                  <h3 className="font-bold text-lg text-gray-900">첫 인증을 완료했어요! 🎉</h3>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 leading-relaxed">
                      독서모임 테이블은 <strong className="text-gray-900">인증 다음날 오전 2시</strong>
                      부터
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
                    <svg
                      className="size-10 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-bold text-lg text-gray-900">아직 준비중이에요</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    독서를 인증하면 내일 오전 2시에 독서모임이 시작돼요
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
  // 3단계: 온라인 독서모임 테이블 (V3 Design Refactor)
  // ========================================

  const { cluster } = clusterMatching;

  return (
    <PageTransition>
      <div className="app-shell flex flex-col overflow-hidden bg-[#F6F6F6]">
        {/* Custom Header using TopBar - Changed to bg-white as per feedback */}
        <TopBar
          title="오늘의 서재"
          onBack={() => router.back()}
          align="center"
          className="bg-white border-b-0"
        />

        <main
          className="app-main-content flex-1 overflow-y-auto overflow-x-hidden touch-pan-y"
          style={{ overscrollBehaviorX: 'none' }}
        >
          {/* 1. Theme Section (Top) */}
          <section className="flex flex-col items-center text-center gap-4 pt-8 pb-10 px-6 bg-[#F6F6F6]">
            <div className="w-20 h-20 rounded-full bg-white border border-gray-100 flex items-center justify-center shadow-sm text-[40px]">
              {cluster.emoji || '🥂'}
            </div>

            <div className="flex flex-col gap-2 max-w-full">
              <div className="bg-black text-white text-[12px] font-bold px-3 py-1 rounded-[12px] inline-block self-center">
                {cluster.category || '감상평'}
              </div>
              <h3 className="text-[18px] font-bold text-black">{cluster.theme}</h3>
              <p className="text-[14px] text-[#575E68] whitespace-pre-wrap leading-[1.4] break-words">
                {cluster.reasoning}
              </p>
            </div>

            {/* Horizontal Member List */}
            <div className="flex flex-wrap items-start justify-center gap-4 mt-2">
              {clusterMembersWithSubmissions.map((member) => (
                <div key={member.id} className="flex flex-col items-center gap-1.5">
                  <div
                    className="relative w-10 h-10 rounded-full overflow-hidden border border-gray-200 cursor-pointer"
                    onClick={() => handleProfileClick(member.id)}
                  >
                    <Image
                      src={
                        getResizedImageUrl(member.profileImageCircle || member.profileImage) ||
                        member.profileImage ||
                        '/image/default-profile.svg'
                      }
                      alt={member.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <span className="text-[11px] text-[#8B95A1]">{member.name}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Main Content Container (White) */}
          <div className="bg-white rounded-t-[24px] px-6 pt-8 pb-32 min-h-[calc(100vh-300px)]">
            {/* 2. Reviews Section */}
            <section className="mb-10">
              <h2 className="text-[18px] font-bold text-[#31363E] mb-4 leading-[1.4]">
                오늘의 감상평
              </h2>
              <div className="flex flex-col">
                {clusterMembersWithSubmissions.map((member) => (
                  <div
                    key={member.id}
                    className="flex gap-3 border-b border-[#F2F4F6] py-4 first:pt-0 items-start"
                  >
                    {/* Left: Avatar & Name */}
                    <div className="flex flex-col items-center gap-1 shrink-0 w-[40px]">
                      <div
                        className="relative w-10 h-10 rounded-full overflow-hidden border border-gray-100 cursor-pointer"
                        onClick={() => handleProfileClick(member.id)}
                      >
                        <Image
                          src={
                            getResizedImageUrl(member.profileImageCircle || member.profileImage) ||
                            member.profileImage ||
                            '/image/default-profile.svg'
                          }
                          alt={member.name}
                          fill
                          className="object-cover"
                          sizes="40px"
                        />
                      </div>
                      <span className="text-[11px] text-[#8B95A1] text-center w-full truncate">
                        {member.name}
                      </span>
                    </div>

                    {/* Right: Content */}
                    <div
                      className="flex-1 flex flex-col gap-1 cursor-pointer min-w-0"
                      onClick={() => handleReviewClick(member.id)}
                    >
                      {member.submission?.bookTitle && (
                        <div className="bg-[#F2F4F6] px-2 py-1 rounded-[4px] self-start max-w-full">
                          <h3 className="text-[12px] font-bold text-[#4E5968] truncate">
                            {member.submission.bookTitle}
                          </h3>
                        </div>
                      )}
                      <p className="text-[14px] text-[#333D4B] leading-[1.5] line-clamp-1 break-words">
                        {member.review || '작성된 감상평이 없습니다.'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 3. Values Section */}
            {dailyQuestion && (
              <section className="mb-10">
                <h2 className="text-[18px] font-bold text-[#31363E] mb-4 leading-[1.4]">
                  오늘의 가치관 답변
                </h2>

                {/* Question Card */}
                <div className="bg-[#F9FAFB] rounded-[16px] p-4 mb-4">
                  <div className="bg-black rounded-[12px] px-3 py-1.5 inline-block mb-3">
                    <span className="text-white text-[12px] font-bold">가치관</span>
                  </div>
                  <h2 className="text-[15px] font-medium text-[#333D4B] leading-[1.5]">
                    {dailyQuestion}
                  </h2>
                </div>

                {/* Answer List */}
                <div className="flex flex-col">
                  {clusterMembersWithSubmissions.map((member) => {
                    const isExpanded = expandedAnswers.has(member.id);
                    const answerLength = member.dailyAnswer ? member.dailyAnswer.length : 0;

                    return (
                      <div
                        key={member.id}
                        className="flex gap-3 border-b border-[#F2F4F6] py-4 first:pt-0 items-start"
                      >
                        {/* Left: Avatar & Name */}
                        <div className="flex flex-col items-center gap-1 shrink-0 w-[40px]">
                          <div
                            className="relative w-10 h-10 rounded-full overflow-hidden border border-gray-100 cursor-pointer"
                            onClick={() => handleProfileClick(member.id)}
                          >
                            <Image
                              src={
                                getResizedImageUrl(
                                  member.profileImageCircle || member.profileImage
                                ) ||
                                member.profileImage ||
                                '/image/default-profile.svg'
                              }
                              alt={member.name}
                              fill
                              className="object-cover"
                              sizes="40px"
                            />
                          </div>
                          <span className="text-[11px] text-[#8B95A1] text-center w-full truncate">
                            {member.name}
                          </span>
                        </div>

                        {/* Right: Content */}
                        <div
                          className="flex-1 flex flex-col gap-1 cursor-pointer"
                          onClick={() => toggleAnswer(member.id)}
                        >
                          {/* Character Count */}
                          <span className="text-[12px] text-[#8B95A1]">[{answerLength}자]</span>

                          {/* Text + Chevron Row */}
                          <AccordionContent text={member.dailyAnswer} isExpanded={isExpanded} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        </main>

        {/* Fixed Footer Button */}
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t border-[#F2F2F2] z-50 safe-area-bottom">
          <UnifiedButton
            fullWidth
            onClick={() => router.push(appRoutes.profile(currentUserId || '', cohortId))}
          >
            내 프로필 북 보기
          </UnifiedButton>
        </div>
        <style jsx>{`
          .safe-area-bottom {
            padding-bottom: calc(24px + env(safe-area-inset-bottom));
          }
        `}</style>
      </div>
    </PageTransition>
  );
}
