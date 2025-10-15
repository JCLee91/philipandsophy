'use client';

import { Suspense, useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PageTransition from '@/components/PageTransition';
import BookmarkRow from '@/components/BookmarkRow';
import HeaderNavigation from '@/components/HeaderNavigation';
import FooterActions from '@/components/FooterActions';
import BlurDivider from '@/components/BlurDivider';
import UnifiedButton from '@/components/UnifiedButton';
import ReadingSubmissionDialog from '@/components/ReadingSubmissionDialog';
import { useCohort } from '@/hooks/use-cohorts';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useAccessControl } from '@/hooks/use-access-control';
import { getDb } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import type { Participant } from '@/types/database';
import { getTodayString, getYesterdayString } from '@/lib/date-utils';
import { normalizeMatchingData } from '@/lib/matching-utils';
import { appRoutes } from '@/lib/navigation';

type FeaturedParticipant = Participant & { theme: 'similar' | 'opposite' };

function TodayLibraryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cohortId = searchParams.get('cohort');

  // 세션 기반 인증 (URL에서 userId 제거)
  const { currentUser, isLoading: sessionLoading } = useAuth();
  const currentUserId = currentUser?.id;

  const { data: cohort, isLoading: cohortLoading } = useCohort(cohortId || undefined);
  const { toast } = useToast();
  const { isVerified, isAdmin, isLocked } = useAccessControl();

  // 독서 인증 다이얼로그 상태
  const [submissionDialogOpen, setSubmissionDialogOpen] = useState(false);

  // 날짜 정의
  const submissionDate = getYesterdayString(); // 제출 날짜 (어제 데이터)
  const matchingDate = getTodayString(); // 매칭 실행 날짜 (오늘, Firebase 키)

  // 오늘의 매칭 결과 (matchingDate 키로 조회, 없으면 submissionDate로 fallback)
  // 어제 제출분으로 오늘 매칭을 실행했기 때문에 matchingDate(오늘) 키로 저장됨
  // 임시: 오늘 날짜로 못 찾으면 어제 날짜도 확인 (날짜 키 혼란 대응)
  const rawMatching = cohort?.dailyFeaturedParticipants?.[matchingDate]
    || cohort?.dailyFeaturedParticipants?.[submissionDate];
  const todayMatching = useMemo(() => {
    // 매칭 데이터가 없으면 null 반환
    if (!rawMatching) return null;

    // v1.0/v2.0 형식 모두 처리
    return normalizeMatchingData(rawMatching);
  }, [rawMatching]);

  const userAssignment = currentUserId && todayMatching
    ? todayMatching.assignments?.[currentUserId] ?? null
    : null;

  const similarFeaturedIds = userAssignment?.similar ?? [];
  const oppositeFeaturedIds = userAssignment?.opposite ?? [];

  const allFeaturedIds = Array.from(
    new Set([...similarFeaturedIds, ...oppositeFeaturedIds])
  );

  // 추천 참가자들의 정보 가져오기
  const { data: featuredParticipants = [], isLoading: participantsLoading } = useQuery<FeaturedParticipant[]>({
    queryKey: ['featured-participants-v3', allFeaturedIds],
    queryFn: async () => {
      if (allFeaturedIds.length === 0) return [];

      const db = getDb();
      const participantsRef = collection(db, 'participants');

      // 단일 쿼리 (Featured는 항상 4명 이하이므로 Firestore 'in' 제한 10개 이하)
      const q = query(participantsRef, where('__name__', 'in', allFeaturedIds));
      const snapshot = await getDocs(q);

      const participants = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Participant[];

      // 각 참가자에 theme 정보 추가
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
          theme: similarFeaturedIds.includes(participant.id) ? 'similar' : 'opposite',
        };
      });
    },
    // 🔒 보안 수정: 인증된 유저(또는 관리자)만 개인정보 다운로드 가능
    enabled: allFeaturedIds.length > 0 && !isLocked,
    gcTime: 0, // 캐시 지속성 방지 (세션 간 캐시 문제 해결) - React Query v5: cacheTime → gcTime
    staleTime: 0, // 항상 신선한 데이터 fetch
  });

  // 세션 및 cohort 검증
  useEffect(() => {
    if (!sessionLoading && !cohortLoading) {
      if (!currentUser) {
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
  }, [sessionLoading, cohortLoading, currentUser, cohortId, cohort, router, toast]);

  // 로딩 상태 - 스켈레톤 UI 표시
  if (sessionLoading || cohortLoading || participantsLoading) {
    return (
      <PageTransition>
        <div className="app-shell flex flex-col overflow-hidden">
          <HeaderNavigation title="오늘의 서재" />

          <main className="flex-1 overflow-y-auto bg-background">
            <div className="mx-auto max-w-md px-4 w-full">
              <div className="pt-12 pb-8">
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
  if (!currentUser || !cohort || !cohortId) {
    return null;
  }

  // 프로필북 클릭 핸들러 (인증 체크는 isLocked에서 이미 완료)
  const handleProfileClickWithAuth = (participantId: string, theme: 'similar' | 'opposite') => {
    // isLocked가 true인 경우 이 함수는 자물쇠 카드에서만 호출됨
    // Toast는 미인증 상태에서 카드 클릭 시 표시
    if (isLocked) {
      toast({
        title: '프로필 잠김 🔒',
        description: '오늘의 독서를 인증하면 프로필을 확인할 수 있어요',
      });
      return;
    }
    // 제출 날짜를 URL에 포함하여 스포일러 방지 (오늘 제출분은 아직 안 보이도록)
    const profileUrl = `${appRoutes.profile(participantId, cohortId, theme)}&matchingDate=${encodeURIComponent(submissionDate)}`;
    router.push(profileUrl);
  };

  // 1단계: 미인증 유저는 무조건 자물쇠 더미 카드 표시
  if (isLocked) {
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
          <main className="flex-1 overflow-y-auto bg-background">
            <div className="mx-auto max-w-md px-4 w-full">
              <div className="pt-12 pb-8">
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
            open={submissionDialogOpen}
            onOpenChange={setSubmissionDialogOpen}
            participantId={currentUserId || ''}
            participationCode={currentUserId || ''}
          />
        </div>
      </PageTransition>
    );
  }

  // 2단계: 인증 완료 유저 중 매칭 데이터가 없는 경우
  if (allFeaturedIds.length === 0) {
    return (
      <PageTransition>
        <div className="app-shell flex flex-col overflow-hidden">
          <HeaderNavigation title="오늘의 서재" />

          <main className="flex flex-1 overflow-y-auto items-center justify-center bg-background">
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
  // 참가자를 theme별로 분리
  const similarParticipants = featuredParticipants.filter(p => p.theme === 'similar');
  const oppositeParticipants = featuredParticipants.filter(p => p.theme === 'opposite');

  return (
    <PageTransition>
      <div className="app-shell flex flex-col overflow-hidden">
        <HeaderNavigation title="오늘의 서재" />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-background">
          <div className="mx-auto max-w-md px-4 w-full">
            <div className="pt-12 pb-8">
              {/* Header Section */}
              <div className="flex flex-col gap-12">
              <div className="flex flex-col gap-3">
                <h1 className="font-bold text-heading-xl text-black">
                  프로필 북을
                  <br />
                  확인해보세요
                </h1>
                <p className="font-medium text-body-base text-text-secondary">
                  밤 12시까지만 읽을 수 있어요
                </p>
              </div>

              {/* Bookmark Cards Section */}
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
        <main className="flex-1 overflow-y-auto bg-background">
          <div className="mx-auto max-w-md px-4 w-full">
            <div className="pt-12 pb-8">
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
