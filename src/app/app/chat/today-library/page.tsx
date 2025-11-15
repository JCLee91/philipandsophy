'use client';

/**
 * 오늘의 서재 v3.0 - 클러스터 매칭
 *
 * 매일 AI가 생성하는 클러스터 기반 매칭 시스템
 * - 오직 감상평 + 가치관 답변만 분석 (책 제목 무시)
 * - 클러스터 크기: 5-7명 (본인 포함)
 * - 클러스터 내 전원 매칭 (본인 제외 4-6개 프로필북)
 *
 * @version 3.0.0
 * @date 2025-11-15
 */

import { Suspense, useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PageTransition from '@/components/PageTransition';
import BookmarkCard from '@/components/BookmarkCard';
import HeaderNavigation from '@/components/HeaderNavigation';
import FooterActions from '@/components/FooterActions';
import BlurDivider from '@/components/BlurDivider';
import UnifiedButton from '@/components/UnifiedButton';
import { useCohort } from '@/hooks/use-cohorts';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useAccessControl } from '@/hooks/use-access-control';
import { useParticipantSubmissionsRealtime } from '@/hooks/use-submissions';
import { getDb } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useQuery } from '@tanstack/react-query';
import type { Participant, Cluster } from '@/types/database';
import { appRoutes } from '@/lib/navigation';
import { getSubmissionDate } from '@/lib/date-utils';
import { getResizedImageUrl } from '@/lib/image-utils';

// ✅ Disable static generation
export const dynamic = 'force-dynamic';

type ClusterParticipant = Participant & {
  theme: 'similar' | 'opposite';
};

/**
 * 클러스터 매칭 데이터 조회
 */
interface ClusterMatchingData {
  clusterId: string;
  cluster: Cluster;
  assignedIds: string[]; // 본인 제외한 클러스터 멤버 IDs
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

  const todayDate = getSubmissionDate();
  const { data: viewerSubmissions = [], isLoading: viewerSubmissionLoading } = useParticipantSubmissionsRealtime(currentUserId);

  // 오늘 인증 여부
  const viewerSubmissionDates = useMemo(
    () => new Set(viewerSubmissions.map(s => s.submissionDate)),
    [viewerSubmissions]
  );
  const viewerHasSubmittedToday = viewerSubmissionDates.has(todayDate);
  const preferredMatchingDate = viewerHasSubmittedToday ? todayDate : undefined;

  // 누적 인증 횟수 (v3.0에서는 최초 인증자 판단용으로만 사용)
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
  // - 최초 인증자: 0개 (메시지만 표시)
  // - 기존 인증자: 1개 (궁금증 유발)
  const unlockedProfileCount = isFirstTimeUser ? 0 : isLocked ? 1 : clusterMatching?.assignedIds.length || 0;

  // 표시할 프로필 IDs
  const visibleProfileIds = useMemo(() => {
    if (!clusterMatching) return [];
    if (isLocked && !isSuperAdmin) {
      return clusterMatching.assignedIds.slice(0, unlockedProfileCount);
    }
    return clusterMatching.assignedIds;
  }, [clusterMatching, isLocked, isSuperAdmin, unlockedProfileCount]);

