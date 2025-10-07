'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import PageTransition from '@/components/PageTransition';
import BookmarkCard from '@/components/BookmarkCard';
import BookmarkCardSkeleton from '@/components/BookmarkCardSkeleton';
import HeaderNavigation from '@/components/HeaderNavigation';
import EllipseShadow from '@/components/EllipseShadow';
import FooterActions from '@/components/FooterActions';
import BlurDivider from '@/components/BlurDivider';
import { useCohort } from '@/hooks/use-cohorts';
import { useParticipant } from '@/hooks/use-participants';
import { useVerifiedToday } from '@/hooks/use-verified-today';
import { format } from 'date-fns';
import { getDb } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import type { Participant } from '@/types/database';
import { SHADOW_OFFSETS, SPACING } from '@/constants/today-library';
import { APP_CONSTANTS } from '@/constants/app';

type FeaturedParticipant = Participant & { theme: 'similar' | 'opposite' };

function TodayLibraryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cohortId = searchParams.get('cohort');
  const currentUserId = searchParams.get('userId');

  const { data: cohort, isLoading: cohortLoading } = useCohort(cohortId || undefined);
  const { data: currentUser, isLoading: currentUserLoading } = useParticipant(currentUserId || undefined);
  const { data: verifiedIds } = useVerifiedToday();

  // 오늘 날짜
  const today = format(new Date(), 'yyyy-MM-dd');

  // 오늘의 추천 참가자 (실제 데이터 우선, 없으면 디자인 확인용 fallback)
  const todayFeatured = cohort?.dailyFeaturedParticipants?.[today] || {
    similar: ['1', '2'],
    opposite: ['3', '4']
  };
  const allFeaturedIds = [...(todayFeatured.similar || []), ...(todayFeatured.opposite || [])];

  // 추천 참가자들의 정보 가져오기
  const { data: featuredParticipants = [], isLoading: participantsLoading } = useQuery<FeaturedParticipant[]>({
    queryKey: ['featured-participants', allFeaturedIds],
    queryFn: async () => {
      if (allFeaturedIds.length === 0) return [];

      const db = getDb();
      const participantsRef = collection(db, 'participants');
      const q = query(participantsRef, where('__name__', 'in', allFeaturedIds));
      const snapshot = await getDocs(q);

      const participants = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Participant[];

      // 각 참가자에 theme 정보 추가
      return participants.map((participant) => ({
        ...participant,
        theme: (todayFeatured.similar || []).includes(participant.id) ? 'similar' : 'opposite'
      }));
    },
    enabled: allFeaturedIds.length > 0,
  });

  // 로딩 상태 - 스켈레톤 UI 표시
  if (cohortLoading || currentUserLoading || participantsLoading) {
    return (
      <PageTransition>
        <div className="flex h-screen flex-col overflow-hidden">
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

          <div className="shrink-0 border-t bg-white pb-safe">
            <div className="mx-auto max-w-md px-6 pt-4 pb-8">
              <div className="h-12 bg-gray-200 rounded-lg animate-pulse" />
            </div>
          </div>
        </div>
      </PageTransition>
    );
  }

  // 데이터 확인
  if (!cohortId || !currentUserId || !cohort || !currentUser) {
    router.push('/');
    return null;
  }

  // 오늘 인증 여부
  const isVerifiedToday = verifiedIds?.has(currentUserId);
  const isAdmin = currentUser?.isAdmin === true;

  // 프로필북 클릭 핸들러 (인증 체크 포함)
  const handleProfileClickWithAuth = (participantId: string, theme: 'similar' | 'opposite') => {
    if (!isAdmin && !isVerifiedToday) {
      // 미인증 시 인라인 메시지가 표시되어 있으므로 클릭 방지만 수행
      return;
    }
    router.push(`/app/profile/${participantId}?cohort=${cohortId}&userId=${currentUserId}&theme=${theme}`);
  };

  // 추천 참가자가 없을 때
  if (allFeaturedIds.length === 0) {
    return (
      <PageTransition>
        <div className="flex h-screen flex-col overflow-hidden">
          <HeaderNavigation title="오늘의 서재" />

          <main className="flex flex-1 items-center justify-center bg-background overflow-y-auto">
            <div className="mx-auto max-w-md px-6">
              <div className="text-center space-y-6">
                {/* Empty State Icon */}
                <div className="flex justify-center">
                  <div className="size-20 rounded-full bg-gray-100 flex items-center justify-center">
                    <svg className="size-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                </div>

                {/* Empty State Message */}
                <div className="space-y-2">
                  <h3 className="font-bold text-lg text-gray-900">
                    오늘의 추천 프로필이 아직 준비중이에요
                  </h3>
                  <p className="text-sm text-gray-600">
                    곧 흥미로운 프로필 북이 업데이트될 예정입니다.
                    <br />
                    먼저 내 프로필 북을 확인해보세요!
                  </p>
                </div>

                {/* CTA Button */}
                <button
                  type="button"
                  onClick={() => router.push(`/app/profile/${currentUserId}?cohort=${cohortId}&userId=${currentUserId}`)}
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

  // 미인증 유저에게는 프로필 가리기
  const isLocked = !isAdmin && !isVerifiedToday;

  // 참가자를 theme별로 분리
  const similarParticipants = featuredParticipants.filter(p => p.theme === 'similar');
  const oppositeParticipants = featuredParticipants.filter(p => p.theme === 'opposite');

  return (
    <PageTransition>
      <div className="flex h-screen flex-col overflow-hidden">
        <HeaderNavigation title="오늘의 서재" />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-background">
          <div className="mx-auto max-w-md px-4 w-full">
            <div className="pt-12 pb-8">
              {/* Header Section */}
              <div className="flex flex-col gap-12">
              <div className="flex flex-col gap-3">
                {/* Inline Warning Message for Unauthenticated Users */}
                {isLocked && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-6 flex items-start gap-3">
                    <svg className="shrink-0 size-5 text-amber-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-amber-900 mb-1">
                        독서 인증이 필요해요
                      </p>
                      <p className="text-sm text-amber-700">
                        오늘의 독서 인증을 완료하면 프로필 북을 볼 수 있어요!
                      </p>
                    </div>
                  </div>
                )}

                <h1 className="font-bold text-heading-xl text-black">
                  {isLocked ? (
                    <>
                      지금 독서 인증하고
                      <br />
                      프로필 북을 열어보세요
                    </>
                  ) : (
                    <>
                      오늘의 프로필 북을
                      <br />
                      확인해보세요
                    </>
                  )}
                </h1>
                <p className="font-medium text-body-base text-text-secondary">
                  {isLocked ? '밤 12시가 지나면 사라져요' : '밤 12시까지만 읽을 수 있어요'}
                </p>
              </div>

              {/* Bookmark Cards Section */}
              <div className="flex flex-col w-full">
                {/* Top Row (Blue Theme - Similar) */}
                <div className="h-[140px] overflow-hidden relative w-full">
                  <EllipseShadow topOffset={SHADOW_OFFSETS.TOP_ROW} gradientId="ellipse-gradient-1" />
                  <div className="flex justify-center relative z-10" style={{ gap: `${SPACING.CARD_GAP}px` }}>
                    {similarParticipants.map((participant) => (
                      <BookmarkCard
                        key={`similar-${participant.id}`}
                        profileImage={participant.profileImage || APP_CONSTANTS.DEFAULT_PROFILE_IMAGE}
                        name={participant.name}
                        theme="blue"
                        isLocked={isLocked}
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
                    {oppositeParticipants.map((participant) => (
                      <BookmarkCard
                        key={`opposite-${participant.id}`}
                        profileImage={participant.profileImage || APP_CONSTANTS.DEFAULT_PROFILE_IMAGE}
                        name={participant.name}
                        theme="yellow"
                        isLocked={isLocked}
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

        <FooterActions
          cohortId={cohortId}
          currentUserId={currentUserId}
          isLocked={isLocked}
        />
      </div>
    </PageTransition>
  );
}

export default function TodayLibraryPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <TodayLibraryContent />
    </Suspense>
  );
}

