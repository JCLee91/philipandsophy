'use client';

import { Suspense, useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import PageTransition from '@/components/PageTransition';
import TopBar from '@/components/TopBar';
import FooterActions from '@/components/FooterActions';
import TodayLibraryFooter from '@/components/TodayLibraryFooter';
import BookmarkRow from '@/components/BookmarkRow';
import BookmarkCard from '@/components/BookmarkCard';
import BlurDivider from '@/components/BlurDivider';
import UnifiedButton from '@/components/UnifiedButton';
import { useCohort } from '@/hooks/use-cohorts';
import { useToast } from '@/hooks/use-toast';
import { useLockedToast } from '@/hooks/use-locked-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useAccessControl } from '@/hooks/use-access-control';
import { useProfileBookAccess, isProfileBookLocked } from '@/hooks/use-profile-book-access';
import { useParticipantSubmissionsRealtime } from '@/hooks/use-submissions';
import { useClusterSubmissions } from '@/hooks/use-cluster-submissions';
import { getDb } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useQuery } from '@tanstack/react-query';
import type { Participant, Cluster, ReadingSubmission } from '@/types/database';
import { appRoutes } from '@/lib/navigation';
import { getFirstName } from '@/lib/utils';
import { getSubmissionDate, canViewAllProfiles, canViewAllProfilesWithoutAuth, shouldShowAllYesterdayVerified, isMatchingInProgress } from '@/lib/date-utils';
import { getResizedImageUrl } from '@/lib/image-utils';
import { Lock, Heart, ChevronLeft, ChevronDown, ChevronRight } from 'lucide-react';
import { findLatestMatchingForParticipant, findLatestClusterMatching, ClusterMatchingData } from '@/lib/matching-utils';
import { getAssignedProfiles, detectMatchingVersion } from '@/lib/matching-compat';
import { useYesterdayVerifiedParticipants } from '@/hooks/use-yesterday-verified-participants';

// ✅ Disable static generation - requires runtime data
export const dynamic = 'force-dynamic';

// ============================================================================
// Types
// ============================================================================

type FeaturedParticipant = Participant & { theme: 'similar' | 'opposite' };

type ClusterMemberWithSubmission = Participant & {
  submission?: ReadingSubmission;
  review: string;
  dailyAnswer: string;
  dailyQuestion: string;
  bookCoverUrl?: string;
  bookImageUrl?: string;
};

// ============================================================================
// Legacy Header Component (for V2 Compatibility)
// ============================================================================

interface LegacyHeaderProps {
  title: string;
  showBackButton?: boolean;
  onBackClick?: () => void;
}

