'use client';

import { Suspense, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useCohort } from '@/hooks/use-cohorts';
import { useParticipant } from '@/hooks/use-participants';
import { useVerifiedToday } from '@/hooks/use-verified-today';
import { format } from 'date-fns';
import { ArrowLeft, Lock, BookOpen } from 'lucide-react';
import { getDb } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useQuery } from '@tanstack/react-query';
import type { Participant } from '@/types/database';

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

  // 오늘의 추천 참가자 ID 목록
  const todayFeaturedIds = cohort?.dailyFeaturedParticipants?.[today] || [];

  // 추천 참가자들의 정보 가져오기
  const { data: featuredParticipants = [], isLoading: participantsLoading } = useQuery({
    queryKey: ['featured-participants', todayFeaturedIds],
    queryFn: async () => {
      if (todayFeaturedIds.length === 0) return [];
      
      const db = getDb();
      const participantsRef = collection(db, 'participants');
      const q = query(participantsRef, where('__name__', 'in', todayFeaturedIds));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Participant[];
    },
    enabled: todayFeaturedIds.length > 0,
  });

  // 로딩 상태
  if (cohortLoading || currentUserLoading || participantsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">로딩 중...</p>
      </div>
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

  // 운영자가 아니고 오늘 인증 안 했으면 잠금 화면
  if (!isAdmin && !isVerifiedToday) {
    return (
      <div className="flex min-h-screen flex-col">
        {/* 헤더 */}
        <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
          <div className="container mx-auto flex h-14 max-w-2xl items-center px-4 relative">
            <button
              onClick={() => router.push(`/chat?cohort=${cohortId}&userId=${currentUserId}`)}
              className="p-2 -ml-2 hover:bg-muted rounded-lg transition-colors relative z-10"
              aria-label="뒤로가기"
            >
              <ArrowLeft className="h-5 w-5 text-foreground" />
            </button>
            <h1 className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-sm font-semibold pointer-events-none">
              오늘의 서재
            </h1>
          </div>
        </header>

        {/* 잠금 화면 */}
        <main className="flex flex-1 items-center justify-center px-4">
          <div className="text-center space-y-4 max-w-sm">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Lock className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold">오늘의 서재가 잠겨있어요</h2>
            <p className="text-muted-foreground leading-relaxed">
              다른 참가자의 프로필 북을 보려면<br />
              오늘의 독서 인증을 완료해야 해요.
            </p>
            <button
              onClick={() => router.push(`/chat?cohort=${cohortId}&userId=${currentUserId}`)}
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <BookOpen className="h-4 w-4" />
              독서 인증하러 가기
            </button>
          </div>
        </main>
      </div>
    );
  }

  // 추천 참가자가 없을 때
  if (todayFeaturedIds.length === 0) {
    return (
      <div className="flex min-h-screen flex-col">
        {/* 헤더 */}
        <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
          <div className="container mx-auto flex h-14 max-w-2xl items-center px-4 relative">
            <button
              onClick={() => router.push(`/chat?cohort=${cohortId}&userId=${currentUserId}`)}
              className="p-2 -ml-2 hover:bg-muted rounded-lg transition-colors relative z-10"
              aria-label="뒤로가기"
            >
              <ArrowLeft className="h-5 w-5 text-foreground" />
            </button>
            <h1 className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-sm font-semibold pointer-events-none">
              오늘의 서재
            </h1>
          </div>
        </header>

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

  // 프로필북 클릭 핸들러
  const handleProfileClick = (participantId: string) => {
    router.push(`/profile/${participantId}?cohort=${cohortId}&userId=${currentUserId}`);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* 헤더 */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-14 max-w-2xl items-center px-4 relative">
          <button
            onClick={() => router.push(`/chat?cohort=${cohortId}&userId=${currentUserId}`)}
            className="p-2 -ml-2 hover:bg-muted rounded-lg transition-colors relative z-10"
            aria-label="뒤로가기"
          >
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <h1 className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-sm font-semibold pointer-events-none">
            오늘의 서재
          </h1>
        </div>
      </header>

      <main className="flex-1 py-8">
        <div className="container mx-auto max-w-2xl px-4">
          <div className="mb-6 text-center">
            <p className="text-sm text-muted-foreground">
              오늘 함께 읽을 멤버들의 프로필 북이에요
            </p>
          </div>

          {/* 2x2 그리드 */}
          <div className="grid grid-cols-2 gap-4">
            {featuredParticipants.map((participant) => {
              const initials = participant.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);

              return (
                <button
                  key={participant.id}
                  onClick={() => handleProfileClick(participant.id)}
                  className="group relative flex flex-col items-center gap-4 rounded-2xl border-2 border-border bg-card p-6 transition-all hover:border-primary hover:shadow-lg active:scale-95"
                >
                  <Avatar className="h-20 w-20 border-4 border-background shadow-lg ring-2 ring-border/50 group-hover:ring-primary/50 transition-all">
                    <AvatarImage src={participant.profileImage} alt={participant.name} />
                    <AvatarFallback className="bg-primary/10 text-xl font-semibold text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-center space-y-1">
                    <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">
                      {participant.name}
                    </h3>
                    {participant.occupation && (
                      <p className="text-xs text-muted-foreground">
                        {participant.occupation}
                      </p>
                    )}
                  </div>
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <BookOpen className="h-4 w-4 text-primary" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function TodayLibraryPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">로딩 중...</div>}>
      <TodayLibraryContent />
    </Suspense>
  );
}

