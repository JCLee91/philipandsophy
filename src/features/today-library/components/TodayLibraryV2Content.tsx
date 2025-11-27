'use client';

import { useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PageTransition from '@/components/PageTransition';
import FooterActions from '@/components/FooterActions';
import BookmarkRow from '@/components/BookmarkRow';
import BookmarkCard from '@/components/BookmarkCard';
import BlurDivider from '@/components/BlurDivider';
import UnifiedButton from '@/components/UnifiedButton';
import { useCohort } from '@/hooks/use-cohorts';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useAccessControl } from '@/hooks/use-access-control';
import { useProfileBookAccess, isProfileBookLocked } from '@/hooks/use-profile-book-access';
import { useParticipantSubmissionsRealtime } from '@/hooks/use-submissions';
import { getDb } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useQuery } from '@tanstack/react-query';
import type { Participant } from '@/types/database';
import { appRoutes } from '@/lib/navigation';
import {
  getSubmissionDate,
  canViewAllProfiles,
  canViewAllProfilesWithoutAuth,
  shouldShowAllYesterdayVerified,
} from '@/lib/date-utils';
import { getResizedImageUrl } from '@/lib/image-utils';
import { findLatestMatchingForParticipant } from '@/lib/matching-utils';
import { getAssignedProfiles } from '@/lib/matching-compat';
import { useYesterdayVerifiedParticipants } from '@/hooks/use-yesterday-verified-participants';

import type { FeaturedParticipant } from '../types';
import { LegacyHeader } from './LegacyHeader';
import { LoadingSkeleton } from './LoadingSkeleton';

/**
 * TodayLibraryV2Content - 레거시 UI (랜덤/AI 매칭)
 */
