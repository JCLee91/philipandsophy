'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import LoadingSpinner from '@/components/LoadingSpinner';
import LockedScreen from '@/components/LockedScreen';
import PageTransition from '@/components/PageTransition';
import HistoryWeekRow from '@/components/HistoryWeekRow';
import ErrorState from '@/components/ErrorState';
import ProfileImageDialog from '@/components/ProfileImageDialog';
import { useParticipantSubmissionsRealtime } from '@/hooks/use-submissions';
import { useCohort } from '@/hooks/use-cohorts';
import { useAuth } from '@/contexts/AuthContext';
import { useAccessControl } from '@/hooks/use-access-control';
import { getInitials, formatShortDate } from '@/lib/utils';
import { format, startOfDay, isSameDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import Image from 'next/image';
import type { Cohort, Participant, ReadingSubmission } from '@/types/database';
import { PROFILE_THEMES, DEFAULT_THEME, type ProfileTheme } from '@/constants/profile-themes';
import {
  filterSubmissionsByDate,
  getMatchingAccessDates,
  getPreviousDayString,
  canViewAllProfiles,
  canViewAllProfilesWithoutAuth,
  getTodayString,
} from '@/lib/date-utils';
import { findLatestMatchingForParticipant } from '@/lib/matching-utils';
import { useParticipant } from '@/hooks/use-participants';
import { logger } from '@/lib/logger';

type ProfileClientViewProps = {
  participantId: string;
  initialCohortId: string | null;
  initialMatchingDate?: string | null;
  initialTheme?: ProfileTheme;
  initialParticipant: Participant | null;
  initialCohort: Cohort | null;
  initialParticipantSubmissions: ReadingSubmission[];
  initialViewerSubmissions: ReadingSubmission[];
};

export default function ProfileClientView({
  participantId,
  initialCohortId,
  initialMatchingDate = null,
  initialTheme = DEFAULT_THEME,
  initialParticipant,
  initialCohort,
  initialParticipantSubmissions,
  initialViewerSubmissions,
}: ProfileClientViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const searchCohortId = searchParams.get('cohort');
  const matchingDateParam = searchParams.get('matchingDate');
  const themeParam = (searchParams.get('theme') as ProfileTheme | null) ?? initialTheme;

  const cohortId = searchCohortId ?? initialCohortId;
  const matchingDate = matchingDateParam ?? initialMatchingDate;

  const { participant: currentParticipant, isLoading: sessionLoading } = useAuth();
  const currentUserId = currentParticipant?.id;

  const theme = themeParam || DEFAULT_THEME;
  const colors = PROFILE_THEMES[theme];

  const [selectedSubmission, setSelectedSubmission] = useState<ReadingSubmission | null>(null);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const questionRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [profileImageDialogOpen, setProfileImageDialogOpen] = useState(false);
  const [detailImageAspectRatio, setDetailImageAspectRatio] = useState<number | null>(null);

  const toggleQuestion = useCallback((question: string) => {
    setExpandedQuestions((prev) => {
      const newSet = new Set(prev);

      if (newSet.has(question)) {
        newSet.delete(question);
      } else {
        newSet.add(question);

        setTimeout(() => {
          const element = questionRefs.current.get(question);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
          }
        }, 100);
      }

      return newSet;
    });
  }, []);

  const { data: participant, isLoading: participantLoading } = useParticipant(participantId, {
    initialData: initialParticipant ?? undefined,
  });

  const { data: cohort } = useCohort(cohortId || undefined, {
    initialData: initialCohort ?? undefined,
  });

  const { data: rawSubmissions = [], isLoading: submissionsLoading } = useParticipantSubmissionsRealtime(
    participantId,
    { initialData: initialParticipantSubmissions }
  );

  const { data: viewerSubmissions = [], isLoading: viewerSubmissionsLoading } = useParticipantSubmissionsRealtime(
    currentUserId,
    { initialData: initialViewerSubmissions }
  );

  const viewerSubmissionDates = useMemo(
    () => new Set(viewerSubmissions.map((submission) => submission.submissionDate)),
    [viewerSubmissions]
  );

  const allowedMatchingDates = useMemo(
    () => getMatchingAccessDates(viewerSubmissionDates),
    [viewerSubmissionDates]
  );

  const { isSelf: checkIsSelf, isSuperAdmin, isVerified: isVerifiedToday } = useAccessControl();

  const preferredMatchingDate = useMemo(() => {
    if (!matchingDate) return undefined;
    return allowedMatchingDates.has(matchingDate) ? matchingDate : undefined;
  }, [matchingDate, allowedMatchingDates]);

  const matchingLookup = useMemo(() => {
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
  }, [cohort?.dailyFeaturedParticipants, currentUserId, preferredMatchingDate, allowedMatchingDates, isSuperAdmin]);

  const effectiveMatchingDate = matchingLookup?.date ?? preferredMatchingDate ?? null;
  const isFinalDayOrAfter = cohort ? canViewAllProfiles(cohort) : false;
  const isAfterProgramWithoutAuth = cohort ? canViewAllProfilesWithoutAuth(cohort) : false;
  const isFinalDayAccess = matchingDate === getTodayString() && isFinalDayOrAfter;
  const submissionCutoffDate = isFinalDayAccess || isAfterProgramWithoutAuth || isSuperAdmin
    ? null
    : effectiveMatchingDate
    ? getPreviousDayString(effectiveMatchingDate)
    : null;

  const viewerHasAccessForDate = isSuperAdmin
    ? true
    : effectiveMatchingDate
    ? allowedMatchingDates.has(effectiveMatchingDate)
    : false;

  const isSelf = checkIsSelf(participantId);

  const submissions = useMemo(() => {
    if (isSelf) {
      return rawSubmissions;
    }
    return filterSubmissionsByDate(rawSubmissions, submissionCutoffDate);
  }, [rawSubmissions, submissionCutoffDate, isSelf]);

  const hasRedirectedRef = useRef(false);
  useEffect(() => {
    if (!sessionLoading && !currentParticipant && !hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
      router.replace('/app');
    }
  }, [sessionLoading, currentParticipant, router]);

  const startDate = useMemo(() => {
    if (!cohort) return new Date(2025, 9, 11); // Fallback to 1기 시작일
    const dateString = cohort.programStartDate || cohort.startDate;
    return new Date(dateString);
  }, [cohort]);

  const fourteenDays = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) =>
        startOfDay(new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000))
      ),
    [startDate]
  );

  const allQuestionsAnswers = useMemo(() => {
    return submissions.reduce((acc, sub) => {
      const key = sub.dailyQuestion;
      if (!acc[key]) {
        acc[key] = sub.dailyAnswer;
      }
      return acc;
    }, {} as Record<string, string>);
  }, [submissions]);

  useEffect(() => {
    const firstQuestion = Object.keys(allQuestionsAnswers)[0];
    if (firstQuestion) {
      setExpandedQuestions((prev) => {
        if (prev.size === 0) {
          return new Set([firstQuestion]);
        }
        return prev;
      });
    }
  }, [allQuestionsAnswers]);

  const assignments = matchingLookup?.matching.assignments ?? {};
  const viewerAssignment = currentUserId ? assignments[currentUserId] ?? null : null;

  useEffect(() => {
    setDetailImageAspectRatio(null);
  }, [selectedSubmission?.bookImageUrl]);

  const accessibleProfileIds = useMemo(() => {
    return new Set([...(viewerAssignment?.similar ?? []), ...(viewerAssignment?.opposite ?? [])]);
  }, [viewerAssignment]);

  const isFeatured = accessibleProfileIds.has(participantId);

  logger.info('매칭 정보 상세', {
    matchingLookup: matchingLookup ? { date: matchingLookup.date } : null,
    assignmentsKeys: Object.keys(assignments),
    currentUserId,
    viewerAssignment: viewerAssignment
      ? {
          similar: viewerAssignment.similar,
          opposite: viewerAssignment.opposite,
        }
      : null,
    accessibleProfileIds: Array.from(accessibleProfileIds),
    participantId,
    isFeatured,
  });

  const matchingReason = useMemo(() => {
    if (!viewerAssignment || !isFeatured) return null;

    const isSimilar = viewerAssignment.similar?.includes(participantId);
    const isOpposite = viewerAssignment.opposite?.includes(participantId);

    if (isSimilar && viewerAssignment.reasons?.similar) {
      return {
        text: viewerAssignment.reasons.similar,
        theme: 'similar' as ProfileTheme,
      };
    }
    if (isOpposite && viewerAssignment.reasons?.opposite) {
      return {
        text: viewerAssignment.reasons.opposite,
        theme: 'opposite' as ProfileTheme,
      };
    }

    if (isSimilar || isOpposite) {
      logger.warn('Matching reason missing despite being featured', {
        participantId,
        isSimilar,
        isOpposite,
        hasReasons: !!viewerAssignment.reasons,
      });
    }

    return null;
  }, [viewerAssignment, isFeatured, participantId]);

  const hasAccess =
    isSelf ||
    isSuperAdmin ||
    isAfterProgramWithoutAuth ||
    (isFinalDayAccess && isVerifiedToday) ||
    (isVerifiedToday && viewerHasAccessForDate && isFeatured);

  logger.info('프로필북 접근 권한 체크', {
    participantId,
    currentUserId,
    isSelf,
    isSuperAdmin,
    isVerifiedToday,
    viewerSubmissionDates: Array.from(viewerSubmissionDates),
    allowedMatchingDates: Array.from(allowedMatchingDates),
    effectiveMatchingDate,
    submissionCutoffDate,
    viewerHasAccessForDate,
    isFeatured,
    hasAccess,
  });

  if (sessionLoading || participantLoading || submissionsLoading || viewerSubmissionsLoading) {
    return <LoadingSpinner />;
  }

  if (!participant) {
    return <ErrorState message="참가자를 찾을 수 없습니다." onBack={() => router.back()} />;
  }

  if (!hasAccess) {
    return <LockedScreen onBack={() => router.back()} />;
  }

  const initials = getInitials(participant.name);
  const firstName = participant.name.length > 2 ? participant.name.slice(1) : participant.name;
  const cohortNumber = cohort?.name ? parseInt(cohort.name.match(/\d+/)?.[0] || '0', 10) : undefined;

  const dailySubmissions = fourteenDays.map((date, index) => {
    const submission = submissions.find((sub) => isSameDay(sub.submittedAt.toDate(), date));
    return {
      date,
      submission,
      hasSubmission: !!submission,
      dayNumber: index + 1,
    };
  });

  const latestSubmission = submissions.length > 0 ? submissions[0] : null;

  return (
    <PageTransition>
      <div className="app-shell flex flex-col overflow-y-auto" style={{ backgroundColor: colors.background }}>
        <div className="flex items-center px-6 pb-4 safe-area-header" style={{ backgroundColor: colors.background }}>
          <button onClick={() => router.back()} className="flex items-center justify-center w-6 h-6">
            <Image src="/icons/arrow-back.svg" alt="뒤로가기" width={24} height={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pb-8" style={{ backgroundColor: colors.background }}>
          <div className="mx-auto flex max-w-[600px] flex-col gap-6 px-6">
            <div className="relative -mt-10 rounded-[32px] border border-[#e8ebf1] bg-white p-6 shadow-lg">
              <div className="flex flex-col items-center gap-6">
                <button
                  type="button"
                  onClick={() => setProfileImageDialogOpen(true)}
                  className="relative"
                >
                  <Avatar className="h-24 w-24 border-4 border-[#ffffff] shadow-xl">
                    <AvatarImage src={participant.profileImageCircle || participant.profileImage} alt={participant.name} />
                    <AvatarFallback className="bg-primary/10 text-2xl font-semibold text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="mt-2 block text-sm text-muted-foreground">프로필 크게 보기</span>
                </button>

                <div className="text-center">
                  <div className="inline-flex items-center gap-2 rounded-full bg-[#f5f6f9] px-3 py-1 text-xs font-medium text-[#64748b]">
                    <Image src="/icons/crown.svg" alt="기수" width={16} height={16} />
                    {cohortNumber ? `${cohortNumber}기` : '프로그램 멤버'}
                  </div>
                  <h1 className="mt-3 text-2xl font-bold text-[#1e293b]">{firstName}</h1>
                  {participant.occupation && (
                    <p className="mt-1 text-sm text-[#64748b]">{participant.occupation}</p>
                  )}
                </div>

                <div className="w-full rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-4">
                  <h2 className="text-sm font-semibold text-[#334155]">최근 프로필 업데이트</h2>
                  <ul className="mt-3 space-y-2 text-sm text-[#475569]">
                    <li className="flex items-center gap-2">
                      <Image src="/icons/book.svg" alt="현재 읽는 책" width={16} height={16} />
                      <span>{participant.currentBookTitle || '최근 읽은 책 정보가 없습니다.'}</span>
                    </li>
                    {participant.bio && (
                      <li className="flex items-center gap-2">
                        <Image src="/icons/note.svg" alt="소개" width={16} height={16} />
                        <span>{participant.bio}</span>
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">
                    Matching Timeline
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-[#1e293b]">오늘의 매칭 정보</h2>
                </div>
                <div className="rounded-full bg-[#f1f5f9] px-3 py-1 text-xs font-medium text-[#475569]">
                  {effectiveMatchingDate ? format(new Date(effectiveMatchingDate), 'M월 d일', { locale: ko }) : '대기 중'}
                </div>
              </div>

              <div className="mt-4 rounded-2xl bg-[#f8fafc] p-4">
                <p className="text-sm font-medium text-[#334155]">오늘의 추천 이유</p>
                <p className="mt-2 text-sm leading-relaxed text-[#475569]">
                  {matchingReason?.text || '오늘은 추천 이유가 공개되지 않았습니다.'}
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">
                    Reading Journey
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-[#1e293b]">최근 독서 인증</h2>
                </div>
                {latestSubmission && (
                  <div className="text-right text-xs text-[#64748b]">
                    <p>최근 인증일</p>
                    <p className="font-semibold text-[#334155]">
                      {formatShortDate(latestSubmission.submittedAt)}
                    </p>
                  </div>
                )}
              </div>

              {latestSubmission ? (
                <div className="mt-4 rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-4">
                  <p className="text-sm font-semibold text-[#334155]">{latestSubmission.bookTitle}</p>
                  {latestSubmission.bookAuthor && (
                    <p className="mt-1 text-xs uppercase text-[#94a3b8]">{latestSubmission.bookAuthor}</p>
                  )}
                  <p className="mt-3 text-sm leading-relaxed text-[#475569] whitespace-pre-wrap">
                    {latestSubmission.review}
                  </p>
                </div>
              ) : (
                <p className="mt-4 text-sm text-[#64748b]">아직 제출한 독서 인증이 없습니다.</p>
              )}
            </div>

            <div className="rounded-3xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-[#1e293b]">14일 독서 히스토리</h2>
              <p className="mt-2 text-sm text-[#64748b]">각 날짜를 눌러 제출한 인증을 확인해 보세요.</p>
              <div className="mt-5">
                <HistoryWeekRow
                  days={dailySubmissions}
                  onSubmissionClick={(submission) => setSelectedSubmission(submission)}
                  bookmarkCompleted="/image/bookmark-completed.svg"
                  bookmarkEmpty="/image/bookmark-empty.svg"
                  cohortNumber={cohortNumber}
                />
              </div>
            </div>

            <div className="rounded-3xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-[#1e293b]">가치관 질문 기록</h2>
              <div className="mt-4 space-y-4">
                {(Object.entries(allQuestionsAnswers) as [string, string][]).map(([question, answer]) => {
                  const isExpanded = expandedQuestions.has(question);
                  return (
                    <div
                      key={question}
                      ref={(el) => {
                        if (el) {
                          questionRefs.current.set(question, el);
                        } else {
                          questionRefs.current.delete(question);
                        }
                      }}
                      className="rounded-2xl border border-[#e2e8f0] bg-[#f8fafc]"
                    >
                      <button
                        type="button"
                        onClick={() => toggleQuestion(question)}
                        className="flex w-full items-center justify-between px-4 py-3 text-left"
                      >
                        <span className="text-sm font-medium text-[#334155]">{question}</span>
                        <span className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                          <Image src="/icons/chevron-down.svg" alt="토글" width={20} height={20} />
                        </span>
                      </button>
                      {isExpanded && (
                        <div className="px-4 pb-4">
                          <p className="text-sm leading-relaxed text-[#475569] whitespace-pre-wrap">{answer}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <ProfileImageDialog
          participant={participant}
          open={profileImageDialogOpen}
          onClose={() => setProfileImageDialogOpen(false)}
        />

        {selectedSubmission && (
          <Dialog open={!!selectedSubmission} onOpenChange={(open) => !open && setSelectedSubmission(null)}>
            <DialogContent className="profile-reading-dialog-ios-safe sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-base">
                  {formatShortDate(selectedSubmission.submittedAt)} 독서 기록
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                {selectedSubmission.bookImageUrl && (
                  <div
                    className="relative w-full overflow-hidden rounded-xl border bg-muted"
                    style={{
                      aspectRatio: detailImageAspectRatio ?? 1.5,
                    }}
                  >
                    <Image
                      src={selectedSubmission.bookImageUrl}
                      alt="책 사진"
                      fill
                      sizes="(max-width: 768px) 100vw, 448px"
                      className="object-contain"
                      onLoad={(event) => {
                        const img = event.currentTarget as HTMLImageElement;
                        setDetailImageAspectRatio(img.naturalWidth / img.naturalHeight);
                      }}
                    />
                  </div>
                )}
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">오늘의 질문</p>
                    <p className="mt-1 leading-relaxed text-foreground">{selectedSubmission.dailyQuestion}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">나의 답변</p>
                    <p className="mt-1 leading-relaxed whitespace-pre-wrap text-foreground">
                      {selectedSubmission.dailyAnswer}
                    </p>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </PageTransition>
  );
}