function LegacyHeader({
  title,
  showBackButton = true,
  onBackClick,
}: LegacyHeaderProps) {
  const router = useRouter();

  const handleBackClick = () => {
    if (onBackClick) {
      onBackClick();
    } else {
      router.back();
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 border-b bg-white safe-area-header">
      <div className="flex gap-3 items-center px-4 h-14">
        {showBackButton ? (
          <button
            onClick={handleBackClick}
            className="shrink-0 size-6 overflow-hidden"
            aria-label="뒤로가기"
          >
            <Image
              src="/icons/arrow-back.svg"
              alt=""
              width={24}
              height={24}
            />
          </button>
        ) : (
          <div className="shrink-0 size-6" aria-hidden="true" />
        )}

        <h1 className="flex-1 font-semibold text-lg leading-[1.4] text-black" style={{ letterSpacing: '-0.18px' }}>
          {title}
        </h1>

        <div className="shrink-0 size-6" aria-hidden="true">
          {/* Placeholder for right action */}
        </div>
      </div>
      <style jsx>{`
        .safe-area-header {
          padding-top: env(safe-area-inset-top);
        }

        /* iOS 11.2 이전 버전 호환성 */
        @supports (padding-top: constant(safe-area-inset-top)) {
          .safe-area-header {
            padding-top: constant(safe-area-inset-top);
          }
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * 특정 clusterId로 클러스터 정보 찾기 (다른 모임 구경가기용)
 */
function findClusterById(
  dailyFeaturedParticipants: Record<string, any>,
  targetClusterId: string,
  preferredDate?: string
): ClusterMatchingData | null {
  const dates = Object.keys(dailyFeaturedParticipants).sort().reverse();

  // 1차: preferredDate 우선
  if (preferredDate && dailyFeaturedParticipants[preferredDate]) {
    const dayData = dailyFeaturedParticipants[preferredDate];
    if (dayData.matchingVersion === 'cluster' && dayData.clusters?.[targetClusterId]) {
      const cluster = dayData.clusters[targetClusterId];
      return {
        clusterId: targetClusterId,
        cluster,
        assignedIds: cluster.memberIds || [],
        matchingDate: preferredDate
      };
    }
  }

  // 2차: 가장 최근 클러스터 매칭에서 찾기
  for (const date of dates) {
    const dayData = dailyFeaturedParticipants[date];
    if (dayData.matchingVersion === 'cluster' && dayData.clusters?.[targetClusterId]) {
      const cluster = dayData.clusters[targetClusterId];
      return {
        clusterId: targetClusterId,
        cluster,
        assignedIds: cluster.memberIds || [],
        matchingDate: date
      };
    }
  }

  return null;
}

// ============================================================================
// V2 Content (Legacy UI)
// ============================================================================

function TodayLibraryV2Content() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cohortId = searchParams.get('cohort');

  // Firebase Auth 기반 인증
  const { participant, isLoading: sessionLoading } = useAuth();
  const currentUserId = participant?.id;
  const { isSuperAdmin, isLocked } = useAccessControl();

  // v2.0: 프로필북 접근 제어 (누적 인증 기반, 해당 기수만)
  const profileBookAccess = useProfileBookAccess(cohortId || undefined);

  const { data: cohort, isLoading: cohortLoading } = useCohort(cohortId || undefined);
  const { toast } = useToast();
  // ✅ FIX: 새벽 2시 마감 정책 적용 (getSubmissionDate 사용)
  const todayDate = getSubmissionDate();
  const { data: viewerSubmissions = [], isLoading: viewerSubmissionLoading } = useParticipantSubmissionsRealtime(currentUserId);
  const viewerSubmissionDates = useMemo(
    () => new Set(viewerSubmissions.map((submission) => submission.submissionDate)),
    [viewerSubmissions]
  );
  const viewerHasSubmittedToday = viewerSubmissionDates.has(todayDate);
  const preferredMatchingDate = viewerHasSubmittedToday ? todayDate : undefined;

  const matchingLookupWithinAccess = useMemo(() => {
    if (!cohort?.dailyFeaturedParticipants || !currentUserId) {
      return null;
    }

    // 랜덤 매칭: allowedDates 제약 없음 (인증 여부와 무관하게 접근 가능)
    return findLatestMatchingForParticipant(
      cohort.dailyFeaturedParticipants,
      currentUserId,
      { preferredDate: preferredMatchingDate }
    );
  }, [cohort?.dailyFeaturedParticipants, currentUserId, preferredMatchingDate]);

  const matchingLookup = useMemo(() => {
    if (matchingLookupWithinAccess) {
      return matchingLookupWithinAccess;
    }

    if (!cohort?.dailyFeaturedParticipants || !currentUserId) {
      return null;
    }

    // 접근 허용 날짜 조건 없이 가장 최근 매칭을 fallback으로 노출
    return findLatestMatchingForParticipant(cohort.dailyFeaturedParticipants, currentUserId, {
      preferredDate: preferredMatchingDate,
    });
  }, [matchingLookupWithinAccess, cohort?.dailyFeaturedParticipants, currentUserId, preferredMatchingDate]);

  const activeMatchingDate = matchingLookup?.date ?? null;
  const assignments = matchingLookup?.matching.assignments ?? {};
  const matchingVersion = matchingLookup?.matching.matchingVersion;

  const userAssignment = currentUserId && assignments
    ? assignments[currentUserId] ?? null
    : null;

  // v2.0/v1.0 호환: assigned 우선, fallback으로 similar + opposite
  const assignedProfileIds = getAssignedProfiles(userAssignment);

  // v2.0 (랜덤 매칭) 여부 판단
  const isRandomMatching = matchingVersion === 'random';

  // v2.0 미인증 시: 성별 다양성 확보를 위한 스마트 샘플링
  // v2.0 인증 시: 전체 ID 다운로드
  // v1.0: similar + opposite (기존 로직)
  const allFeaturedIds = useMemo(() => {
    if (isRandomMatching) {
      // v2.0 랜덤 매칭
      if (isLocked && !isSuperAdmin) {
        // 미인증: 최대 20개까지만 (보안 + 성능 균형)
        return assignedProfileIds.slice(0, 20);
      }

      // 인증: 전체
      return assignedProfileIds;
    }

    // v1.0 AI 매칭 fallback
    return assignedProfileIds;
  }, [isRandomMatching, isLocked, isSuperAdmin, assignedProfileIds]);

  // 어제 인증한 참가자 목록 조회
  const { data: yesterdayVerifiedIds, isLoading: yesterdayVerifiedLoading } = useYesterdayVerifiedParticipants(cohortId || undefined);

  // Step 2-2: 마지막 날 체크
  // 슈퍼관리자는 1일차부터 항상 전체 프로필 볼 수 있음 (인증 불필요)
  const isFinalDay = cohort ? canViewAllProfiles(cohort) : false;
  const showAllProfilesWithoutAuth = cohort ? canViewAllProfilesWithoutAuth(cohort) : false;

  // profileUnlockDate 체크: 설정된 날짜 이상이면 어제 인증자 전체 공개 모드
  const isUnlockDayOrAfter = cohort ? shouldShowAllYesterdayVerified(cohort) : false;
  const isProfileUnlockMode = isUnlockDayOrAfter && !isFinalDay;

  // 새로운 규칙:
  // 1. 슈퍼관리자 OR 마지막 날 OR 프로그램 종료 후 → 전체 공개
  // 2. profileUnlockDate 이상 + 어제 인증자 존재 → 어제 인증자 전체 공개 (인증 여부는 렌더링 단계에서 처리)
  const showAllProfiles = isSuperAdmin || isFinalDay || showAllProfilesWithoutAuth || (isProfileUnlockMode && yesterdayVerifiedIds && yesterdayVerifiedIds.size > 0);

  // 추천 참가자들의 정보 가져오기
  // 마지막 날이면 전체 참가자 쿼리, 아니면 매칭된 4명만
  const yesterdayIdsArray = yesterdayVerifiedIds ? Array.from(yesterdayVerifiedIds).sort() : [];
  const yesterdayIdsKey = yesterdayIdsArray.join(',');

  const { data: featuredParticipants = [], isLoading: participantsLoading } = useQuery<FeaturedParticipant[]>({
    queryKey: showAllProfiles
      ? ['all-participants-final-day', cohortId, currentUserId, todayDate, yesterdayIdsKey]
      : ['featured-participants-v3', activeMatchingDate, allFeaturedIds],
    queryFn: async () => {
      const db = getDb();
      const participantsRef = collection(db, 'participants');

      let participants: Participant[] = [];

      if (showAllProfiles) {
        // 어제 인증자 전체 또는 마지막 날 전체 참가자 로드
        if (isFinalDay || isSuperAdmin || showAllProfilesWithoutAuth) {
          // 마지막 날 또는 슈퍼관리자 또는 프로그램 종료 후: 전체 참가자
          const q = query(participantsRef, where('cohortId', '==', cohortId));
          const allSnapshot = await getDocs(q);
          participants = allSnapshot.docs
            .map((doc) => ({
              id: doc.id,
              ...doc.data(),
            })) as Participant[];

          // 본인과 슈퍼관리자, 일반 관리자, 고스트 제외
          participants = participants.filter(
            (p) => p.id !== currentUserId && !p.isSuperAdmin && !p.isAdministrator && !p.isGhost
          );
        } else {
          // 평소: 어제 인증한 사람들만 (본인 제외)
          const yesterdayIds = Array.from(yesterdayVerifiedIds || []).filter(id => id !== currentUserId);

          if (yesterdayIds.length === 0) return [];

          // Firestore 'in' 쿼리는 최대 10개 제한 → 청크로 나눠서 조회
          const chunks: Participant[] = [];
          for (let i = 0; i < yesterdayIds.length; i += 10) {
            const chunk = yesterdayIds.slice(i, i + 10);
            const q = query(participantsRef, where('__name__', 'in', chunk));
            const snapshot = await getDocs(q);
            chunks.push(...snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            })) as Participant[]);
          }
          // 고스트 참가자 제외
          participants = chunks.filter(p => !p.isGhost);
        }
      } else {
        // 평소 - 매칭된 프로필북
        if (allFeaturedIds.length === 0) return [];

        // Firestore 'in' 쿼리는 최대 10개 제한 → 청크로 나눠서 조회
        const chunks: Participant[] = [];
        for (let i = 0; i < allFeaturedIds.length; i += 10) {
          const chunk = allFeaturedIds.slice(i, i + 10);
          const q = query(participantsRef, where('__name__', 'in', chunk));
          const snapshot = await getDocs(q);
          chunks.push(...snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Participant[]);
        }
        participants = chunks;

        if (isRandomMatching) {
          const orderMap = new Map(allFeaturedIds.map((id, index) => [id, index]));
          participants.sort((a, b) => {
            const indexA = orderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER;
            const indexB = orderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER;
            return indexA - indexB;
          });
        }
      }

      // 각 참가자에 theme 정보 추가 (원형 이미지 처리 포함)
      return participants.map((participant) => {
        const inferCircleUrl = (url?: string) => {
          if (!url) return undefined;
          const [base, query] = url.split('?');
          if (!base.includes('_full')) return undefined;
          const circleBase = base.replace('_full', '_circle');
          return query ? `${circleBase}?${query}` : circleBase;
        };

        const circleImage = participant.profileImageCircle || inferCircleUrl(participant.profileImage);

        // ⚠️ 중요: BookmarkCard는 profileImage prop을 사용하므로,
        // profileImage 필드 자체를 원형 이미지로 덮어써야 함
        // v2.0: 랜덤 매칭에서는 theme 구분 없음 (성별 기반으로만)
        const derivedTheme = participant.gender === 'female' ? 'opposite' : 'similar';

        return {
          ...participant,
          profileImage: circleImage || participant.profileImage, // 원형 이미지로 교체
          profileImageCircle: circleImage,
          theme: derivedTheme,
        };
      });
    },
    // v2.0: 미인증 상태에서도 프로필북 목록 로드 (랜덤 2개 표시용)
    // 인증 여부는 렌더링 단계에서 처리 (일부만 표시 vs 전체 표시)
    enabled: showAllProfiles
      ? !!cohort && !!currentUserId && !yesterdayVerifiedLoading
      : allFeaturedIds.length > 0 && !!activeMatchingDate,
    staleTime: 60 * 1000, // 1분 캐시 (세션 중 재요청 최소화)
    gcTime: 5 * 60 * 1000, // 5분 가비지 컬렉션
    placeholderData: (previousData) => previousData, // 이전 데이터 유지 (빈 화면 방지)
  });

  // 세션 및 cohort 검증
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
      if (!cohortId) {
        toast({
          title: '잘못된 접근입니다',
          description: '올바른 기수 정보가 필요합니다',
        });
        router.replace('/app');
        return;
      }
      // cohortId는 있지만 cohort 데이터가 없는 경우 (잘못된 기수 ID)
      if (cohortId && !cohort) {
        toast({
          title: '존재하지 않는 기수입니다',
          description: '올바른 접근 코드로 다시 입장해주세요',
        });
        router.replace('/app');
        return;
      }
    }
  }, [sessionLoading, cohortLoading, participant, cohortId, cohort, router, toast]);

  // ✅ 페이지 진입 시 matching 타입 알림 제거 (프로필북 도착 알림센터 정리)
  useEffect(() => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CLEAR_NOTIFICATIONS_BY_TYPE',
        notificationType: 'matching',
      });
    }
  }, []); // 마운트 시 한 번만 실행

  // 로딩 상태 - 스켈레톤 UI 표시
  if (sessionLoading || cohortLoading || participantsLoading || viewerSubmissionLoading || yesterdayVerifiedLoading) {
    return <LoadingSkeleton />;
  }

  // 세션 or cohort 없음 (useEffect에서 리다이렉트 처리 중)
  // cohortLoading이 끝나지 않았으면 위의 스켈레톤 UI가 표시됨
  // 여기 도달 시점에는 검증 완료 상태이므로 안전하게 null 반환
  if (!participant || !cohort || !cohortId) {
    return null;
  }

  const maleParticipants: FeaturedParticipant[] = featuredParticipants.filter(
    (p) => !p.gender || p.gender === 'male'
  );
  const femaleParticipants: FeaturedParticipant[] = featuredParticipants.filter(
    (p) => p.gender === 'female'
  );

  const availableIds = !isRandomMatching
    ? featuredParticipants.map((p) => p.id)
    : isLocked && !isSuperAdmin
      ? assignedProfileIds.slice(0, Math.min(20, assignedProfileIds.length))
      : assignedProfileIds;

  const unlockedLimit = isRandomMatching && isLocked && !isSuperAdmin
    ? Math.min(profileBookAccess.unlockedProfileBooks, availableIds.length)
    : availableIds.length;

  const unlockedIdsSet = new Set(availableIds.slice(0, unlockedLimit));

  const totalCount = isRandomMatching
    ? assignedProfileIds.length
    : featuredParticipants.length;

  const unlockedCount = unlockedIdsSet.size;
  const lockedCount = Math.max(totalCount - unlockedCount, 0);
  const shouldShowLockedCards = isRandomMatching && isLocked && lockedCount > 0;
  const visibleMale = maleParticipants.filter((p) => unlockedIdsSet.has(p.id));
  const visibleFemale = femaleParticipants.filter((p) => unlockedIdsSet.has(p.id));
  const maleLockedSlots = shouldShowLockedCards ? Math.max(maleParticipants.length - visibleMale.length, 0) : 0;
  const femaleLockedSlots = shouldShowLockedCards ? Math.max(femaleParticipants.length - visibleFemale.length, 0) : 0;

  // 전체 공개 모드에서도 미인증 시 2명(1남+1여)만 표시
  const visibleMaleInAllMode = showAllProfiles && isLocked && !isSuperAdmin && !showAllProfilesWithoutAuth
    ? maleParticipants.slice(0, 1)
    : maleParticipants;
  const visibleFemaleInAllMode = showAllProfiles && isLocked && !isSuperAdmin && !showAllProfilesWithoutAuth
    ? femaleParticipants.slice(0, 1)
    : femaleParticipants;

  // v2.0: 프로필북 클릭 핸들러 (카드별 잠금 상태 확인)
  const handleProfileClickWithAuth = (
    participantId: string,
    theme: 'similar' | 'opposite',
    cardIndex?: number
  ) => {
    // 15일차 이후: 인증 체크 완전 스킵
    if (showAllProfilesWithoutAuth) {
      const matchingDate = getSubmissionDate();
      const profileUrl = `${appRoutes.profile(participantId, cohortId, theme)}&matchingDate=${encodeURIComponent(matchingDate)}`;
      router.push(profileUrl);
      return;
    }

    // v2.0 랜덤 매칭: 카드 인덱스 기반 잠금 체크
    if (isRandomMatching && cardIndex !== undefined) {
      const isCardLocked = isProfileBookLocked(cardIndex, profileBookAccess);

      if (isCardLocked) {
        // 오늘 할당된 전체 프로필북 개수 (DB에서)
        const totalAssigned = assignedProfileIds.length;
        // 추가로 볼 수 있는 개수 (현재 2개 보이므로)
        const additionalProfilesToUnlock = Math.max(totalAssigned - 2, 0);

        toast({
          title: '프로필 잠김 🔒',
          description: `오늘의 독서를 인증하면 추가로 ${additionalProfilesToUnlock}개의 프로필북을 볼 수 있어요. (총 ${totalAssigned}개)`,
        });
        return;
      }

      // 열린 카드: 프로필 페이지로 이동
      const matchingDate = activeMatchingDate || getSubmissionDate();
      const profileUrl = `${appRoutes.profile(participantId, cohortId, theme)}&matchingDate=${encodeURIComponent(matchingDate)}`;
      router.push(profileUrl);
      return;
    }

    // profileUnlockMode: 렌더링된 프로필은 인증 없이도 볼 수 있음
    if (isProfileUnlockMode) {
      const matchingDate = getSubmissionDate();
      const profileUrl = `${appRoutes.profile(participantId, cohortId, theme)}&matchingDate=${encodeURIComponent(matchingDate)}`;
      router.push(profileUrl);
      return;
    }

    // 마지막 날: 전체 공개지만 인증 필요
    if (isFinalDay && !showAllProfilesWithoutAuth) {
      // ✅ FIX: 화면에 노출된 2명(남1/여1)은 인증 없이도 접근 가능해야 함
      const isFreeProfile = visibleMaleInAllMode.some(p => p.id === participantId) ||
        visibleFemaleInAllMode.some(p => p.id === participantId);

      if (isLocked && !isFreeProfile) {
        toast({
          title: '프로필 잠김 🔒',
          description: '오늘의 독서를 인증하면 모든 프로필을 확인할 수 있어요 (마지막 날 특별 이벤트!)',
        });
        return;
      }

      const matchingDate = getSubmissionDate();
      let profileUrl = `${appRoutes.profile(participantId, cohortId, theme)}&matchingDate=${encodeURIComponent(matchingDate)}`;

      // ✅ FIX: 무료 공개 프로필인 경우 플래그 추가
      if (isFreeProfile) {
        profileUrl += '&freeAccess=true';
      }

      router.push(profileUrl);
      return;
    }

    // v1.0 AI 매칭: 기존 로직
    if (isLocked) {
      toast({
        title: '프로필 잠김 🔒',
        description: '오늘의 독서를 인증하면 프로필을 확인할 수 있어요',
      });
      return;
    }

    if (!activeMatchingDate) {
      toast({
        title: '프로필북 정보를 불러올 수 없습니다',
        description: '잠시 후 다시 시도해주세요.',
      });
      return;
    }

    const profileUrl = `${appRoutes.profile(participantId, cohortId, theme)}&matchingDate=${encodeURIComponent(activeMatchingDate)}`;
    router.push(profileUrl);
  };

  // v2.0: 미인증 시 완전 잠금 화면 제거
  // 대신 아래 렌더링 로직에서 일부만 표시 (랜덤 2개 + 자물쇠 카드)

  // 2단계: 인증 완료 유저 중 매칭 데이터가 없는 경우
  // 단, 슈퍼관리자나 전체 프로필 공개 기간에는 이 화면을 건너뛰고 바로 전체 프로필 표시
  if (allFeaturedIds.length === 0 && !showAllProfiles) {
    return (
      <PageTransition>
        <div className="app-shell flex flex-col overflow-hidden">
          <LegacyHeader title="오늘의 서재" />

          <main className="app-main-content flex flex-1 overflow-y-auto items-center justify-center bg-background">
            <div className="mx-auto max-w-md px-6">
              <div className="text-center space-y-6">
                {/* Empty State Icon */}
                <div className="flex justify-center">
                  <div className="size-20 rounded-full bg-gray-100 flex items-center justify-center">
                    <svg className="size-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>

                {/* Empty State Message */}
                <div className="space-y-3">
                  <h3 className="font-bold text-lg text-gray-900">
                    첫 인증을 완료했어요! 🎉
                  </h3>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 leading-relaxed">
                      프로필 북은 <strong className="text-gray-900">인증 다음날 오전 2시</strong>부터
                      <br />
                      열어볼 수 있어요
                    </p>
                    <p className="text-xs text-gray-500">
                      매일 새로운 멤버들의 프로필북이 도착합니다
                    </p>
                  </div>
                </div>

                {/* CTA Button */}
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

  // 3단계: 매칭 데이터 처리 (v2.0 기준 - 성별 기반 레이아웃 고정)
  return (
    <PageTransition>
      <div className="app-shell flex flex-col overflow-hidden">
        <LegacyHeader title="오늘의 서재" />

        {/* Main Content */}
        <main className="app-main-content flex-1 overflow-y-auto bg-background">
          <div className="mx-auto max-w-md px-6 w-full pt-3 md:pt-2 pb-6">
            {/* 다른 모임 구경하기 버튼 (v3.0 클러스터 매칭인 경우) - 네비바 아래 오른쪽 */}
            {matchingVersion === 'cluster' && (
              <div className="flex justify-end mb-2">
                <button
                  onClick={() => router.push(appRoutes.todayLibraryOtherClusters(cohortId))}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-500 bg-white border border-gray-200 rounded-full hover:bg-gray-50 transition-colors"
                >
                  다른 모임 구경하기 <ChevronRight className="size-4" />
                </button>
              </div>
            )}

            <div className="flex flex-col gap-6">
              {/* Header Section */}
              <div className="flex flex-col gap-3">
                <h1 className="font-bold text-heading-xl text-black">
                  {isFinalDay || showAllProfilesWithoutAuth
                    ? <>오늘의 서재가<br />전면 개방됐어요</>
                    : isRandomMatching && isLocked
                      ? <>프로필 북을<br />조금 열어봤어요</>
                      : <>프로필 북을<br />확인해보세요</>
                  }
                </h1>
                <p className="font-medium text-body-base text-text-secondary">
                  {isFinalDay || showAllProfilesWithoutAuth
                    ? '2주간의 여정을 마무리하며 모든 멤버의 프로필 북을 공개합니다'
                    : isProfileUnlockMode && showAllProfiles
                      ? '어제 인증한 모든 멤버의 프로필을 확인할 수 있어요'
                      : isRandomMatching && isLocked
                        ? `오늘 인증하면 ${totalCount}개의 프로필북을 모두 열어볼 수 있어요`
                        : '새벽 2시까지만 읽을 수 있어요'
                  }
                </p>
              </div>

              {/* 프로필북 개수 표시 (v2.0 랜덤 매칭) */}
              {isRandomMatching && !showAllProfiles && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="font-semibold text-black">{totalCount}개의 프로필북</span>
                  <span>•</span>
                  <span>{unlockedCount}개 열람 가능</span>
                </div>
              )}

              {/* Step 3-2, 3-3: 프로필 카드 레이아웃 */}
              {showAllProfiles ? (
                /* 전체 공개: 성별 2열 레이아웃 (미인증 시 각 1명씩만 + 나머지는 잠김) */
                <div className="grid grid-cols-2 gap-6">
                  {/* 왼쪽: 남자 */}
                  <div className="flex flex-col gap-4">
                    {visibleMaleInAllMode.map((p, index) => (
                      <div key={p.id} className="flex flex-col">
                        <div className="flex justify-center">
                          <BookmarkCard
                            profileImage={getResizedImageUrl(p.profileImageCircle || p.profileImage) || p.profileImageCircle || p.profileImage || '/image/default-profile.svg'}
                            name={p.name}
                            theme="blue"
                            isLocked={false}
                            onClick={() => handleProfileClickWithAuth(p.id, p.theme)}
                          />
                        </div>
                        {(index < visibleMaleInAllMode.length - 1 || (isLocked && !isSuperAdmin && maleParticipants.length > visibleMaleInAllMode.length)) && <BlurDivider />}
                      </div>
                    ))}

                    {/* 자물쇠 카드 (남자) - 전체 공개 모드 */}
                    {isLocked && !isSuperAdmin && maleParticipants.length > visibleMaleInAllMode.length && (
                      Array.from({ length: maleParticipants.length - visibleMaleInAllMode.length }).map((_, idx) => (
                        <div key={`locked-male-all-${idx}`} className="flex flex-col">
                          <div className="flex justify-center">
                            <BookmarkCard
                              profileImage=""
                              name=""
                              theme="blue"
                              isLocked={true}
                              onClick={() => {
                                toast({
                                  title: '프로필 잠김 🔒',
                                  description: isFinalDay
                                    ? '오늘의 독서를 인증하면 모든 프로필을 확인할 수 있어요 (마지막 날 특별 이벤트!)'
                                    : '오늘의 독서를 인증하면 모든 프로필을 확인할 수 있어요',
                                });
                              }}
                            />
                          </div>
                          {idx < (maleParticipants.length - visibleMaleInAllMode.length - 1) && <BlurDivider />}
                        </div>
                      ))
                    )}
                  </div>

                  {/* 오른쪽: 여자 */}
                  <div className="flex flex-col gap-4">
                    {visibleFemaleInAllMode.map((p, index) => (
                      <div key={p.id} className="flex flex-col">
                        <div className="flex justify-center">
                          <BookmarkCard
                            profileImage={getResizedImageUrl(p.profileImageCircle || p.profileImage) || p.profileImageCircle || p.profileImage || '/image/default-profile.svg'}
                            name={p.name}
                            theme="yellow"
                            isLocked={false}
                            onClick={() => handleProfileClickWithAuth(p.id, p.theme)}
                          />
                        </div>
                        {(index < visibleFemaleInAllMode.length - 1 || (isLocked && !isSuperAdmin && femaleParticipants.length > visibleFemaleInAllMode.length)) && <BlurDivider />}
                      </div>
                    ))}

                    {/* 자물쇠 카드 (여자) - 전체 공개 모드 */}
                    {isLocked && !isSuperAdmin && femaleParticipants.length > visibleFemaleInAllMode.length && (
                      Array.from({ length: femaleParticipants.length - visibleFemaleInAllMode.length }).map((_, idx) => (
                        <div key={`locked-female-all-${idx}`} className="flex flex-col">
                          <div className="flex justify-center">
                            <BookmarkCard
                              profileImage=""
                              name=""
                              theme="yellow"
                              isLocked={true}
                              onClick={() => {
                                toast({
                                  title: '프로필 잠김 🔒',
                                  description: isFinalDay
                                    ? '오늘의 독서를 인증하면 모든 프로필을 확인할 수 있어요 (마지막 날 특별 이벤트!)'
                                    : '독서를 인증하면 내일 오전 2시에 프로필을 확인할 수 있어요',
                                });
                              }}
                            />
                          </div>
                          {idx < (femaleParticipants.length - visibleFemaleInAllMode.length - 1) && <BlurDivider />}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                /* 기본/랜덤 모드: 성별 2열 + (필요 시) 자물쇠 카드 */
                <div className="grid grid-cols-2 gap-6">
                  {/* 왼쪽: 남자 */}
                  <div className="flex flex-col gap-4">
                    {visibleMale.map((p) => {
                      // DB 배열에서 실제 인덱스 찾기
                      const cardIndex = assignedProfileIds.indexOf(p.id);
                      return (
                        <div key={p.id} className="flex flex-col">
                          <div className="flex justify-center">
                            <BookmarkCard
                              profileImage={getResizedImageUrl(p.profileImageCircle || p.profileImage) || p.profileImageCircle || p.profileImage || '/image/default-profile.svg'}
                              name={p.name}
                              theme="blue"
                              isLocked={false}
                              onClick={() => handleProfileClickWithAuth(p.id, 'similar', cardIndex)}
                            />
                          </div>
                          <BlurDivider />
                        </div>
                      );
                    })}

                    {/* 자물쇠 카드 (남자) */}
                    {shouldShowLockedCards && Array.from({ length: maleLockedSlots }).map((_, idx) => {
                      // 잠긴 카드 인덱스: 열린 카드 바로 다음부터
                      const cardIndex = unlockedCount + idx;
                      return (
                        <div key={`locked-male-${idx}`} className="flex flex-col">
                          <div className="flex justify-center">
                            <BookmarkCard
                              profileImage=""
                              name=""
                              theme="blue"
                              isLocked={true}
                              onClick={() => handleProfileClickWithAuth('', 'similar', cardIndex)}
                            />
                          </div>
                          <BlurDivider />
                        </div>
                      );
                    })}
                  </div>

                  {/* 오른쪽: 여자 */}
                  <div className="flex flex-col gap-4">
                    {visibleFemale.map((p) => {
                      // DB 배열에서 실제 인덱스 찾기
                      const cardIndex = assignedProfileIds.indexOf(p.id);
                      return (
                        <div key={p.id} className="flex flex-col">
                          <div className="flex justify-center">
                            <BookmarkCard
                              profileImage={getResizedImageUrl(p.profileImageCircle || p.profileImage) || p.profileImageCircle || p.profileImage || '/image/default-profile.svg'}
                              name={p.name}
                              theme="yellow"
                              isLocked={false}
                              onClick={() => handleProfileClickWithAuth(p.id, 'opposite', cardIndex)}
                            />
                          </div>
                          <BlurDivider />
                        </div>
                      );
                    })}

                    {/* 자물쇠 카드 (여자) */}
                    {shouldShowLockedCards && Array.from({ length: femaleLockedSlots }).map((_, idx) => {
                      // 잠긴 카드 인덱스: 남자 잠긴 카드 다음부터
                      const cardIndex = unlockedCount + maleLockedSlots + idx;
                      return (
                        <div key={`locked-female-${idx}`} className="flex flex-col">
                          <div className="flex justify-center">
                            <BookmarkCard
                              profileImage=""
                              name=""
                              theme="yellow"
                              isLocked={true}
                              onClick={() => handleProfileClickWithAuth('', 'opposite', cardIndex)}
                            />
                          </div>
                          <BlurDivider />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          </div>
        </main>

        <FooterActions>
          {isLocked && !isSuperAdmin ? (
            <div className="grid grid-cols-2 gap-2">
              <UnifiedButton
                variant="secondary"
                onClick={() => router.push(appRoutes.profile(currentUserId || '', cohortId))}
                className="flex-1"
              >
                내 프로필 북 보기
              </UnifiedButton>
              <UnifiedButton
                variant="primary"
                onClick={() => router.push(appRoutes.submitStep1(cohortId!))}
                className="flex-1"
              >
                독서 인증하기
              </UnifiedButton>
            </div>
          ) : (
            <UnifiedButton
              variant="primary"
              onClick={() => router.push(appRoutes.profile(currentUserId || '', cohortId))}
              className="w-full"
            >
              내 프로필 북 보기
            </UnifiedButton>
          )}
        </FooterActions>
      </div>
    </PageTransition>
  );
}

// ============================================================================
// V3 Content (New UI)
// ============================================================================

function AccordionContent({
  text,
  isExpanded,
}: {
  text: string;
  isExpanded: boolean;
}) {
  return (
    <div className="flex justify-between items-start gap-2">
      <div
        className={`flex-1 overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[500px]' : 'max-h-[1.6em]'
          }`}
      >
        <p className="text-[14px] text-[#333D4B] leading-[1.6] break-all whitespace-pre-wrap">
          {text || '(답변 없음)'}
        </p>
      </div>

      <div className={`flex-shrink-0 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
        <ChevronDown className="w-5 h-5 text-[#B0B8C1]" />
      </div>
    </div>
  );
}

function TodayLibraryV3Content() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cohortId = searchParams.get('cohort');
  const targetClusterIdParam = searchParams.get('cluster'); // 다른 모임 구경가기용

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

  // 내 클러스터 매칭 데이터 조회 (기본)
  const myClusterMatching = useMemo(() => {
    if (!cohort?.dailyFeaturedParticipants || !currentUserId) {
      return null;
    }

    return findLatestClusterMatching(
      cohort.dailyFeaturedParticipants,
      currentUserId,
      preferredMatchingDate
    );
  }, [cohort?.dailyFeaturedParticipants, currentUserId, preferredMatchingDate]);

  // 다른 클러스터 구경 시 해당 클러스터 데이터 조회
  const targetClusterMatching = useMemo(() => {
    if (!targetClusterIdParam || !cohort?.dailyFeaturedParticipants) {
      return null;
    }

    return findClusterById(
      cohort.dailyFeaturedParticipants,
      targetClusterIdParam,
      preferredMatchingDate
    );
  }, [cohort?.dailyFeaturedParticipants, targetClusterIdParam, preferredMatchingDate]);

  // 최종 사용할 클러스터 매칭 데이터
  const clusterMatching = targetClusterIdParam ? targetClusterMatching : myClusterMatching;

  // 다른 모임 구경 중인지 여부
  const isViewingOtherCluster = targetClusterIdParam && myClusterMatching?.clusterId !== targetClusterIdParam;

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
        name: isMe ? '나' : getFirstName(member.name), // 본인은 '나', 타인은 이름만 표시
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

    // 미인증 사용자 접근 제한 (본인 제외) - isLocked로 통일
    if (isLocked && !isSuperAdmin && !isMe) {
      showLockedToast('review');
      return;
    }

    router.push(`/app/chat/today-library/review/${encodeURIComponent(participantId)}?date=${clusterMatching?.matchingDate}&cohort=${cohortId}`);
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
                      독서모임 테이블은 <strong className="text-gray-900">인증 다음날 오전 2시</strong>부터
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
  // 1.5단계: 매칭 진행 중 (새벽 2시 0분 ~ 2시 29분)
  // ========================================
  if (isMatchingInProgress()) {
    return (
      <PageTransition>
        <div className="app-shell flex flex-col overflow-hidden">
          <TopBar title="오늘의 서재" onBack={() => router.back()} align="left" />

          <main className="app-main-content flex flex-1 overflow-y-auto items-center justify-center bg-background">
            <div className="mx-auto max-w-md px-6">
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <div className="size-20 rounded-full bg-blue-50 flex items-center justify-center">
                    <svg className="size-10 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-bold text-lg text-gray-900">
                    오늘의 독서모임을 준비 중이에요
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    잠시 후 다시 확인해 주세요
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

  // Framer Motion imports (add these to the top of the file if not present, but for this replacement I will assume they are or I will add them in a separate step if needed. Wait, I can't add imports easily with replace_file_content if they are far away. I should check if I can add imports. I see imports at line 3. I will add imports in a separate step first.)

  // ... (skipping imports for now, will do in next step)

  // 뒤로가기 핸들러
  // - 내 모임: 메인 화면(채팅)으로 이동 (히스토리 무관하게 명확한 동선)
  // - 다른 모임 구경 중: 클러스터 목록으로 이동
  const handleBack = () => {
    if (isViewingOtherCluster) {
      router.push(appRoutes.todayLibraryOtherClusters(cohortId!));
    } else {
      router.push(appRoutes.chat(cohortId!));
    }
  };


  return (
    <PageTransition>
      <div className="app-shell flex flex-col overflow-hidden bg-[#F6F6F6]">
        {/* Custom Header using TopBar - Changed to bg-white as per feedback */}
        <TopBar
          title={isViewingOtherCluster ? "다른 모임 구경 중" : "오늘의 서재"}
          onBack={handleBack}
          align="center"
          className="bg-white border-b-0"
        />

        <main
          className="flex-1 overflow-y-auto overflow-x-hidden touch-pan-y"
          style={{ overscrollBehaviorX: 'none' }}
        >
          {/* 네비게이션 버튼 영역 */}
          <div className="flex px-6 pt-5 bg-[#F6F6F6]">
            {/* 내 모임으로 돌아가기 - 왼쪽 */}
            {isViewingOtherCluster ? (
              <button
                onClick={() => router.push(appRoutes.todayLibrary(cohortId!))}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-500 bg-white border border-gray-200 rounded-full hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft className="size-4" />
                내 모임으로 돌아가기
              </button>
            ) : (
              /* 다른 모임 구경하기 - 오른쪽 */
              <button
                onClick={() => router.push(appRoutes.todayLibraryOtherClusters(cohortId!))}
                className="ml-auto inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-500 bg-white border border-gray-200 rounded-full hover:bg-gray-50 transition-colors"
              >
                다른 모임 구경하기 <ChevronRight className="size-4" />
              </button>
            )}
          </div>

          {/* 1. Theme Section (Top) */}
          <section className="flex flex-col items-center text-center gap-3 pt-2 pb-6 px-6 bg-[#F6F6F6]">

            <div className="w-16 h-16 rounded-full bg-white border border-gray-100 flex items-center justify-center shadow-sm text-[32px]">
              {cluster.emoji || '🥂'}
            </div>

            <div className="flex flex-col gap-2 max-w-full">
              <div className="bg-black text-white text-[12px] font-bold px-3 py-1 rounded-[12px] inline-block self-center">
                {cluster.category || '감상평'}
              </div>
              <h3 className="text-[18px] font-bold text-black">
                {cluster.theme}
              </h3>
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
                      src={getResizedImageUrl(member.profileImageCircle || member.profileImage) || member.profileImage || '/image/default-profile.svg'}
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
              <h2 className="text-[18px] font-bold text-[#31363E] mb-4 leading-[1.4]">오늘의 감상평</h2>
              <div className="flex flex-col">
                {clusterMembersWithSubmissions.map(member => (
                  <div key={member.id} className="flex gap-3 border-b border-[#F2F4F6] py-4 first:pt-0 items-start">
                    {/* Left: Avatar & Name */}
                    <div className="flex flex-col items-center gap-1 shrink-0 w-[40px]">
                      <div
                        className="relative w-10 h-10 rounded-full overflow-hidden border border-gray-100 cursor-pointer"
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
                      <span className="text-[11px] text-[#8B95A1] text-center w-full truncate">{member.name}</span>
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
                <h2 className="text-[18px] font-bold text-[#31363E] mb-4 leading-[1.4]">오늘의 가치관 답변</h2>

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
                  {clusterMembersWithSubmissions.map(member => {
                    const isExpanded = expandedAnswers.has(member.id);
                    const answerLength = member.dailyAnswer ? member.dailyAnswer.length : 0;

                    return (
                      <div
                        key={member.id}
                        className={`flex gap-3 border-b border-[#F2F4F6] py-4 first:pt-0 items-start`}
                      >
                        {/* Left: Avatar & Name */}
                        <div className="flex flex-col items-center gap-1 shrink-0 w-[40px]">
                          <div
                            className="relative w-10 h-10 rounded-full overflow-hidden border border-gray-100 cursor-pointer"
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
                          <span className="text-[11px] text-[#8B95A1] text-center w-full truncate">{member.name}</span>
                        </div>

                        {/* Right: Content */}
                        <div
                          className="flex-1 flex flex-col gap-1 cursor-pointer"
                          onClick={() => toggleAnswer(member.id)}
                        >
                          {/* Character Count */}
                          <span className="text-[12px] text-[#8B95A1]">
                            [{answerLength}자]
                          </span>

                          {/* Text + Chevron Row */}
                          <AccordionContent
                            text={member.dailyAnswer}
                            isExpanded={isExpanded}
                          />
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

// ============================================================================
// Common Components
// ============================================================================

function LoadingSkeleton() {
  return (
    <PageTransition>
      <div className="app-shell flex flex-col overflow-hidden">
        <LegacyHeader title="오늘의 서재" />
        <main className="app-main-content flex-1 overflow-y-auto bg-background">
          <div className="mx-auto max-w-md px-6 w-full">
            <div className="pb-6">
              <div className="flex flex-col gap-12">
                <div className="flex flex-col gap-3">
                  <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
                  <div className="h-6 w-40 bg-gray-200 rounded animate-pulse" />
                </div>
                {/* Bookmark Cards Skeleton */}
                <div className="flex flex-col w-full">
                  <div className="h-24 bg-gray-100 rounded animate-pulse mb-4" />
                  <div className="h-24 bg-gray-100 rounded animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </PageTransition>
  );
}

// ============================================================================
// Main Page Component (Switcher)
// ============================================================================

function TodayLibraryContent() {
  const searchParams = useSearchParams();
  const cohortId = searchParams.get('cohort');
  const { data: cohort, isLoading } = useCohort(cohortId || undefined);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!cohort) {
    return null; // Will be redirected by inner components or handle error
  }

  // 매칭 시스템 설정에 따라 분기 처리
  // 기본값은 false (v2.0 레거시)
  const useClusterMatching = cohort.useClusterMatching === true;

  if (useClusterMatching) {
    return <TodayLibraryV3Content />;
  }

  return <TodayLibraryV2Content />;
}

export default function TodayLibraryPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <TodayLibraryContent />
    </Suspense>
  );
}