export function TodayLibraryV2Content() {
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
  const { data: viewerSubmissions = [], isLoading: viewerSubmissionLoading } =
    useParticipantSubmissionsRealtime(currentUserId);
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
    return findLatestMatchingForParticipant(cohort.dailyFeaturedParticipants, currentUserId, {
      preferredDate: preferredMatchingDate,
    });
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

  const userAssignment = currentUserId && assignments ? assignments[currentUserId] ?? null : null;

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
  const { data: yesterdayVerifiedIds, isLoading: yesterdayVerifiedLoading } =
    useYesterdayVerifiedParticipants(cohortId || undefined);

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
  const showAllProfiles =
    isSuperAdmin ||
    isFinalDay ||
    showAllProfilesWithoutAuth ||
    (isProfileUnlockMode && yesterdayVerifiedIds && yesterdayVerifiedIds.size > 0);

  // 추천 참가자들의 정보 가져오기
  // 마지막 날이면 전체 참가자 쿼리, 아니면 매칭된 4명만
  const yesterdayIdsArray = yesterdayVerifiedIds ? Array.from(yesterdayVerifiedIds).sort() : [];
  const yesterdayIdsKey = yesterdayIdsArray.join(',');

  const { data: featuredParticipants = [], isLoading: participantsLoading } =
    useQuery<FeaturedParticipant[]>({
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
            participants = allSnapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            })) as Participant[];

            // 본인과 슈퍼관리자, 일반 관리자, 고스트 제외
            participants = participants.filter(
              (p) => p.id !== currentUserId && !p.isSuperAdmin && !p.isAdministrator && !p.isGhost
            );
          } else {
            // 평소: 어제 인증한 사람들만 (본인 제외)
            const yesterdayIds = Array.from(yesterdayVerifiedIds || []).filter(
              (id) => id !== currentUserId
            );

            if (yesterdayIds.length === 0) return [];

            // Firestore 'in' 쿼리는 최대 10개 제한 → 청크로 나눠서 조회
            const chunks: Participant[] = [];
            for (let i = 0; i < yesterdayIds.length; i += 10) {
              const chunk = yesterdayIds.slice(i, i + 10);
              const q = query(participantsRef, where('__name__', 'in', chunk));
              const snapshot = await getDocs(q);
              chunks.push(
                ...(snapshot.docs.map((doc) => ({
                  id: doc.id,
                  ...doc.data(),
                })) as Participant[])
              );
            }
            // 고스트 참가자 제외
            participants = chunks.filter((p) => !p.isGhost);
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
            chunks.push(
              ...(snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
              })) as Participant[])
            );
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
  if (
    sessionLoading ||
    cohortLoading ||
    participantsLoading ||
    viewerSubmissionLoading ||
    yesterdayVerifiedLoading
  ) {
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

  const unlockedLimit =
    isRandomMatching && isLocked && !isSuperAdmin
      ? Math.min(profileBookAccess.unlockedProfileBooks, availableIds.length)
      : availableIds.length;

  const unlockedIdsSet = new Set(availableIds.slice(0, unlockedLimit));

  const totalCount = isRandomMatching ? assignedProfileIds.length : featuredParticipants.length;

  const unlockedCount = unlockedIdsSet.size;
  const lockedCount = Math.max(totalCount - unlockedCount, 0);
  const shouldShowLockedCards = isRandomMatching && isLocked && lockedCount > 0;
  const visibleMale = maleParticipants.filter((p) => unlockedIdsSet.has(p.id));
  const visibleFemale = femaleParticipants.filter((p) => unlockedIdsSet.has(p.id));
  const maleLockedSlots = shouldShowLockedCards
    ? Math.max(maleParticipants.length - visibleMale.length, 0)
    : 0;
  const femaleLockedSlots = shouldShowLockedCards
    ? Math.max(femaleParticipants.length - visibleFemale.length, 0)
    : 0;

  // 전체 공개 모드에서도 미인증 시 2명(1남+1여)만 표시
  const visibleMaleInAllMode =
    showAllProfiles && isLocked && !isSuperAdmin && !showAllProfilesWithoutAuth
      ? maleParticipants.slice(0, 1)
      : maleParticipants;
  const visibleFemaleInAllMode =
    showAllProfiles && isLocked && !isSuperAdmin && !showAllProfilesWithoutAuth
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
      const isFreeProfile =
        visibleMaleInAllMode.some((p) => p.id === participantId) ||
        visibleFemaleInAllMode.some((p) => p.id === participantId);

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

  // v1.0 (레거시): AI 매칭 시에만 자물쇠 화면 표시
  if (!isRandomMatching && isLocked && !isSuperAdmin && !showAllProfilesWithoutAuth) {
    // 미인증 유저를 위한 더미 카드 (자물쇠 표시용)
    const lockedPlaceholders = {
      similar: [
        { id: 'locked-1', name: '', profileImage: '', theme: 'similar' as const },
        { id: 'locked-2', name: '', profileImage: '', theme: 'similar' as const },
      ],
      opposite: [
        { id: 'locked-3', name: '', profileImage: '', theme: 'opposite' as const },
        { id: 'locked-4', name: '', profileImage: '', theme: 'opposite' as const },
      ],
    };
    return (
      <PageTransition>
        <div className="app-shell flex flex-col overflow-hidden">
          <LegacyHeader title="오늘의 서재" />

          {/* Main Content */}
          <main className="app-main-content flex-1 overflow-y-auto bg-background">
            <div className="mx-auto max-w-md px-6 w-full">
              <div className="pb-6">
                {/* Header Section */}
                <div className="flex flex-col gap-12">
                  <div className="flex flex-col gap-3">
                    <h1 className="font-bold text-heading-xl text-black">
                      독서 인증을 하지 않으면
                      <br />
                      프로필 북을 열어볼 수 없어요
                    </h1>
                    <p className="font-medium text-body-base text-text-secondary">
                      새벽 2시까지 독서를 인증하고
                      <br />
                      멤버들의 프로필 북을 읽어보세요
                    </p>
                  </div>

                  {/* Bookmark Cards Section */}
                  <div className="flex flex-col w-full">
                    <BookmarkRow
                      participants={lockedPlaceholders.similar}
                      theme="blue"
                      isLocked={true}
                      onCardClick={handleProfileClickWithAuth}
                    />
                    <BlurDivider />
                    <BookmarkRow
                      participants={lockedPlaceholders.opposite}
                      theme="yellow"
                      isLocked={true}
                      onCardClick={handleProfileClickWithAuth}
                    />
                    <BlurDivider />
                  </div>
                </div>
              </div>
            </div>
          </main>

          <FooterActions>
            <div className="grid grid-cols-2 gap-2">
              {/* Unauthenticated: 2 Buttons */}
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
          </FooterActions>
        </div>
      </PageTransition>
    );
  }

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

                {/* Empty State Message */}
                <div className="space-y-3">
                  <h3 className="font-bold text-lg text-gray-900">첫 인증을 완료했어요! 🎉</h3>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 leading-relaxed">
                      프로필 북은 <strong className="text-gray-900">인증 다음날 오전 2시</strong>부터
                      <br />
                      열어볼 수 있어요
                    </p>
                    <p className="text-xs text-gray-500">매일 새로운 멤버들의 프로필북이 도착합니다</p>
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
            <div className="flex flex-col gap-6">
              {/* Header Section */}
              <div className="flex flex-col gap-3">
                <h1 className="font-bold text-heading-xl text-black">
                  {isFinalDay || showAllProfilesWithoutAuth ? (
                    <>
                      오늘의 서재가
                      <br />
                      전면 개방됐어요
                    </>
                  ) : isRandomMatching && isLocked ? (
                    <>
                      프로필 북을
                      <br />
                      조금 열어봤어요
                    </>
                  ) : (
                    <>
                      프로필 북을
                      <br />
                      확인해보세요
                    </>
                  )}
                </h1>
                <p className="font-medium text-body-base text-text-secondary">
                  {isFinalDay || showAllProfilesWithoutAuth
                    ? '2주간의 여정을 마무리하며 모든 멤버의 프로필 북을 공개합니다'
                    : isProfileUnlockMode && showAllProfiles
                      ? '어제 인증한 모든 멤버의 프로필을 확인할 수 있어요'
                      : isRandomMatching && isLocked
                        ? `오늘 인증하면 ${totalCount}개의 프로필북을 모두 열어볼 수 있어요`
                        : '새벽 2시까지만 읽을 수 있어요'}
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
                            profileImage={
                              getResizedImageUrl(p.profileImageCircle || p.profileImage) ||
                              p.profileImageCircle ||
                              p.profileImage ||
                              '/image/default-profile.svg'
                            }
                            name={p.name}
                            theme="blue"
                            isLocked={false}
                            onClick={() => handleProfileClickWithAuth(p.id, p.theme)}
                          />
                        </div>
                        {(index < visibleMaleInAllMode.length - 1 ||
                          (isLocked &&
                            !isSuperAdmin &&
                            maleParticipants.length > visibleMaleInAllMode.length)) && <BlurDivider />}
                      </div>
                    ))}

                    {/* 자물쇠 카드 (남자) - 전체 공개 모드 */}
                    {isLocked &&
                      !isSuperAdmin &&
                      maleParticipants.length > visibleMaleInAllMode.length &&
                      Array.from({ length: maleParticipants.length - visibleMaleInAllMode.length }).map(
                        (_, idx) => (
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
                            {idx < maleParticipants.length - visibleMaleInAllMode.length - 1 && (
                              <BlurDivider />
                            )}
                          </div>
                        )
                      )}
                  </div>

                  {/* 오른쪽: 여자 */}
                  <div className="flex flex-col gap-4">
                    {visibleFemaleInAllMode.map((p, index) => (
                      <div key={p.id} className="flex flex-col">
                        <div className="flex justify-center">
                          <BookmarkCard
                            profileImage={
                              getResizedImageUrl(p.profileImageCircle || p.profileImage) ||
                              p.profileImageCircle ||
                              p.profileImage ||
                              '/image/default-profile.svg'
                            }
                            name={p.name}
                            theme="yellow"
                            isLocked={false}
                            onClick={() => handleProfileClickWithAuth(p.id, p.theme)}
                          />
                        </div>
                        {(index < visibleFemaleInAllMode.length - 1 ||
                          (isLocked &&
                            !isSuperAdmin &&
                            femaleParticipants.length > visibleFemaleInAllMode.length)) && (
                          <BlurDivider />
                        )}
                      </div>
                    ))}

                    {/* 자물쇠 카드 (여자) - 전체 공개 모드 */}
                    {isLocked &&
                      !isSuperAdmin &&
                      femaleParticipants.length > visibleFemaleInAllMode.length &&
                      Array.from({
                        length: femaleParticipants.length - visibleFemaleInAllMode.length,
                      }).map((_, idx) => (
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
                          {idx < femaleParticipants.length - visibleFemaleInAllMode.length - 1 && (
                            <BlurDivider />
                          )}
                        </div>
                      ))}
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
                              profileImage={
                                getResizedImageUrl(p.profileImageCircle || p.profileImage) ||
                                p.profileImageCircle ||
                                p.profileImage ||
                                '/image/default-profile.svg'
                              }
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
                    {shouldShowLockedCards &&
                      Array.from({ length: maleLockedSlots }).map((_, idx) => {
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
                              profileImage={
                                getResizedImageUrl(p.profileImageCircle || p.profileImage) ||
                                p.profileImageCircle ||
                                p.profileImage ||
                                '/image/default-profile.svg'
                              }
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
                    {shouldShowLockedCards &&
                      Array.from({ length: femaleLockedSlots }).map((_, idx) => {
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
