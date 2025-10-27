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
import ReadingSubmissionDialog from '@/components/ReadingSubmissionDialog';
import { useCohort } from '@/hooks/use-cohorts';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useAccessControl } from '@/hooks/use-access-control';
import { useParticipantSubmissionsRealtime } from '@/hooks/use-submissions';
import { getDb } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useQuery } from '@tanstack/react-query';
import type { Participant } from '@/types/database';
import { findLatestMatchingForParticipant } from '@/lib/matching-utils';
import { appRoutes } from '@/lib/navigation';
import { getTodayString, getMatchingAccessDates, canViewAllProfiles, canViewAllProfilesWithoutAuth } from '@/lib/date-utils';


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

  const { data: cohort, isLoading: cohortLoading } = useCohort(cohortId || undefined);
  const { toast } = useToast();
  const todayDate = getTodayString();
  const { data: viewerSubmissions = [], isLoading: viewerSubmissionLoading } = useParticipantSubmissionsRealtime(currentUserId);
  const viewerSubmissionDates = useMemo(
    () => new Set(viewerSubmissions.map((submission) => submission.submissionDate)),
    [viewerSubmissions]
  );
  const viewerHasSubmittedToday = viewerSubmissionDates.has(todayDate);

  // 제출일 기준 공개되는 프로필북 날짜 (제출 다음날 OR 오늘 인증 시 즉시)
  const allowedMatchingDates = useMemo(
    () => getMatchingAccessDates(viewerSubmissionDates),
    [viewerSubmissionDates]
  );

  // 독서 인증 다이얼로그 상태
  const [submissionDialogOpen, setSubmissionDialogOpen] = useState(false);

  const matchingLookup = useMemo(() => {
    if (!cohort?.dailyFeaturedParticipants || !currentUserId) {
      return null;
    }

    return findLatestMatchingForParticipant(
      cohort.dailyFeaturedParticipants,
      currentUserId,
      isSuperAdmin
        ? { preferredDate: viewerHasSubmittedToday ? todayDate : undefined }
        : {
            preferredDate: viewerHasSubmittedToday ? todayDate : undefined,
            allowedDates: allowedMatchingDates,
          }
    );
  }, [cohort?.dailyFeaturedParticipants, currentUserId, isSuperAdmin, viewerHasSubmittedToday, todayDate, allowedMatchingDates]);

  const activeMatchingDate = matchingLookup?.date ?? null;
  const assignments = matchingLookup?.matching.assignments ?? {};

  const userAssignment = currentUserId && assignments
    ? assignments[currentUserId] ?? null
    : null;

  const similarFeaturedIds = userAssignment?.similar ?? [];
  const oppositeFeaturedIds = userAssignment?.opposite ?? [];

  const allFeaturedIds = Array.from(
    new Set([...similarFeaturedIds, ...oppositeFeaturedIds])
  );

  // Step 2-2: 마지막 날 체크
  // 슈퍼관리자는 1일차부터 항상 전체 프로필 볼 수 있음 (인증 불필요)
  const showAllProfiles = isSuperAdmin || (cohort ? canViewAllProfiles(cohort) : false);
  const showAllProfilesWithoutAuth = cohort ? canViewAllProfilesWithoutAuth(cohort) : false;

  // 추천 참가자들의 정보 가져오기
  // 마지막 날이면 전체 참가자 쿼리, 아니면 매칭된 4명만
  const { data: featuredParticipants = [], isLoading: participantsLoading } = useQuery<FeaturedParticipant[]>({
    queryKey: showAllProfiles
      ? ['all-participants-final-day', cohortId, currentUserId]
      : ['featured-participants-v3', activeMatchingDate, allFeaturedIds],
    queryFn: async () => {
      const db = getDb();
      const participantsRef = collection(db, 'participants');

      let participants: Participant[] = [];

      if (showAllProfiles) {
        // Step 2-3: 마지막 날 - 전체 참가자 로드 (본인 + 슈퍼관리자 제외)
        // ✅ cohortId 필터 추가
        const q = query(participantsRef, where('cohortId', '==', cohortId));
        const allSnapshot = await getDocs(q);
        participants = allSnapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Participant[];

        // 본인과 슈퍼관리자 제외
        participants = participants.filter(
          (p) => p.id !== currentUserId && !p.isSuperAdmin
        );
      } else {
        // 평소 - 매칭된 4명만
        if (allFeaturedIds.length === 0) return [];

        const q = query(participantsRef, where('__name__', 'in', allFeaturedIds));
        const snapshot = await getDocs(q);

        participants = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Participant[];
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
        return {
          ...participant,
          profileImage: circleImage || participant.profileImage, // 원형 이미지로 교체
          profileImageCircle: circleImage,
          theme: showAllProfiles
            ? 'similar' // 마지막 날은 theme 구분 없음 (나중에 성별로 분류)
            : (similarFeaturedIds.includes(participant.id) ? 'similar' : 'opposite'),
        };
      });
    },
    // 🔒 보안 수정: 인증된 유저(또는 관리자)만 개인정보 다운로드 가능
    // 단, 마지막 날부터 7일간은 인증 없이도 전체 프로필 조회 가능
    enabled: showAllProfiles
      ? !!cohort && !!currentUserId
      : !isLocked && allFeaturedIds.length > 0 && !!activeMatchingDate,
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

  // 로딩 상태 - 스켈레톤 UI 표시
  if (sessionLoading || cohortLoading || participantsLoading || viewerSubmissionLoading) {
    return (
      <PageTransition>
        <div className="app-shell flex flex-col overflow-hidden">
          <HeaderNavigation title="오늘의 서재" />

          <main className="app-main-content flex-1 overflow-y-auto bg-background">
            <div className="mx-auto max-w-md px-4 w-full">
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

  // 프로필북 클릭 핸들러 (인증 체크는 isLocked에서 이미 완료)
  const handleProfileClickWithAuth = (participantId: string, theme: 'similar' | 'opposite') => {
    // 15일차 이후: 인증 체크 완전 스킵 (별도 로직)
    if (showAllProfilesWithoutAuth) {
      // 인증 없이 바로 접근 가능
      const matchingDate = getTodayString();
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
      // 인증됨 - 접근 허용
      const matchingDate = getTodayString();
      const profileUrl = `${appRoutes.profile(participantId, cohortId, theme)}&matchingDate=${encodeURIComponent(matchingDate)}`;
      router.push(profileUrl);
      return;
    }

    // 평소 (1-13일차): 기존 로직
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

    // 매칭 날짜를 URL에 포함하여 스포일러 방지
    const profileUrl = `${appRoutes.profile(participantId, cohortId, theme)}&matchingDate=${encodeURIComponent(activeMatchingDate)}`;
    router.push(profileUrl);
  };

  // 1단계: 미인증 유저는 자물쇠 더미 카드 표시
  // 단, 다음 경우는 인증 없이도 전체 프로필 공개:
  // - 슈퍼관리자 (언제든지)
  // - 15일차 이후 (일반 유저, 인증 불필요)
  // 14일차는 showAllProfiles = true 이지만 인증 필요 (isLocked 체크 필요)
  if (isLocked && !isSuperAdmin && !showAllProfilesWithoutAuth) {
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
            <div className="mx-auto max-w-md px-4 w-full">
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
                    밤 12시까지 독서를 인증하고
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
                onClick={() => setSubmissionDialogOpen(true)}
                className="flex-1"
              >
                독서 인증하기
              </UnifiedButton>
            </div>
          </FooterActions>

          {/* 독서 인증 다이얼로그 */}
          <ReadingSubmissionDialog
            open={submissionDialogOpen && !!cohortId}
            onOpenChange={setSubmissionDialogOpen}
            participantId={currentUserId || ''}
            participationCode={currentUserId || ''}
            cohortId={cohortId || ''}
          />
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
                    AI가 답변을 분석해서
                    <br />
                    프로필 북을 섞고 있어요
                  </h3>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 leading-relaxed">
                      멤버들이 제출한 답변들은
                      <br />
                      인증 다음날 오후 4시에 열어볼 수 있어요
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

  // 3단계: 인증 완료 + 매칭 데이터 있음 → 실제 프로필 카드 표시
  // Step 2-4: 성별 분류 (마지막 날에만 적용)
  let maleParticipants: FeaturedParticipant[] = [];
  let femaleParticipants: FeaturedParticipant[] = [];
  let similarParticipants: FeaturedParticipant[] = [];
  let oppositeParticipants: FeaturedParticipant[] = [];

  if (showAllProfiles) {
    // 마지막 날: 성별로 분류
    maleParticipants = featuredParticipants.filter(p => p.gender === 'male');
    femaleParticipants = featuredParticipants.filter(p => p.gender === 'female');
  } else {
    // 평소: theme별로 분류
    similarParticipants = featuredParticipants.filter(p => p.theme === 'similar');
    oppositeParticipants = featuredParticipants.filter(p => p.theme === 'opposite');
  }

  return (
    <PageTransition>
      <div className="app-shell flex flex-col overflow-hidden">
        <HeaderNavigation title="오늘의 서재" />

        {/* Main Content */}
        <main className="app-main-content flex-1 overflow-y-auto bg-background">
          <div className="mx-auto max-w-md px-4 w-full">
            <div className="pt-6 pb-6">
              <div className="flex flex-col gap-12">
                {/* Header Section */}
                <div className="flex flex-col gap-3">
                  <h1 className="font-bold text-heading-xl text-black">
                    프로필 북을
                    <br />
                    확인해보세요
                  </h1>
                  <p className="font-medium text-body-base text-text-secondary">
                    {showAllProfiles
                      ? '14일간의 여정을 마치며 모든 멤버의 프로필을 공개합니다'
                      : '밤 12시까지만 읽을 수 있어요'
                    }
                  </p>
                </div>

                {/* Step 3-2, 3-3: 마지막 날 좌우 2열 레이아웃 (전체 스크롤) */}
                {showAllProfiles ? (
                  <div className="grid grid-cols-2 gap-6">
                    {/* 왼쪽: 남자 */}
                    <div className="flex flex-col gap-4">
                      {maleParticipants.map((p, index) => (
                        <div key={p.id} className="flex flex-col">
                          <div className="flex justify-center">
                            <BookmarkCard
                              profileImage={p.profileImageCircle || p.profileImage || '/image/default-profile.svg'}
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
                              profileImage={p.profileImageCircle || p.profileImage || '/image/default-profile.svg'}
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
                  /* 평소: 기존 2x2 그리드 레이아웃 */
                  <div className="flex flex-col w-full">
                    <BookmarkRow
                      participants={similarParticipants}
                      theme="blue"
                      isLocked={false}
                      onCardClick={handleProfileClickWithAuth}
                    />
                    <BlurDivider />
                    <BookmarkRow
                      participants={oppositeParticipants}
                      theme="yellow"
                      isLocked={false}
                      onCardClick={handleProfileClickWithAuth}
                    />
                    <BlurDivider />
                  </div>
                )}

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
          <div className="mx-auto max-w-md px-4 w-full">
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
