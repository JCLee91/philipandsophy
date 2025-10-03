'use client';

import { Suspense, use, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import LoadingSpinner from '@/components/LoadingSpinner';
import LockedScreen from '@/components/LockedScreen';
import BackHeader from '@/components/BackHeader';
import PageTransition from '@/components/PageTransition';
import { useParticipant } from '@/hooks/use-participants';
import { useApprovedSubmissionsByParticipant } from '@/hooks/use-submissions';
import { useCohort } from '@/hooks/use-cohorts';
import { useVerifiedToday } from '@/hooks/use-verified-today';
import { getInitials, formatShortDate } from '@/lib/utils';
import { format, subDays, startOfDay, isSameDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import Image from 'next/image';
import type { ReadingSubmission } from '@/types/database';

interface ProfileBookContentProps {
  params: Promise<{ participantId: string }>;
}

function ProfileBookContent({ params }: ProfileBookContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resolvedParams = use(params);
  const participantId = resolvedParams.participantId;
  const currentUserId = searchParams.get('userId');
  const cohortId = searchParams.get('cohort');

  const [selectedSubmission, setSelectedSubmission] = useState<ReadingSubmission | null>(null);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());

  const toggleQuestion = (question: string) => {
    setExpandedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(question)) {
        newSet.delete(question);
      } else {
        newSet.add(question);
      }
      return newSet;
    });
  };

  // 데이터 페칭
  const { data: participant, isLoading: participantLoading } = useParticipant(participantId);
  const { data: currentUser } = useParticipant(currentUserId || undefined);
  const { data: cohort } = useCohort(cohortId || undefined);
  const { data: submissions = [], isLoading: submissionsLoading } = useApprovedSubmissionsByParticipant(participantId);
  const { data: verifiedIds } = useVerifiedToday();

  // 접근 권한 체크
  const isSelf = currentUserId === participantId;
  const isAdmin = currentUser?.isAdmin === true;

  // 오늘 날짜 (YYYY-MM-DD 형식)
  const today = format(new Date(), 'yyyy-MM-dd');

  // 오늘 인증 여부
  const isVerifiedToday = currentUserId ? verifiedIds?.has(currentUserId) : false;

  // 오늘의 추천 참가자 목록
  const todayFeaturedIds = cohort?.dailyFeaturedParticipants?.[today] || [];

  // 추천 참가자 여부
  const isFeatured = todayFeaturedIds.includes(participantId);

  // 최종 접근 권한: 본인 OR 운영자 OR (오늘 인증 완료 AND 추천 4명 중 하나)
  const hasAccess = isSelf || isAdmin || (isVerifiedToday && isFeatured);

  // 로딩 상태
  if (participantLoading || submissionsLoading) {
    return <LoadingSpinner />;
  }

  // 데이터 없음
  if (!participant) {
    return <LoadingSpinner message="참가자를 찾을 수 없습니다." />;
  }

  // 접근 권한 없음
  if (!hasAccess) {
    return <LockedScreen onBack={() => router.back()} />;
  }

  // Initials 생성
  const initials = getInitials(participant.name);

  // 14일치 날짜 배열 생성 (오늘부터 과거 13일)
  const fourteenDays = Array.from({ length: 14 }, (_, i) => {
    const date = subDays(new Date(), i);
    return startOfDay(date);
  }).reverse(); // 오래된 날짜부터 최신 순으로

  // 각 날짜에 대한 제출물 찾기
  const dailySubmissions = fourteenDays.map((date) => {
    const submission = submissions.find((sub) =>
      isSameDay(sub.submittedAt.toDate(), date)
    );
    return {
      date,
      submission,
      hasSubmission: !!submission,
    };
  });

  // 모든 질문과 답변 수집 (중복 제거)
  const allQuestionsAnswers = submissions.reduce((acc, sub) => {
    const key = sub.dailyQuestion;
    if (!acc[key]) {
      acc[key] = sub.dailyAnswer;
    }
    return acc;
  }, {} as Record<string, string>);

  return (
    <PageTransition>
      <div className="flex min-h-screen flex-col bg-background">
        <BackHeader onBack={() => router.back()} title="프로필 북" />

      <main className="flex-1 pb-12">
        <div className="container mx-auto max-w-2xl px-4">
          {/* 프로필 카드 */}
          <div className="mt-8 mb-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <Avatar className="h-24 w-24 border-4 border-background shadow-lg ring-2 ring-border/50">
                <AvatarImage src={participant.profileImage} alt={participant.name} />
                <AvatarFallback className="bg-primary/10 text-2xl font-semibold text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-foreground">
                  {participant.name}
                </h2>
                {participant.occupation && (
                  <p className="text-sm text-muted-foreground">
                    {participant.occupation}
                  </p>
                )}
                {participant.bio && (
                  <p className="text-sm text-foreground/80 leading-relaxed max-w-md px-4 whitespace-pre-line">
                    {participant.bio}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 인증 현황 */}
          <div className="mt-6">
            <h3 className="text-base font-semibold mb-3 px-1">인증 현황</h3>
            <div className="rounded-2xl border bg-card p-4 shadow-sm">
              <div className="grid grid-cols-7 gap-2.5">
                {dailySubmissions.map((day, index) => {
                  const dateLabel = format(day.date, 'M/d', { locale: ko });
                  return (
                    <button
                      key={index}
                      onClick={() => day.hasSubmission && day.submission && setSelectedSubmission(day.submission)}
                      disabled={!day.hasSubmission}
                      className={`group relative aspect-square rounded-xl border-2 bg-card transition-all duration-normal flex flex-col items-center justify-center gap-0.5 ${
                        day.hasSubmission
                          ? 'border-muted hover:border-primary/50 hover:scale-[1.02] active:scale-95 cursor-pointer'
                          : 'border-muted cursor-not-allowed'
                      }`}
                    >
                      {day.hasSubmission ? (
                        <>
                          <Check className="h-5 w-5 text-blue-500 stroke-[2.5]" />
                          <span className="text-[10px] font-medium text-foreground">{dateLabel}</span>
                        </>
                      ) : (
                        <span className="text-xs font-medium text-muted-foreground">{dateLabel}</span>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-muted-foreground text-center">
                날짜를 클릭하면 그날의 독서 기록을 볼 수 있어요
              </p>
            </div>
          </div>

          {/* 질문 답변 */}
          {Object.keys(allQuestionsAnswers).length > 0 && (
            <div className="mt-6 mb-8">
              <h3 className="text-base font-semibold mb-3 px-1">질문 답변</h3>
              <div className="space-y-2">
                {(Object.entries(allQuestionsAnswers) as [string, string][]).map(([question, answer], index) => {
                  const isExpanded = expandedQuestions.has(question);
                  const hasMultipleLines = answer.split('\n').length > 1;
                  
                  return (
                    <div
                      key={index}
                      className="rounded-2xl border bg-card p-4 shadow-sm"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-xs font-bold text-primary">Q</span>
                        </div>
                        <div className="flex-1 space-y-2">
                          <p className="text-sm font-semibold text-muted-foreground">
                            {question}
                          </p>
                          <div className="text-[15px] leading-relaxed text-foreground">
                            <p className={isExpanded ? "whitespace-pre-wrap" : "line-clamp-1"}>
                              {answer}
                            </p>
                          </div>
                          {hasMultipleLines && (
                            <button
                              onClick={() => toggleQuestion(question)}
                              className="flex items-center justify-center w-full text-primary hover:text-primary/80 transition-colors duration-normal"
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* 인증 상세 모달 */}
      {selectedSubmission && (
        <Dialog open={!!selectedSubmission} onOpenChange={(open) => !open && setSelectedSubmission(null)}>
          <DialogContent className="sm:max-w-md" hideCloseButton>
            <DialogHeader>
              <DialogTitle className="text-base">
                {formatShortDate(selectedSubmission.submittedAt)} 독서 기록
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* 책 이미지 */}
              {selectedSubmission.bookImageUrl && (
                <div className="relative aspect-video overflow-hidden rounded-xl border bg-muted">
                  <Image
                    src={selectedSubmission.bookImageUrl}
                    alt="책 사진"
                    fill
                    sizes="(max-width: 768px) 100vw, 448px"
                    className="object-cover"
                    priority={false}
                    unoptimized={false}
                  />
                </div>
              )}
              {/* 한 줄 감상평 */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  한 줄 감상평
                </p>
                <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                  {selectedSubmission.review}
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
      </div>
    </PageTransition>
  );
}

export default function ProfileBookPage({ params }: ProfileBookContentProps) {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ProfileBookContent params={params} />
    </Suspense>
  );
}
