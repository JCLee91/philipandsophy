'use client';

import { Suspense, useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PageTransition from '@/components/PageTransition';
import BookmarkRow from '@/components/BookmarkRow';
import BookmarkCard from '@/components/BookmarkCard';
import HeaderNavigation from '@/components/HeaderNavigation';
import FooterActions from '@/components/FooterActions';
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
import { findLatestMatchingForParticipant } from '@/lib/matching-utils';
import { appRoutes } from '@/lib/navigation';
import { getSubmissionDate, getMatchingAccessDates, canViewAllProfiles, canViewAllProfilesWithoutAuth, shouldShowAllYesterdayVerified } from '@/lib/date-utils';
import { useYesterdayVerifiedParticipants } from '@/hooks/use-yesterday-verified-participants';
import { getResizedImageUrl } from '@/lib/image-utils';

// ✅ Disable static generation - requires runtime data
export const dynamic = 'force-dynamic';
type FeaturedParticipant = Participant & { theme: 'similar' | 'opposite' };

function TodayLibraryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cohortId = searchParams.get('cohort');

  // Firebase Auth 기반 인증
  const { participant, isLoading: sessionLoading } = useAuth();
  const currentUserId = participant?.id;
  const { isSuperAdmin, isLocked } = useAccessControl();

  // v2.0: 프로필북 접근 제어 (누적 인증 기반)
  const profileBookAccess = useProfileBookAccess();

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

  // 제출일 기준 공개되는 프로필북 날짜 (제출 다음날 OR 오늘 인증 시 즉시)
  const allowedMatchingDates = useMemo(
    () => getMatchingAccessDates(viewerSubmissionDates),
    [viewerSubmissionDates]
  );


  const matchingLookupWithinAccess = useMemo(() => {
    if (!cohort?.dailyFeaturedParticipants || !currentUserId) {
      return null;
    }

    return findLatestMatchingForParticipant(
      cohort.dailyFeaturedParticipants,
      currentUserId,
      isSuperAdmin
        ? { preferredDate: preferredMatchingDate }
        : {
            preferredDate: preferredMatchingDate,
            allowedDates: allowedMatchingDates,
          }
    );
  }, [cohort?.dailyFeaturedParticipants, currentUserId, isSuperAdmin, preferredMatchingDate, allowedMatchingDates]);

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

  // v2.0 (랜덤 매칭): assigned 필드 사용
  // v1.0 (AI 매칭): similar + opposite 필드 사용 (레거시 호환)
  const assignedIds = userAssignment?.assigned ?? [];
  const similarFeaturedIds = userAssignment?.similar ?? [];
  const oppositeFeaturedIds = userAssignment?.opposite ?? [];

  // v2.0 (랜덤 매칭) 여부 판단 (matchingVersion 우선, fallback: assigned 필드 존재)
  const isRandomMatching = matchingVersion === 'random' || (matchingVersion === undefined && assignedIds.length > 0);

  // v2.0 미인증 시: 성별 다양성 확보를 위한 스마트 샘플링
  // v2.0 인증 시: 전체 ID 다운로드
  // v1.0: similar + opposite (기존 로직)
  const allFeaturedIds = useMemo(() => {
    if (isRandomMatching) {
      // v2.0 랜덤 매칭
      if (isLocked && !isSuperAdmin) {
        // 미인증: 각 성별 최소 1명씩 확보 가능하도록 충분히 샘플링
        // 최대 20개까지만 (보안 + 성능 균형)
        return assignedIds.slice(0, 20);
      }

      // 인증: 전체
      return assignedIds;
    }

    // v1.0 AI 매칭: similar + opposite
    return Array.from(new Set([...similarFeaturedIds, ...oppositeFeaturedIds]));
  }, [isRandomMatching, isLocked, isSuperAdmin, assignedIds, similarFeaturedIds, oppositeFeaturedIds]);

  // 어제 인증한 참가자 목록 조회
  const { data: yesterdayVerifiedIds, isLoading: yesterdayVerifiedLoading } = useYesterdayVerifiedParticipants(cohortId || undefined);

  // Step 2-2: 마지막 날 체크
  // 슈퍼관리자는 1일차부터 항상 전체 프로필 볼 수 있음 (인증 불필요)
  const isFinalDay = cohort ? canViewAllProfiles(cohort) : false;
  const showAllProfilesWithoutAuth = cohort ? canViewAllProfilesWithoutAuth(cohort) : false;

  // profileUnlockDate 체크: 설정된 날짜 이상이면 어제 인증자 전체 공개 모드
  const isUnlockDayOrAfter = cohort ? shouldShowAllYesterdayVerified(cohort) : false;

  // 새로운 규칙:
  // 1. 슈퍼관리자 OR 마지막 날 → 전체 공개
  // 2. profileUnlockDate 이상 + 오늘 인증 + 어제 인증자 존재 → 어제 인증자 전체 공개
  const showAllProfiles = isSuperAdmin || isFinalDay || (isUnlockDayOrAfter && !isLocked && yesterdayVerifiedIds && yesterdayVerifiedIds.size > 0);

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
        if (isFinalDay || isSuperAdmin) {
          // 마지막 날 또는 슈퍼관리자: 전체 참가자
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
        const derivedTheme = showAllProfiles
          ? (participant.gender === 'female' ? 'opposite' : 'similar')
          : (similarFeaturedIds.includes(participant.id) ? 'similar' : 'opposite');

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
      : allFeaturedIds.length > 0 && !!activeMatchingDate, // isLocked 조건 제거
    gcTime: 0, // 캐시 지속성 방지 (세션 간 캐시 문제 해결) - React Query v5: cacheTime → gcTime
    staleTime: 0, // 항상 신선한 데이터 fetch
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
    return (
      <PageTransition>
        <div className="app-shell flex flex-col overflow-hidden">
          <HeaderNavigation title="오늘의 서재" />

          <main className="app-main-content flex-1 overflow-y-auto bg-background">
            <div className="mx-auto max-w-md px-6 w-full">
              <div className="pb-6">
                <div className="flex flex-col gap-12">
                  <div className="flex flex-col gap-3">
                    {/* Title Skeleton */}
                    <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
                    {/* Subtitle Skeleton */}
                    <div className="h-6 w-40 bg-gray-200 rounded animate-pulse" />
                  </div>

                  {/* Bookmark Cards Skeleton */}
                  <div className="flex flex-col w-full">
                    <BookmarkRow
                      participants={[]}
                      theme="blue"
                      isLocked={false}
                      isLoading={true}
                      onCardClick={() => {}}
                    />
                    <BlurDivider />
                    <BookmarkRow
                      participants={[]}
                      theme="yellow"
                      isLocked={false}
                      isLoading={true}
                      onCardClick={() => {}}
                    />
                  </div>
                </div>
              </div>
            </div>
          </main>

          <FooterActions>
            <div className="h-14 bg-gray-200 rounded-lg animate-pulse" />
          </FooterActions>
        </div>
      </PageTransition>
    );
  }

  // 세션 or cohort 없음 (useEffect에서 리다이렉트 처리 중)
  // cohortLoading이 끝나지 않았으면 위의 스켈레톤 UI가 표시됨
  // 여기 도달 시점에는 검증 완료 상태이므로 안전하게 null 반환
  if (!participant || !cohort || !cohortId) {
    return null;
  }

  // v2.0: 프로필북 클릭 핸들러 (카드별 잠금 상태 확인)
  const handleProfileClickWithAuth = (
    participantId: string,
    theme: 'similar' | 'opposite',
    cardIndex?: number // v2.0: 카드 인덱스 (잠금 여부 판단용)
  ) => {
    // 15일차 이후: 인증 체크 완전 스킵
    if (showAllProfilesWithoutAuth) {
      const matchingDate = getSubmissionDate();
      const profileUrl = `${appRoutes.profile(participantId, cohortId, theme)}&matchingDate=${encodeURIComponent(matchingDate)}`;
      router.push(profileUrl);
      return;
    }

    // v2.0 랜덤 매칭: 카드별 잠금 체크
    if (isRandomMatching && cardIndex !== undefined) {
      const isCardLocked = isProfileBookLocked(cardIndex, profileBookAccess);

      if (isCardLocked) {
        toast({
          title: '프로필 잠김 🔒',
          description: `오늘의 독서를 인증하면 ${profileBookAccess.totalProfileBooks}개의 프로필북을 모두 열어볼 수 있어요`,
        });
        return;
      }

      // 열린 카드: 접근 허용
      const matchingDate = activeMatchingDate || getSubmissionDate();
      const profileUrl = `${appRoutes.profile(participantId, cohortId, theme)}&matchingDate=${encodeURIComponent(matchingDate)}`;
      router.push(profileUrl);
      return;
    }

    // 14일차: 전체 공개지만 인증 필요
    if (showAllProfiles && !showAllProfilesWithoutAuth) {
      if (isLocked) {
        toast({
          title: '프로필 잠김 🔒',
          description: '오늘의 독서를 인증하면 모든 프로필을 확인할 수 있어요 (마지막 날 특별 이벤트!)',
        });
        return;
      }

      const matchingDate = getSubmissionDate();
      const profileUrl = `${appRoutes.profile(participantId, cohortId, theme)}&matchingDate=${encodeURIComponent(matchingDate)}`;
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
          <HeaderNavigation title="오늘의 서재" />

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
          <HeaderNavigation title="오늘의 서재" />

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
                      프로필 북은 <strong className="text-gray-900">인증 다음날 오후 2시</strong>부터
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
  const maleParticipants: FeaturedParticipant[] = featuredParticipants.filter(
    (p) => !p.gender || p.gender === 'male'
  );
  const femaleParticipants: FeaturedParticipant[] = featuredParticipants.filter(
    (p) => p.gender === 'female'
  );

  // v2.0: 미인증 시 성별 기반 랜덤 선택 (남1+여1 보장)
  let unlockedMale: FeaturedParticipant[] = maleParticipants;
  let unlockedFemale: FeaturedParticipant[] = femaleParticipants;
  let genderDiversityWarning: string | null = null;

  if (isRandomMatching && isLocked && !isSuperAdmin) {
    // 미인증 v2.0: 각 성별에서 랜덤 1명씩 선택
    if (maleParticipants.length > 0 && femaleParticipants.length > 0) {
      // 이상적: 남/여 모두 있음 → 각 1명씩
      unlockedMale = [maleParticipants[Math.floor(Math.random() * maleParticipants.length)]];
      unlockedFemale = [femaleParticipants[Math.floor(Math.random() * femaleParticipants.length)]];
    } else if (maleParticipants.length > 0) {
      // 남성만 있음 → 남성 2명
      const shuffled = [...maleParticipants].sort(() => Math.random() - 0.5);
      unlockedMale = shuffled.slice(0, 2);
      unlockedFemale = [];
      genderDiversityWarning = '여성 프로필을 찾지 못해 남성 프로필 2개를 표시합니다';
    } else if (femaleParticipants.length > 0) {
      // 여성만 있음 → 여성 2명
      const shuffled = [...femaleParticipants].sort(() => Math.random() - 0.5);
      unlockedMale = [];
      unlockedFemale = shuffled.slice(0, 2);
      genderDiversityWarning = '남성 프로필을 찾지 못해 여성 프로필 2개를 표시합니다';
    }
  }

  // v2.0: 프로필북 개수 계산 (백엔드 할당 개수 기준)
  const totalCount = isRandomMatching
    ? assignedIds.length // 백엔드에서 할당한 전체 개수
    : featuredParticipants.length;

  const unlockedCount = isRandomMatching && isLocked
    ? unlockedMale.length + unlockedFemale.length // 실제 표시되는 개수 (2개)
    : totalCount;

  const lockedCount = totalCount - unlockedCount;
  const shouldShowLockedCards = isRandomMatching && isLocked;
  const visibleMale = shouldShowLockedCards ? unlockedMale : maleParticipants;
  const visibleFemale = shouldShowLockedCards ? unlockedFemale : femaleParticipants;
  const maleLockedSlots = shouldShowLockedCards ? Math.ceil(lockedCount / 2) : 0;
  const femaleLockedSlots = shouldShowLockedCards ? Math.floor(lockedCount / 2) : 0;

  return (
    <PageTransition>
      <div className="app-shell flex flex-col overflow-hidden">
        <HeaderNavigation title="오늘의 서재" />

        {/* Main Content */}
        <main className="app-main-content flex-1 overflow-y-auto bg-background">
          <div className="mx-auto max-w-md px-6 w-full pt-3 md:pt-2 pb-6">
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
                      : isUnlockDayOrAfter && showAllProfiles
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
                  /* 전체 공개: 성별 2열 레이아웃 (마지막 날) */
                  <div className="grid grid-cols-2 gap-6">
                    {/* 왼쪽: 남자 */}
                    <div className="flex flex-col gap-4">
                      {maleParticipants.map((p, index) => (
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
                          {index < maleParticipants.length - 1 && <BlurDivider />}
                        </div>
                      ))}
                    </div>

                    {/* 오른쪽: 여자 */}
                    <div className="flex flex-col gap-4">
                      {femaleParticipants.map((p, index) => (
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
                          {index < femaleParticipants.length - 1 && <BlurDivider />}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* 기본/랜덤 모드: 성별 2열 + (필요 시) 자물쇠 카드 */
                  <div className="grid grid-cols-2 gap-6">
                    {/* 왼쪽: 남자 */}
                    <div className="flex flex-col gap-4">
                      {visibleMale.map((p, idx) => {
                        const cardIndex = idx; // 남성: 0부터 시작
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
                        // 자물쇠 인덱스는 항상 unlockedProfileBooks(=2) 이상
                        const totalUnlockedCount = visibleMale.length + visibleFemale.length;
                        const minLockedIndex = Math.max(totalUnlockedCount, profileBookAccess.unlockedProfileBooks);
                        const cardIndex = minLockedIndex + idx;
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
                      {visibleFemale.map((p, idx) => {
                        const cardIndex = visibleMale.length + idx; // 남성 이후 연속 인덱스
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
                        // 자물쇠 인덱스는 항상 unlockedProfileBooks(=2) 이상
                        const totalUnlockedCount = visibleMale.length + visibleFemale.length;
                        const minLockedIndex = Math.max(totalUnlockedCount, profileBookAccess.unlockedProfileBooks);
                        const cardIndex = minLockedIndex + maleLockedSlots + idx;
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
          <div className="mx-auto max-w-md px-6 w-full">
            <div className="pb-6">
              <div className="flex flex-col gap-12">
                <div className="flex flex-col gap-3">
                  <div className="h-8 w-48 shimmer rounded" />
                  <div className="h-6 w-40 shimmer rounded" />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </PageTransition>
  );
}

export default function TodayLibraryPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <TodayLibraryContent />
    </Suspense>
  );
}
