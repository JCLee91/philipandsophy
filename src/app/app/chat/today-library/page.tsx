'use client';

import { Suspense, useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PageTransition from '@/components/PageTransition';
import BookmarkCard from '@/components/BookmarkCard';
import BookmarkCardSkeleton from '@/components/BookmarkCardSkeleton';
import HeaderNavigation from '@/components/HeaderNavigation';
import EllipseShadow from '@/components/EllipseShadow';
import FooterActions from '@/components/FooterActions';
import BlurDivider from '@/components/BlurDivider';
import UnifiedButton from '@/components/UnifiedButton';
import ReadingSubmissionDialog from '@/components/ReadingSubmissionDialog';
import { useCohort } from '@/hooks/use-cohorts';
import { useVerifiedToday } from '@/hooks/use-verified-today';
import { useToast } from '@/hooks/use-toast';
import { useSession } from '@/hooks/use-session';
import { format } from 'date-fns';
import { getDb } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import type { Participant } from '@/types/database';
import { SHADOW_OFFSETS, SPACING } from '@/constants/today-library';
import { APP_CONSTANTS } from '@/constants/app';
import { getTodayString } from '@/lib/date-utils';
import { appRoutes } from '@/lib/navigation';

// Firestore 'in' query limit
const FIRESTORE_IN_LIMIT = 10;

type FeaturedParticipant = Participant & { theme: 'similar' | 'opposite' };

function TodayLibraryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cohortId = searchParams.get('cohort');

  // 세션 기반 인증 (URL에서 userId 제거)
  const { currentUser, isLoading: sessionLoading } = useSession();
  const currentUserId = currentUser?.id;

  const { data: cohort, isLoading: cohortLoading } = useCohort(cohortId || undefined);
  const { data: verifiedIds } = useVerifiedToday();
  const { toast } = useToast();

  // 독서 인증 다이얼로그 상태
  const [submissionDialogOpen, setSubmissionDialogOpen] = useState(false);

  // 오늘 날짜
  const today = getTodayString();

  // 오늘의 매칭 결과
  const rawMatching = cohort?.dailyFeaturedParticipants?.[today];
  const todayMatching = useMemo(() => {
    // 매칭 데이터가 없으면 null 반환 (fallback 제거)
    if (!rawMatching) {
      return null;
    }

    if ('featured' in rawMatching || 'assignments' in rawMatching) {
      const featured = rawMatching.featured ?? { similar: [], opposite: [] };
      return {
        featured: {
          similar: featured.similar ?? [],
          opposite: featured.opposite ?? [],
        },
        assignments: rawMatching.assignments ?? {},
      };
    }

    // Legacy 데이터 호환용
    return {
      featured: {
        similar: rawMatching.similar ?? [],
        opposite: rawMatching.opposite ?? [],
      },
      assignments: {},
    };
  }, [rawMatching]);

  const userAssignment = currentUserId && todayMatching
    ? todayMatching.assignments?.[currentUserId] ?? null
    : null;

  const similarFeaturedIds =
    (userAssignment?.similar && userAssignment.similar.length > 0
      ? userAssignment.similar
      : todayMatching?.featured?.similar) ?? [];
  const oppositeFeaturedIds =
    (userAssignment?.opposite && userAssignment.opposite.length > 0
      ? userAssignment.opposite
      : todayMatching?.featured?.opposite) ?? [];

  const allFeaturedIds = Array.from(
    new Set([...similarFeaturedIds, ...oppositeFeaturedIds])
  );

  // 추천 참가자들의 정보 가져오기
  const { data: featuredParticipants = [], isLoading: participantsLoading } = useQuery<FeaturedParticipant[]>({
    queryKey: ['featured-participants', allFeaturedIds],
    queryFn: async () => {
      if (allFeaturedIds.length === 0) return [];

      const db = getDb();
      const participantsRef = collection(db, 'participants');

      // Firestore 'in' 연산자는 최대 10개 제한
      // 10개 초과 시 청크로 분할하여 병렬 쿼리
      if (allFeaturedIds.length > FIRESTORE_IN_LIMIT) {
        logger.warn(`Featured participants (${allFeaturedIds.length}) exceeds Firestore 'in' limit (${FIRESTORE_IN_LIMIT}). Splitting into chunks.`);

        // 청크로 분할
        const chunks: string[][] = [];
        for (let i = 0; i < allFeaturedIds.length; i += FIRESTORE_IN_LIMIT) {
          chunks.push(allFeaturedIds.slice(i, i + FIRESTORE_IN_LIMIT));
        }

        // 병렬 쿼리 실행
        const results = await Promise.all(
          chunks.map(chunk => {
            const q = query(participantsRef, where('__name__', 'in', chunk));
            return getDocs(q);
          })
        );

        // 결과 병합
        const participants: Participant[] = [];
        results.forEach(snapshot => {
          snapshot.docs.forEach(doc => {
            participants.push({
              id: doc.id,
              ...doc.data(),
            } as Participant);
          });
        });

        // Theme 정보 추가
        return participants.map((participant) => ({
          ...participant,
          theme: similarFeaturedIds.includes(participant.id) ? 'similar' : 'opposite',
        }));
      }

      // 10개 이하: 단일 쿼리
      const q = query(participantsRef, where('__name__', 'in', allFeaturedIds));
      const snapshot = await getDocs(q);

      const participants = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Participant[];

      // 각 참가자에 theme 정보 추가
      return participants.map((participant) => ({
        ...participant,
        theme: similarFeaturedIds.includes(participant.id) ? 'similar' : 'opposite',
      }));
    },
    enabled: allFeaturedIds.length > 0,
  });

  // 세션 및 cohort 검증
  useEffect(() => {
    if (!sessionLoading) {
      if (!currentUser) {
        router.replace('/app');
        return;
      }
      if (!cohortId) {
        router.replace('/app');
        return;
      }
    }
  }, [sessionLoading, currentUser, cohortId, router]);

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
                    {/* Top Row Skeleton */}
                    <div className="h-[140px] overflow-hidden relative w-full">
                      <EllipseShadow topOffset={SHADOW_OFFSETS.TOP_ROW} gradientId="ellipse-gradient-skeleton-1" />
                      <div className="flex justify-center relative z-10" style={{ gap: `${SPACING.CARD_GAP}px` }}>
                        <BookmarkCardSkeleton theme="blue" />
                        <BookmarkCardSkeleton theme="blue" />
                      </div>
                    </div>

                    <BlurDivider />

                    {/* Bottom Row Skeleton */}
                    <div className="h-[160px] overflow-hidden relative w-full">
                      <EllipseShadow topOffset={SHADOW_OFFSETS.BOTTOM_ROW} gradientId="ellipse-gradient-skeleton-2" />
                      <div className="flex justify-center pt-6 relative z-10" style={{ gap: `${SPACING.CARD_GAP}px` }}>
                        <BookmarkCardSkeleton theme="yellow" />
                        <BookmarkCardSkeleton theme="yellow" />
                      </div>
                    </div>
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

  // 세션 or cohort 없음 (useEffect에서 리다이렉트 처리됨)
  if (!currentUser || !cohort || !cohortId) {
    return null;
  }

  // 오늘 인증 여부 (방어적 프로그래밍)
  const isVerifiedToday = verifiedIds?.has(currentUserId || '') ?? false;
  const isAdmin = currentUser?.isAdmin === true;
  const isLocked = !isAdmin && !isVerifiedToday;

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
    router.push(appRoutes.profile(participantId, cohortId, theme));
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
                  {/* Top Row (Blue Theme - Similar) */}
                  <div className="h-[140px] overflow-hidden relative w-full">
                    <EllipseShadow topOffset={SHADOW_OFFSETS.TOP_ROW} gradientId="ellipse-gradient-1" />
                    <div className="flex justify-center relative z-10" style={{ gap: `${SPACING.CARD_GAP}px` }}>
                      {lockedPlaceholders.similar.map((participant, index) => (
                        <BookmarkCard
                          key={`similar-${participant.id}`}
                          profileImage={participant.profileImage || APP_CONSTANTS.DEFAULT_PROFILE_IMAGE}
                          name={participant.name}
                          theme="blue"
                          isLocked={true}
                          lockedImage={`/image/today-library/locked-profile-${index + 1}.png`}
                          onClick={() => handleProfileClickWithAuth(participant.id, 'similar')}
                        />
                      ))}
                    </div>
                  </div>

                  <BlurDivider />

                  {/* Bottom Row (Yellow Theme - Opposite) */}
                  <div className="h-[160px] overflow-hidden relative w-full">
                    <EllipseShadow topOffset={SHADOW_OFFSETS.BOTTOM_ROW} gradientId="ellipse-gradient-2" />
                    <div className="flex justify-center pt-6 relative z-10" style={{ gap: `${SPACING.CARD_GAP}px` }}>
                      {lockedPlaceholders.opposite.map((participant, index) => (
                        <BookmarkCard
                          key={`opposite-${participant.id}`}
                          profileImage={participant.profileImage || APP_CONSTANTS.DEFAULT_PROFILE_IMAGE}
                          name={participant.name}
                          theme="yellow"
                          isLocked={true}
                          lockedImage={`/image/today-library/locked-profile-${index + 3}.png`}
                          onClick={() => handleProfileClickWithAuth(participant.id, 'opposite')}
                        />
                      ))}
                    </div>
                  </div>

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
                {/* Top Row (Blue Theme - Similar) */}
                <div className="h-[140px] overflow-hidden relative w-full">
                  <EllipseShadow topOffset={SHADOW_OFFSETS.TOP_ROW} gradientId="ellipse-gradient-1" />
                  <div className="flex justify-center relative z-10" style={{ gap: `${SPACING.CARD_GAP}px` }}>
                    {similarParticipants.map((participant, index) => (
                      <BookmarkCard
                        key={`similar-${participant.id}`}
                        profileImage={participant.profileImage || APP_CONSTANTS.DEFAULT_PROFILE_IMAGE}
                        name={participant.name}
                        theme="blue"
                        isLocked={false}
                        lockedImage={`/image/today-library/locked-profile-${index + 1}.png`}
                        onClick={() => handleProfileClickWithAuth(participant.id, 'similar')}
                      />
                    ))}
                  </div>
                </div>

                <BlurDivider />

                {/* Bottom Row (Yellow Theme - Opposite) */}
                <div className="h-[160px] overflow-hidden relative w-full">
                  <EllipseShadow topOffset={SHADOW_OFFSETS.BOTTOM_ROW} gradientId="ellipse-gradient-2" />
                  <div className="flex justify-center pt-6 relative z-10" style={{ gap: `${SPACING.CARD_GAP}px` }}>
                    {oppositeParticipants.map((participant, index) => (
                      <BookmarkCard
                        key={`opposite-${participant.id}`}
                        profileImage={participant.profileImage || APP_CONSTANTS.DEFAULT_PROFILE_IMAGE}
                        name={participant.name}
                        theme="yellow"
                        isLocked={false}
                        lockedImage={`/image/today-library/locked-profile-${index + 3}.png`}
                        onClick={() => handleProfileClickWithAuth(participant.id, 'opposite')}
                      />
                    ))}
                  </div>
                </div>

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
            className="flex-1"
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