  // 클러스터 멤버 정보 가져오기
  const { data: clusterMembers = [], isLoading: membersLoading } = useQuery<ClusterParticipant[]>({
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

      // 원형 이미지 처리 및 theme 추가
      return chunks.map(p => {
        const inferCircleUrl = (url?: string) => {
          if (!url) return undefined;
          const [base, query] = url.split('?');
          if (!base.includes('_full')) return undefined;
          const circleBase = base.replace('_full', '_circle');
          return query ? `${circleBase}?${query}` : circleBase;
        };

        const circleImage = p.profileImageCircle || inferCircleUrl(p.profileImage);
        const derivedTheme = p.gender === 'female' ? 'opposite' : 'similar';

        return {
          ...p,
          profileImage: circleImage || p.profileImage,
          profileImageCircle: circleImage,
          theme: derivedTheme
        };
      });
    },
    enabled: visibleProfileIds.length > 0 && !!clusterMatching,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

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
  const handleProfileClick = (participantId: string, theme: 'similar' | 'opposite') => {
    if (isLocked && !isSuperAdmin) {
      const totalProfiles = clusterMatching?.assignedIds.length || 0;
      const lockedCount = totalProfiles - unlockedProfileCount;

      toast({
        title: '프로필 잠김 🔒',
        description: `오늘의 독서를 인증하면 추가로 ${lockedCount}개의 프로필북을 볼 수 있어요`
      });
      return;
    }

    if (!clusterMatching?.matchingDate) {
      toast({
        title: '프로필북 정보를 불러올 수 없습니다',
        description: '잠시 후 다시 시도해주세요'
      });
      return;
    }

    const profileUrl = `${appRoutes.profile(participantId, cohortId!, theme)}&matchingDate=${encodeURIComponent(clusterMatching.matchingDate)}`;
    router.push(profileUrl);
  };

  // 로딩 상태
  if (sessionLoading || cohortLoading || viewerSubmissionLoading || membersLoading) {
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
          <HeaderNavigation title="오늘의 서재" />

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
                      프로필 북은 <strong className="text-gray-900">인증 다음날 오후 2시</strong>부터
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
          <HeaderNavigation title="오늘의 서재" />

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
                    매일 오후 2시에 새로운 프로필북이 도착합니다
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
  // 3단계: 클러스터 프로필북 표시
  // ========================================

  const { cluster, assignedIds } = clusterMatching;
  const totalCount = assignedIds.length;
  const lockedCount = Math.max(totalCount - unlockedProfileCount, 0);

  // 성별로 분류
  const maleMembers = clusterMembers.filter(p => !p.gender || p.gender === 'male');
  const femaleMembers = clusterMembers.filter(p => p.gender === 'female');

  return (
    <PageTransition>
      <div className="app-shell flex flex-col overflow-hidden">
        <HeaderNavigation title="오늘의 서재" />

        <main className="app-main-content flex-1 overflow-y-auto bg-background">
          <div className="mx-auto max-w-md px-6 w-full pt-3 md:pt-2 pb-6">
            <div className="flex flex-col gap-6">
              {/* 클러스터 배지 */}
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-2xl">{cluster.emoji}</span>
                <div className="flex-1">
                  <div className="font-bold text-sm text-gray-900">{cluster.name}</div>
                  <div className="text-xs text-gray-600 mt-0.5">{cluster.theme}</div>
                </div>
              </div>

              {/* 헤더 */}
              <div className="flex flex-col gap-3">
                <h1 className="font-bold text-heading-xl text-black">
                  {isLocked && !isSuperAdmin
                    ? <>프로필 북을<br />조금 열어봤어요</>
                    : <>오늘 당신과<br />연결된 사람들</>
                  }
                </h1>
                <p className="font-medium text-body-base text-text-secondary">
                  {isLocked && !isSuperAdmin
                    ? `오늘 인증하면 ${totalCount}개의 프로필북을 모두 열어볼 수 있어요`
                    : `비슷한 생각을 한 ${totalCount}명과 연결했어요`
                  }
                </p>
              </div>

              {/* 프로필북 개수 표시 */}
              {isLocked && !isSuperAdmin && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="font-semibold text-black">{totalCount}개의 프로필북</span>
                  <span>•</span>
                  <span>{unlockedProfileCount}개 열람 가능</span>
                </div>
              )}

              {/* 프로필 카드 */}
              <div className="grid grid-cols-2 gap-6">
                {/* 왼쪽: 남자 */}
                <div className="flex flex-col gap-4">
                  {maleMembers.map((p, index) => (
                    <div key={p.id} className="flex flex-col">
                      <div className="flex justify-center">
                        <BookmarkCard
                          profileImage={getResizedImageUrl(p.profileImageCircle || p.profileImage) || p.profileImage || '/image/default-profile.svg'}
                          name={p.name}
                          theme="blue"
                          isLocked={false}
                          onClick={() => handleProfileClick(p.id, 'similar')}
                        />
                      </div>
                      {index < maleMembers.length - 1 && <BlurDivider />}
                    </div>
                  ))}

                  {/* 자물쇠 카드 (남자) */}
                  {isLocked && !isSuperAdmin && lockedCount > 0 && maleMembers.length === 0 && (
                    <div className="flex flex-col">
                      <div className="flex justify-center">
                        <BookmarkCard
                          profileImage=""
                          name=""
                          theme="blue"
                          isLocked={true}
                          onClick={() => handleProfileClick('', 'similar')}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 오른쪽: 여자 */}
                <div className="flex flex-col gap-4">
                  {femaleMembers.map((p, index) => (
                    <div key={p.id} className="flex flex-col">
                      <div className="flex justify-center">
                        <BookmarkCard
                          profileImage={getResizedImageUrl(p.profileImageCircle || p.profileImage) || p.profileImage || '/image/default-profile.svg'}
                          name={p.name}
                          theme="yellow"
                          isLocked={false}
                          onClick={() => handleProfileClick(p.id, 'opposite')}
                        />
                      </div>
                      {index < femaleMembers.length - 1 && <BlurDivider />}
                    </div>
                  ))}

                  {/* 자물쇠 카드 (여자) */}
                  {isLocked && !isSuperAdmin && lockedCount > 0 && femaleMembers.length === 0 && (
                    <div className="flex flex-col">
                      <div className="flex justify-center">
                        <BookmarkCard
                          profileImage=""
                          name=""
                          theme="yellow"
                          isLocked={true}
                          onClick={() => handleProfileClick('', 'opposite')}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>

        <FooterActions>
          <UnifiedButton
            variant="primary"
            onClick={() => router.push(appRoutes.profile(currentUserId || '', cohortId))}
            className="w-full"
          >
            내 프로필 북 보기
          </UnifiedButton>
        </FooterActions>
      </div>
    </PageTransition>
  );
}

function LoadingSkeleton() {
  return (
    <PageTransition>
      <div className="app-shell flex flex-col overflow-hidden">
        <HeaderNavigation title="오늘의 서재" />
        <main className="app-main-content flex-1 overflow-y-auto bg-background">
          <div className="mx-auto max-w-md px-6 w-full pt-3 pb-6">
            <div className="flex flex-col gap-6">
              {/* 클러스터 배지 스켈레톤 */}
              <div className="h-20 shimmer rounded-lg" />

              {/* 헤더 스켈레톤 */}
              <div className="flex flex-col gap-3">
                <div className="h-8 w-48 shimmer rounded" />
                <div className="h-6 w-40 shimmer rounded" />
              </div>

              {/* 프로필 카드 스켈레톤 */}
              <div className="grid grid-cols-2 gap-6">
                <div className="flex flex-col gap-4">
                  <div className="h-32 shimmer rounded-lg" />
                  <div className="h-32 shimmer rounded-lg" />
                </div>
                <div className="flex flex-col gap-4">
                  <div className="h-32 shimmer rounded-lg" />
                  <div className="h-32 shimmer rounded-lg" />
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
