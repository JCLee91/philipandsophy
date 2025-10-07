'use client';

import { Suspense, use, useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import LoadingSpinner from '@/components/LoadingSpinner';
import LockedScreen from '@/components/LockedScreen';
import PageTransition from '@/components/PageTransition';
import HistoryWeekRow from '@/components/HistoryWeekRow';
import ErrorState from '@/components/ErrorState';
import { useParticipant } from '@/hooks/use-participants';
import { useApprovedSubmissionsByParticipant } from '@/hooks/use-submissions';
import { useCohort } from '@/hooks/use-cohorts';
import { useVerifiedToday } from '@/hooks/use-verified-today';
import { getInitials, formatShortDate } from '@/lib/utils';
import { format, subDays, startOfDay, isSameDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import Image from 'next/image';
import type { ReadingSubmission } from '@/types/database';
import { PROFILE_THEMES, DEFAULT_THEME, type ProfileTheme } from '@/constants/profile-themes';

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

  // 테마 결정 (similar: 비슷한 가치관 파란색, opposite: 반대 가치관 노란색)
  const theme = (searchParams.get('theme') as ProfileTheme) || DEFAULT_THEME;
  const colors = PROFILE_THEMES[theme];

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

  // ✅ CRITICAL: useMemo를 early return 이전에 배치하여 hooks 순서 일관성 유지
  // 14일치 날짜 배열 생성 (오늘부터 과거 13일) - 메모이제이션으로 최적화
  const fourteenDays = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const date = subDays(new Date(), i);
      return startOfDay(date);
    }).reverse(); // 오래된 날짜부터 최신 순으로
  }, []); // 날짜는 컴포넌트 마운트 시 한 번만 계산

  // 모든 질문과 답변 수집 (중복 제거) - 메모이제이션으로 최적화
  const allQuestionsAnswers = useMemo(() => {
    return submissions.reduce((acc, sub) => {
      const key = sub.dailyQuestion;
      if (!acc[key]) {
        acc[key] = sub.dailyAnswer;
      }
      return acc;
    }, {} as Record<string, string>);
  }, [submissions]); // submissions가 변경될 때만 재계산

  // ✅ CRITICAL: useEffect를 early return 이전에 배치하여 hooks 순서 일관성 유지
  // 첫 번째 질문을 기본으로 열어두기
  useEffect(() => {
    const firstQuestion = Object.keys(allQuestionsAnswers)[0];
    if (firstQuestion) {
      setExpandedQuestions(prev => {
        if (prev.size === 0) {
          return new Set([firstQuestion]);
        }
        return prev;
      });
    }
  }, [allQuestionsAnswers]); // allQuestionsAnswers가 변경되면 실행

  // 접근 권한 체크
  const isSelf = currentUserId === participantId;
  const isAdmin = currentUser?.isAdmin === true;

  // 오늘 날짜 (YYYY-MM-DD 형식)
  const today = format(new Date(), 'yyyy-MM-dd');

  // 오늘 인증 여부
  const isVerifiedToday = currentUserId ? verifiedIds?.has(currentUserId) : false;

  // 오늘의 추천 참가자 목록
  const todayFeatured = cohort?.dailyFeaturedParticipants?.[today] || { similar: [], opposite: [] };
  const allFeaturedIds = [...todayFeatured.similar, ...todayFeatured.opposite];

  // 추천 참가자 여부
  const isFeatured = allFeaturedIds.includes(participantId);

  // 최종 접근 권한: 본인 OR 운영자 OR (오늘 인증 완료 AND 추천 4명 중 하나)
  const hasAccess = isSelf || isAdmin || (isVerifiedToday && isFeatured);

  // 로딩 상태
  if (participantLoading || submissionsLoading) {
    return <LoadingSpinner />;
  }

  // 데이터 없음
  if (!participant) {
    return (
      <ErrorState
        message="참가자를 찾을 수 없습니다."
        onBack={() => router.back()}
      />
    );
  }

  // 접근 권한 없음
  if (!hasAccess) {
    return <LockedScreen onBack={() => router.back()} />;
  }

  // Initials 생성
  const initials = getInitials(participant.name);

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

  // 최근 제출물 (가장 최근 1개)
  const latestSubmission = submissions.length > 0 ? submissions[submissions.length - 1] : null;

  return (
    <PageTransition>
      <div className="flex min-h-screen flex-col" style={{ backgroundColor: colors.background }}>
        {/* 상단바 */}
        <div className="flex items-center px-6 pt-4 pb-4" style={{ backgroundColor: colors.background }}>
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-6 h-6"
          >
            <Image
              src="/icons/arrow-back.svg"
              alt="뒤로가기"
              width={24}
              height={24}
            />
          </button>
        </div>

        {/* 메인 콘텐츠 */}
        <div className="relative flex-1">
          {/* 프로필 이미지 (컨테이너 위로 겹침) */}
          <div className="absolute left-1/2 transform -translate-x-1/2 top-[36px] z-10">
            <div className="relative w-[80px] h-[80px]">
              <Avatar className="w-full h-full border-[3px] border-[#31363e]">
                <AvatarImage src={participant.profileImage} alt={participant.name} />
                <AvatarFallback className="bg-gray-200 text-2xl font-bold text-gray-700">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>

          {/* 흰색 카드 컨테이너 */}
          <div className="bg-white rounded-tl-[32px] rounded-tr-[32px] mt-[80px] min-h-[calc(100vh-124px)] max-w-[calc(100%-32px)] md:max-w-[420px] mx-auto">
            <div className="w-full px-4 sm:px-6 md:px-8">
              {/* 프로필 정보 */}
              <div className="flex flex-col items-center pt-[36px] pb-[32px]">
                <div className="flex flex-col items-center gap-2 mb-[32px]">
                  <div className="flex items-center gap-1">
                    <h2 className="text-[20px] font-bold leading-[1.4] text-[#31363e]">
                      {participant.name}
                    </h2>
                    <Image
                      src="/icons/chevron.svg"
                      alt=""
                      width={20}
                      height={20}
                      className="rotate-180"
                    />
                  </div>
                  {participant.occupation && (
                    <p className="text-[14px] font-medium leading-[1.4] text-[#8f98a3]">
                      {participant.occupation}
                    </p>
                  )}
                </div>

                {/* 최근 본 도서 */}
                {latestSubmission && (
                  <div className="w-full mb-[60px]">
                    <h3 className="text-[18px] md:text-[20px] font-bold leading-[1.4] text-[#31363e] mb-4">최근 본 도서</h3>
                    <div className="flex flex-col gap-3">
                      <div className="relative border-b-[2px] border-solid rounded-t-[4px] px-3 py-3 min-h-[100px]" style={{ backgroundColor: colors.accentLight, borderBottomColor: colors.bookBorder }}>
                        <div className="flex items-start gap-3 pr-[72px]">
                          <div className="flex flex-col gap-1 flex-1 min-w-0">
                            <p className="text-[14px] font-bold leading-[1.4] text-[#31363e] truncate tracking-[-0.14px]">
                              {latestSubmission.bookTitle}
                            </p>
                            <p className="text-[12px] leading-[1.4] text-[#8f98a3] tracking-[-0.12px]">
                              {latestSubmission.bookAuthor}
                            </p>
                          </div>
                        </div>
                        {latestSubmission.bookImageUrl && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-[60px] h-[88px] bg-white rounded-[4px] overflow-hidden shadow-sm">
                            <Image
                              src={latestSubmission.bookImageUrl}
                              alt="책 표지"
                              fill
                              className="object-cover"
                            />
                          </div>
                        )}
                      </div>
                      <p className="text-[14px] font-medium leading-[1.4] text-[#575e68] tracking-[-0.14px]">
                        {latestSubmission.review.slice(0, 100)}
                        {latestSubmission.review.length > 100 ? '...' : ''}
                      </p>
                    </div>
                  </div>
                )}

                {/* 독서 히스토리 */}
                <div className="w-full mb-[60px]">
                  <h3 className="text-[18px] md:text-[20px] font-bold leading-[1.4] text-[#31363e] mb-4">독서 히스토리</h3>
                  <div className="flex flex-col gap-4">
                    <HistoryWeekRow
                      days={dailySubmissions.slice(0, 7)}
                      onSubmissionClick={setSelectedSubmission}
                      bookmarkCompleted={colors.bookmarkCompleted}
                      bookmarkEmpty={colors.bookmarkEmpty}
                    />
                    <HistoryWeekRow
                      days={dailySubmissions.slice(7, 14)}
                      onSubmissionClick={setSelectedSubmission}
                      bookmarkCompleted={colors.bookmarkCompleted}
                      bookmarkEmpty={colors.bookmarkEmpty}
                    />
                  </div>
                </div>

                {/* 가치관 히스토리 */}
                {Object.keys(allQuestionsAnswers).length > 0 && (
                  <div className="w-full mb-[60px]">
                    <h3 className="text-[18px] md:text-[20px] font-bold leading-[1.4] text-[#31363e] mb-4">가치관 히스토리</h3>

                    {/* 질문 리스트 */}
                    <div className="flex flex-col">
                      {(Object.entries(allQuestionsAnswers) as [string, string][]).map(([question, answer], index) => {
                        const isExpanded = expandedQuestions.has(question);
                        const isLastQuestion = index === Object.entries(allQuestionsAnswers).length - 1;

                        return (
                          <div
                            key={index}
                            className={`${isLastQuestion ? '' : 'border-b border-[#dddddd]'} py-4 ${index === 0 ? 'pt-0' : ''}`}
                          >
                            <button
                              onClick={() => toggleQuestion(question)}
                              className="w-full flex items-center justify-between gap-1 text-left"
                            >
                              <p className="flex-1 text-[16px] font-medium leading-[1.4] text-[#575e68]">
                                {question}
                              </p>
                              <div className={`flex-shrink-0 transition-transform duration-300 ${
                                isExpanded ? 'rotate-180' : ''
                              }`}>
                                <Image
                                  src="/icons/chevron-down.svg"
                                  alt=""
                                  width={20}
                                  height={20}
                                />
                              </div>
                            </button>

                            {isExpanded && (
                              <div className="mt-4 rounded-[12px] px-4 py-4 transition-all duration-300" style={{ backgroundColor: colors.accentLight }}>
                                <p className="text-[14px] leading-[1.4] text-[#31363e] whitespace-pre-wrap">
                                  {answer}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

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
