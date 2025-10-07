'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import BackHeader from '@/components/BackHeader';
import PageTransition from '@/components/PageTransition';
import BookmarkCard from '@/components/BookmarkCard';
import { useCohort } from '@/hooks/use-cohorts';
import { useParticipant } from '@/hooks/use-participants';
import { useVerifiedToday } from '@/hooks/use-verified-today';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { getDb } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useQuery } from '@tanstack/react-query';
import type { Participant } from '@/types/database';

type FeaturedParticipant = Participant & { theme: 'similar' | 'opposite' };

function TodayLibraryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cohortId = searchParams.get('cohort');
  const currentUserId = searchParams.get('userId');
  const { toast } = useToast();

  const { data: cohort, isLoading: cohortLoading } = useCohort(cohortId || undefined);
  const { data: currentUser, isLoading: currentUserLoading } = useParticipant(currentUserId || undefined);
  const { data: verifiedIds } = useVerifiedToday();

  // 오늘 날짜
  const today = format(new Date(), 'yyyy-MM-dd');

  // 🔧 임시: 오늘의 추천 참가자 (하드코딩 - 디자인 확인용)
  // TODO: 나중에 cohort.dailyFeaturedParticipants 사용하도록 변경
  const todayFeatured = cohort?.dailyFeaturedParticipants?.[today] || { similar: ['1', '2'], opposite: ['3', '4'] };
  const allFeaturedIds = [...todayFeatured.similar, ...todayFeatured.opposite];

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
        theme: todayFeatured.similar.includes(participant.id) ? 'similar' : 'opposite'
      }));
    },
    enabled: allFeaturedIds.length > 0,
  });

  // 로딩 상태
  if (cohortLoading || currentUserLoading || participantsLoading) {
    return <LoadingSpinner />;
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
      // 미인증 시 Toast 알림
      toast({
        title: "독서 인증이 필요해요",
        description: "오늘의 독서 인증을 완료하면 프로필 북을 볼 수 있어요!",
        variant: "default",
      });
      return;
    }
    router.push(`/app/profile/${participantId}?cohort=${cohortId}&userId=${currentUserId}&theme=${theme}`);
  };

  // 추천 참가자가 없을 때
  if (allFeaturedIds.length === 0) {
    return (
      <div className="flex min-h-screen flex-col">
        <BackHeader onBack={() => router.back()} title="오늘의 서재" />
        <main className="flex flex-1 items-center justify-center px-4">
          <div className="text-center space-y-4 max-w-sm">
            <p className="text-muted-foreground">
              오늘의 추천 프로필이 아직 설정되지 않았어요.
            </p>
          </div>
        </main>
      </div>
    );
  }

  // 미인증 유저에게는 프로필 가리기
  const isLocked = !isAdmin && !isVerifiedToday;

  // 참가자를 theme별로 분리 (첫 2개 similar, 마지막 2개 opposite)
  const similarParticipants = featuredParticipants.slice(0, 2);
  const oppositeParticipants = featuredParticipants.slice(2, 4);

  return (
    <PageTransition>
      <div className="flex min-h-screen flex-col bg-white">
        <BackHeader onBack={() => router.back()} title="프로필 북" />

        <main className="flex-1 pt-[16px]">
          {/* Header Section */}
          <div className="mx-auto w-[328px] flex flex-col gap-[40px]">
            <div className="flex flex-col gap-[16px] w-[312px]">
              <div className="flex flex-col gap-[3px]">
                <p className="font-[family-name:var(--font-pretendard)] font-bold text-[24px] leading-[1.4] tracking-[-0.24px] text-black">
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
                </p>
              </div>
              <p className="font-[family-name:var(--font-pretendard)] font-medium text-[16px] leading-[1.6] tracking-[-0.16px] text-[#575e68]">
                {isLocked ? '밤 12시가 지나면 사라져요' : '밤 12시까지만 읽을 수 있어요'}
              </p>
            </div>

            {/* Bookmark Cards Section */}
            <div className="flex flex-col w-full">
              {/* Top Row (Blue Theme - Similar) */}
              <div className="relative h-[140px] w-full overflow-clip">
                {/* Shadow Ellipse (exact SVG from Figma - node-id: 42159-1595) */}
                <div className="absolute left-0 top-[128px] h-[24px] w-[328px]">
                  <div className="absolute inset-[-208.33%_-15.24%]">
                    <img
                      alt=""
                      className="block max-w-none size-full"
                      src="http://localhost:3845/assets/151f6ec3d4209788a1933221c0205bd130122b23.svg"
                    />
                  </div>
                </div>

                {/* Card 1: Left */}
                {similarParticipants[0] && (
                  <div className="absolute left-[42px] top-[20px]">
                    <BookmarkCard
                      profileImage={similarParticipants[0].profileImage || '/image/favicon.webp'}
                      name={similarParticipants[0].name}
                      theme="blue"
                      isLocked={isLocked}
                      onClick={() => handleProfileClickWithAuth(similarParticipants[0].id, 'similar')}
                    />
                  </div>
                )}

                {/* Card 2: Right */}
                {similarParticipants[1] && (
                  <div className="absolute left-[186px] top-[20px]">
                    <BookmarkCard
                      profileImage={similarParticipants[1].profileImage || '/image/favicon.webp'}
                      name={similarParticipants[1].name}
                      theme="blue"
                      isLocked={isLocked}
                      onClick={() => handleProfileClickWithAuth(similarParticipants[1].id, 'similar')}
                    />
                  </div>
                )}
              </div>

              {/* White Spacer */}
              <div className="bg-white h-[20px] w-[326px]" />

              {/* Blur Divider (exact image from Figma - node-id: 42159-1617) */}
              <div className="blur-[6.128px] filter h-[4px] w-[328px] relative">
                <img
                  alt=""
                  className="absolute inset-0 max-w-none object-50%-50% object-cover pointer-events-none size-full"
                  src="http://localhost:3845/assets/cefbdab62819f8d2d9184fdfe75fb634f1bf5346.png"
                />
              </div>

              {/* Bottom Row (Yellow Theme - Opposite) */}
              <div className="relative h-[160px] w-full overflow-clip">
                {/* Shadow Ellipse (exact SVG from Figma - node-id: 42159-1619) */}
                <div className="absolute left-0 top-[148px] h-[24px] w-[328px]">
                  <div className="absolute inset-[-208.33%_-15.24%]">
                    <img
                      alt=""
                      className="block max-w-none size-full"
                      src="http://localhost:3845/assets/5031a5764005fb611fb476c14f9f8d4b37acdada.svg"
                    />
                  </div>
                </div>

                {/* Card 3: Left */}
                {oppositeParticipants[0] && (
                  <div className="absolute left-[42px] top-[40px]">
                    <BookmarkCard
                      profileImage={oppositeParticipants[0].profileImage || '/image/favicon.webp'}
                      name={oppositeParticipants[0].name}
                      theme="yellow"
                      isLocked={isLocked}
                      onClick={() => handleProfileClickWithAuth(oppositeParticipants[0].id, 'opposite')}
                    />
                  </div>
                )}

                {/* Card 4: Right */}
                {oppositeParticipants[1] && (
                  <div className="absolute left-[186px] top-[40px]">
                    <BookmarkCard
                      profileImage={oppositeParticipants[1].profileImage || '/image/favicon.webp'}
                      name={oppositeParticipants[1].name}
                      theme="yellow"
                      isLocked={isLocked}
                      onClick={() => handleProfileClickWithAuth(oppositeParticipants[1].id, 'opposite')}
                    />
                  </div>
                )}
              </div>

              {/* White Spacer */}
              <div className="bg-white h-[20px] w-[326px]" />

              {/* Blur Divider (exact image from Figma - node-id: 42159-1642) */}
              <div className="blur-[6.128px] filter h-[4px] w-[328px] relative">
                <img
                  alt=""
                  className="absolute inset-0 max-w-none object-50%-50% object-cover pointer-events-none size-full"
                  src="http://localhost:3845/assets/cefbdab62819f8d2d9184fdfe75fb634f1bf5346.png"
                />
              </div>
            </div>
          </div>
        </main>

        {/* Footer Buttons */}
        <div className="flex gap-[8px] px-[24px] pt-[16px] pb-[32px]">
          {isLocked ? (
            <>
              {/* Unauthenticated: 2 Buttons */}
              <button
                type="button"
                onClick={() => router.push(`/app/profile/${currentUserId}?cohort=${cohortId}&userId=${currentUserId}`)}
                className="flex-1 bg-white border border-gray-200 rounded-[8px] px-0 py-[16px] overflow-clip transition-colors hover:bg-gray-50"
              >
                <span className="font-[family-name:var(--font-pretendard)] font-bold text-[16px] leading-[1.4] tracking-[-0.16px] text-black">
                  내 프로필 북 보기
                </span>
              </button>
              <button
                type="button"
                onClick={() => router.push(`/app/chat?cohort=${cohortId}&userId=${currentUserId}`)}
                className="flex-1 bg-black rounded-[8px] px-0 py-[16px] overflow-clip transition-colors hover:bg-gray-800"
              >
                <span className="font-[family-name:var(--font-pretendard)] font-bold text-[16px] leading-[1.4] tracking-[-0.16px] text-white">
                  독서 인증하기
                </span>
              </button>
            </>
          ) : (
            <>
              {/* Authenticated: 1 Button */}
              <button
                type="button"
                onClick={() => router.push(`/app/profile/${currentUserId}?cohort=${cohortId}&userId=${currentUserId}`)}
                className="flex-1 bg-black rounded-[8px] px-0 py-[16px] overflow-clip transition-colors hover:bg-gray-800"
              >
                <span className="font-[family-name:var(--font-pretendard)] font-bold text-[16px] leading-[1.4] tracking-[-0.16px] text-white">
                  내 프로필 북 보기
                </span>
              </button>
            </>
          )}
        </div>
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

