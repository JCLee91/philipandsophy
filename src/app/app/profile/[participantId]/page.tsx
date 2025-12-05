'use client';

import { Suspense, useState, useEffect, useMemo, useRef, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import LoadingSpinner from '@/components/LoadingSpinner';
import LockedScreen from '@/components/LockedScreen';
import PageTransition from '@/components/PageTransition';
import HistoryWeekRow from '@/components/HistoryWeekRow';
import ErrorState from '@/components/ErrorState';
import ProfileImageDialog from '@/components/ProfileImageDialog';
import ImageViewerDialog from '@/components/ImageViewerDialog';
import { useParticipantSubmissionsRealtime } from '@/hooks/use-submissions';
import { useCohort } from '@/hooks/use-cohorts';
import { useAuth } from '@/contexts/AuthContext';
import { useAccessControl } from '@/hooks/use-access-control';
import { getInitials, formatShortDate, getFirstName } from '@/lib/utils';
import { format, startOfDay, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import Image from 'next/image';
import type { ReadingSubmission } from '@/types/database';
import type { Timestamp } from 'firebase/firestore';
import { PROFILE_THEMES, DEFAULT_THEME, type ProfileTheme } from '@/constants/profile-themes';
import { filterSubmissionsByDate, canViewAllProfiles, canViewAllProfilesWithoutAuth, getSubmissionDate, shouldShowAllYesterdayVerified, getMatchingTargetDate } from '@/lib/date-utils';
import { findLatestMatchingForParticipant } from '@/lib/matching-utils';
import { getAssignedProfiles } from '@/lib/matching-compat';
import { useParticipant } from '@/hooks/use-participants';
import { useProfileBookAccess } from '@/hooks/use-profile-book-access';
import { logger } from '@/lib/logger';
import { useYesterdayVerifiedParticipants } from '@/hooks/use-yesterday-verified-participants';
import { getResizedImageUrl, getOriginalImageUrl } from '@/lib/image-utils';
import { getTimestampDate } from '@/lib/firebase/timestamp-utils';
import TopBar from '@/components/TopBar';

interface ProfileBookContentProps {
  params: { participantId: string };
}

const parseDateInput = (value?: string | null): Date | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const parsedIso = parseISO(trimmed);
    if (!Number.isNaN(parsedIso.getTime())) {
      return parsedIso;
    }
  } catch {
    // ignore and fall back to native parser
  }

  const fallback = new Date(trimmed);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
};

const getSubmissionTime = (submission: ReadingSubmission): number => {
  const submissionDateTime = parseDateInput(submission.submissionDate);
  if (submissionDateTime) {
    return submissionDateTime.getTime();
  }

  const submittedAtDate = getTimestampDate(submission.submittedAt);
  if (submittedAtDate) {
    return submittedAtDate.getTime();
  }

  return 0;
};

function ProfileBookContent({ params }: ProfileBookContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // URL 디코딩: %EC%9D%B4%EC%9C%A4%EC%A7%80-4321 → 이윤지-4321
  const participantId = decodeURIComponent(params.participantId);
  const cohortId = searchParams.get('cohort');

  // ⚠️ 용어 정의:
  // matchingDate: 인증 기반 날짜 (이 날짜에 인증한 사람들의 프로필북)
  // 프로필북 제공 날짜: matchingDate + 1일 (다음날 오전 2시부터 제공)
  // 예: matchingDate="2025-11-10" → 11-10에 인증한 사람들 → 11-11 오전 2시부터 프로필북 제공
  const matchingDate = searchParams.get('matchingDate');

  // Firebase Auth 기반 인증
  const { participant: currentParticipant, isLoading: sessionLoading } = useAuth();
  const currentUserId = currentParticipant?.id;

  // 테마 결정 (similar: 비슷한 가치관 파란색, opposite: 반대 가치관 노란색)
  const theme = (searchParams.get('theme') as ProfileTheme) || DEFAULT_THEME;
  const colors = PROFILE_THEMES[theme];

  const [selectedSubmission, setSelectedSubmission] = useState<ReadingSubmission | null>(null);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const questionRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [profileImageDialogOpen, setProfileImageDialogOpen] = useState(false);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [imageViewerUrl, setImageViewerUrl] = useState<string>('');
  const [detailImageAspectRatio, setDetailImageAspectRatio] = useState<number | null>(null);

  const toggleQuestion = (question: string) => {
    setExpandedQuestions(prev => {
      const newSet = new Set(prev);
      const isExpanding = !newSet.has(question);

      if (newSet.has(question)) {
        newSet.delete(question);
      } else {
        newSet.add(question);

        // 펼칠 때만 자동 스크롤
        setTimeout(() => {
          const element = questionRefs.current.get(question);
          if (element) {
            element.scrollIntoView({
              behavior: 'smooth',
              block: 'start',
              inline: 'nearest'
            });
          }
        }, 100); // 애니메이션 시작 후 스크롤
      }

      return newSet;
    });
  };

  // 데이터 페칭
  const { data: participant, isLoading: participantLoading } = useParticipant(participantId);
  const { data: cohort } = useCohort(cohortId || undefined);
  const { data: rawSubmissions = [], isLoading: submissionsLoading } = useParticipantSubmissionsRealtime(participantId);
  const { data: viewerSubmissions = [], isLoading: viewerSubmissionLoading } = useParticipantSubmissionsRealtime(currentUserId);
  const { unlockedProfileBooks } = useProfileBookAccess();
  // ❌ REMOVED: allowedMatchingDates 제거 (2025-11-11)
  // 랜덤 매칭 시스템에서는 인증 여부와 무관하게 모든 참가자가 매칭 접근 가능

  // 접근 제어
  const { isSelf: checkIsSelf, isSuperAdmin, isVerified: isVerifiedToday } = useAccessControl();

  // 어제 인증한 참가자 목록 조회
  const { data: yesterdayVerifiedIds } = useYesterdayVerifiedParticipants(cohortId || undefined);

  // ✅ 불필요한 useMemo 제거 (단순 ?? 연산자)
  const preferredMatchingDate = matchingDate ?? undefined;

  const matchingLookupWithinAccess = useMemo(() => {
    if (!cohort?.dailyFeaturedParticipants || !currentUserId) {
      return null;
    }

    // 랜덤 매칭: allowedDates 제약 없음 (인증 여부와 무관하게 접근 가능)
    const options = { preferredDate: preferredMatchingDate };

    return findLatestMatchingForParticipant(
      cohort.dailyFeaturedParticipants,
      currentUserId,
      options
    );
  }, [
    cohort?.dailyFeaturedParticipants,
    currentUserId,
    preferredMatchingDate,
  ]);

  const matchingLookup = useMemo(() => {
    if (matchingLookupWithinAccess) {
      return matchingLookupWithinAccess;
    }

    if (!cohort?.dailyFeaturedParticipants || !currentUserId) {
      return null;
    }

    return findLatestMatchingForParticipant(cohort.dailyFeaturedParticipants, currentUserId, {
      preferredDate: preferredMatchingDate,
    });
  }, [
    matchingLookupWithinAccess,
    cohort?.dailyFeaturedParticipants,
    currentUserId,
    preferredMatchingDate,
  ]);

  // 선택된 제출물의 날짜 라벨 (early return 이전에 선언)
  const submissionDateLabel = useMemo(() => {
    if (!selectedSubmission) return null;

    if (selectedSubmission.submissionDate) {
      const parsed = parseDateInput(selectedSubmission.submissionDate);
      if (parsed) {
        return format(parsed, 'M/d', { locale: ko });
      }

      logger.warn('Invalid submissionDate detected', {
        participantId,
        submissionId: selectedSubmission.id,
        submissionDate: selectedSubmission.submissionDate,
      });
    }

    return selectedSubmission.submittedAt
      ? formatShortDate(selectedSubmission.submittedAt)
      : null;
  }, [participantId, selectedSubmission]);

  // 인증 기반 날짜 (접근 권한 체크용)
  // effectiveMatchingDate = 인증 기반 날짜 (프로필북은 다음날 제공)
  const effectiveMatchingDate = matchingLookup?.date ?? preferredMatchingDate ?? null;

  // 14일차(마지막 날) 및 15일차 이후 체크
  const isFinalDayOrAfter = cohort ? canViewAllProfiles(cohort) : false;
  const isAfterProgramWithoutAuth = cohort ? canViewAllProfilesWithoutAuth(cohort) : false;

  // profileUnlockDate 체크: 설정된 날짜 이상이면 어제 인증자 전체 공개 모드
  const isUnlockDayOrAfter = cohort ? shouldShowAllYesterdayVerified(cohort) : false;

  // 14일차나 15일차 이후인지 확인 (특별 파라미터로 전달됨)
  // ✅ FIX: getSubmissionDate() 기준으로 비교 (새벽 2시 마감 정책 적용)
  const isFinalDayAccess = matchingDate === getSubmissionDate() && isFinalDayOrAfter;

  // 프로필북 표시 규칙:
  // - 14일차 또는 15일차 이후: 최신 제출물 모두 표시 (cutoff 없음)
  // - 평소: 인증 기반 날짜까지의 인증만 표시
  //   예: effectiveMatchingDate="11-10" → 11-10까지 인증 포함
  //       (프로필북은 11-11 오전 2시부터 제공되지만, 11-10 인증까지만 표시)

  // ✅ FIX: 전체 오픈 기간(마지막 날 or UnlockDate) + 오늘 인증 완료 시 모든 기록 표시
  const shouldShowAll = isAfterProgramWithoutAuth || isSuperAdmin ||
    ((isFinalDayOrAfter || isUnlockDayOrAfter) && isVerifiedToday);

  const submissionCutoffDate = shouldShowAll
    ? getMatchingTargetDate()  // ✅ 어제(마감된 날짜)까지만 표시 (오늘 인증 스포일러 방지)
    : effectiveMatchingDate; // ✅ 인증 기반 날짜까지 포함 (새벽 2시 마감 정책 적용)

  // 랜덤 매칭: 매칭 날짜가 있으면 항상 접근 가능 (인증 여부 무관)
  const viewerHasAccessForDate = isSuperAdmin || !!effectiveMatchingDate;

  // 해당 매칭 날짜에 인증했는지 체크 (어제 인증 안 한 유저가 옛날 클러스터 받은 경우)
  const viewerSubmissionDates = useMemo(
    () => new Set(viewerSubmissions.map(s => s.submissionDate)),
    [viewerSubmissions]
  );
  const isVerifiedForMatchingDate = effectiveMatchingDate
    ? viewerSubmissionDates.has(effectiveMatchingDate)
    : false;

  // 접근 권한 체크 (submissions useMemo보다 먼저 선언)
  const isSelf = checkIsSelf(participantId);

  // 매칭 날짜 기준으로 제출물 필터링 (스포일러 방지)
  // "어제 답변 → 오늘 공개" 규칙: 10월 17일 매칭은 10월 16일까지의 제출물만 표시
  const submissions = useMemo(() => {
    // 1. 본인은 항상 모든 제출물 볼 수 있음
    if (isSelf) {
      return rawSubmissions;
    }

    // 2. 관리자가 '참가자 목록' 등을 통해 들어온 경우 (matchingDate 없음) -> 모든 제출물 볼 수 있음
    //    단, '오늘의 서재'를 통해 들어온 경우 (matchingDate 있음) -> 스포일러 방지 적용
    if (isSuperAdmin && !matchingDate) {
      return rawSubmissions;
    }

    // 3. 그 외의 경우 (일반 유저, 또는 관리자가 오늘의 서재로 진입) -> 날짜 필터링 적용
    // submittedAt이 있는 제출물만 필터링하여 타입 안전성 보장
    const validSubmissions = rawSubmissions.filter(s => s.submittedAt) as Array<ReadingSubmission & { submittedAt: Timestamp }>;
    return filterSubmissionsByDate(validSubmissions, submissionCutoffDate);
  }, [rawSubmissions, submissionCutoffDate, isSelf, isSuperAdmin, matchingDate]);

  const sortedSubmissions = useMemo(() => {
    return [...submissions].sort((a, b) => getSubmissionTime(b) - getSubmissionTime(a));
  }, [submissions]);

  // 세션 검증 (리다이렉트 플래그로 중복 방지)
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    if (!sessionLoading && !currentParticipant && !hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
      router.replace('/app');
    }
  }, [sessionLoading, currentParticipant, router]);

  // 14일치 날짜 배열 생성 (코호트의 programStartDate 기준)
  const startDate = useMemo(() => {
    if (!cohort) {
      return null;
    }
    const dateString = cohort.programStartDate || cohort.startDate;
    if (!dateString) {
      logger.warn('No startDate in cohort', {
        cohortId: cohort.id,
        programStartDate: cohort.programStartDate,
        startDate: cohort.startDate,
      });
      return null;
    }

    try {
      // ✅ FIX: Invalid Date 체크 및 예외 처리
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        logger.error('Invalid programStartDate in profile', {
          cohortId: cohort.id,
          programStartDate: cohort.programStartDate,
          startDate: cohort.startDate,
          dateString,
        });
        return null;
      }

      return date;
    } catch (error) {
      logger.error('Error parsing startDate in profile', {
        cohortId: cohort.id,
        dateString,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }, [cohort]);

  const fourteenDays = useMemo(() => {
    if (!startDate) return [];

    try {
      return Array.from({ length: 14 }, (_, i) => {
        const dayDate = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
        // Invalid Date 체크
        if (isNaN(dayDate.getTime())) {
          logger.error('Invalid date in fourteenDays generation', {
            dayIndex: i,
            startDate: startDate.toISOString(),
          });
          return null;
        }
        return startOfDay(dayDate);
      }).filter(Boolean) as Date[];
    } catch (error) {
      logger.error('Error generating fourteenDays', {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }, [startDate]);

  // 모든 질문과 답변 수집 (중복 제거)
  // useMemo로 감싸서 참조 안정성 확보 (무한 루프 방지)
  const allQuestionsAnswers = useMemo(() => {
    return submissions.reduce((acc, sub) => {
      const key = sub.dailyQuestion;
      if (!acc[key]) {
        acc[key] = sub.dailyAnswer;
      }
      return acc;
    }, {} as Record<string, string>);
  }, [submissions]);

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
  }, [allQuestionsAnswers]); // allQuestionsAnswers는 이제 안정적인 참조

  const assignments = matchingLookup?.matching.assignments ?? {};
  const viewerAssignment = currentUserId
    ? assignments[currentUserId] ?? null
    : null;
  const assignedProfileIds = useMemo(() => getAssignedProfiles(viewerAssignment), [viewerAssignment]);

  useEffect(() => {
    setDetailImageAspectRatio(null);
  }, [selectedSubmission?.bookImageUrl]);

  // v2.0/v1.0 호환: assigned 우선, fallback으로 similar + opposite
  const accessibleProfileIds = useMemo(() => {
    return new Set(assignedProfileIds);
  }, [assignedProfileIds]);
  const matchingVersion = matchingLookup?.matching.matchingVersion;
  const isRandomMatching = matchingVersion === 'random' || assignedProfileIds.length > 0;

  // ✅ 불필요한 useMemo 제거 (단순 replace, indexOf 연산)
  const normalizedParticipantId = participantId ? participantId.replace(/^ghost-/, '') : participantId;
  const assignmentIndex = normalizedParticipantId ? assignedProfileIds.indexOf(normalizedParticipantId) : -1;
  const previewLimit = useMemo(() => {
    if (
      unlockedProfileBooks === null ||
      unlockedProfileBooks === undefined ||
      !Number.isFinite(unlockedProfileBooks)
    ) {
      return assignedProfileIds.length;
    }
    return Math.min(unlockedProfileBooks, assignedProfileIds.length);
  }, [unlockedProfileBooks, assignedProfileIds.length]);
  const canPreviewAccess = isRandomMatching && assignmentIndex >= 0 && assignmentIndex < previewLimit;

  const isFeatured = accessibleProfileIds.has(participantId);

  // 새로운 규칙: 어제 인증한 사람인지 체크
  const isYesterdayVerified = yesterdayVerifiedIds?.has(participantId) ?? false;

  // 최종 접근 권한:
  // - 본인 OR 슈퍼관리자: 항상 가능
  // - 14일차 + 인증 완료: 모든 프로필 접근 가능
  // - 15일차 이후: 인증 없이도 모든 프로필 접근 가능
  // - 새 규칙: profileUnlockDate 이상 + 오늘 인증 + 어제 인증한 사람 → 접근 가능
  // - 매칭 날짜에 인증 완료: 해당 날짜의 모든 프로필북 접근 가능
  const hasAccess = isSelf ||
    isSuperAdmin ||
    (isAfterProgramWithoutAuth) ||  // 15일차 이후 (인증 불필요)
    (isFinalDayAccess && isVerifiedToday) ||  // 14일차 (인증 필요)
    (isFinalDayAccess && searchParams.get('freeAccess') === 'true') ||
    (isUnlockDayOrAfter && isVerifiedToday && isYesterdayVerified) ||
    (isVerifiedForMatchingDate && viewerHasAccessForDate) ||  // 매칭 날짜에 인증 → 해당 프로필북 접근 가능
    canPreviewAccess;  // 랜덤 매칭 미인증자: 제한된 미리 보기 허용

  // 로딩 상태
  if (sessionLoading || participantLoading || submissionsLoading || viewerSubmissionLoading) {
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

  // 이름에서 성 제거 (예: "김철수" -> "철수")
  const firstName = getFirstName(participant.name);

  // 이미지 클릭 핸들러
  const handleImageClick = () => {
    // 원본 이미지는 오직 faceImage만 사용 (폴백 없음)
    const imageUrl = participant.faceImage;
    if (imageUrl) {
      setImageViewerUrl(imageUrl);
      setImageViewerOpen(true);
    }
  };

  // 코호트 번호 추출 (예: "1기" → 1, "2기" → 2)
  const cohortNumber = cohort?.name ? parseInt(cohort.name.match(/\d+/)?.[0] || '0', 10) : undefined;

  // 각 날짜에 대한 제출물 찾기 (dayNumber 추가)
  // ✅ 새벽 2시 정책: submissionDate 필드 사용 (submittedAt 시각이 아님)
  const dailySubmissions = fourteenDays.map((date, index) => {
    try {
      // Invalid Date 체크
      if (!date || isNaN(date.getTime())) {
        logger.error('Invalid date in dailySubmissions', {
          index,
          date,
        });
        return {
          date: new Date(), // Fallback to current date
          submission: undefined,
          hasSubmission: false,
          dayNumber: index + 1,
        };
      }

      const dateString = format(date, 'yyyy-MM-dd');
      const submission = submissions.find((sub) => sub.submissionDate === dateString);
      return {
        date,
        submission,
        hasSubmission: !!submission,
        dayNumber: index + 1, // 1~14
      };
    } catch (error) {
      logger.error('Error processing dailySubmission', {
        index,
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        date: new Date(), // Fallback to current date
        submission: undefined,
        hasSubmission: false,
        dayNumber: index + 1,
      };
    }
  });

  // 최근 제출물 (가장 최근 1개) - submissions는 desc 정렬이므로 첫 번째 항목이 최신
  const latestSubmission = sortedSubmissions.length > 0 ? sortedSubmissions[0] : null;

  return (
    <PageTransition>
      <div className="app-shell flex flex-col overflow-y-auto" style={{ backgroundColor: colors.background }}>
        {/* 상단바 */}
        <TopBar
          onBack={() => router.back()}
          align="left"
          style={{ backgroundColor: colors.background, borderBottom: 'none' }}
          position="sticky"
        />

        {/* 메인 콘텐츠 */}
        <div className="relative flex-1">
          {/* 프로필 이미지 (컨테이너 위로 겹침) */}
          <div className="absolute left-1/2 transform -translate-x-1/2 top-[36px] z-10">
            <div
              className="relative w-[80px] h-[80px] cursor-pointer transition-transform active:scale-95"
              onClick={handleImageClick}
            >
              <Avatar className="w-full h-full border-[3px] border-[#31363e]">
                {getResizedImageUrl(participant.profileImageCircle || participant.profileImage) !== (participant.profileImageCircle || participant.profileImage) && (
                  <AvatarImage
                    src={getResizedImageUrl(participant.profileImageCircle || participant.profileImage)}
                    alt={participant.name}
                    className="object-cover"
                  />
                )}
                <AvatarImage
                  src={participant.profileImageCircle || participant.profileImage}
                  alt={participant.name}
                  className="object-cover"
                />
                <AvatarFallback className="bg-gray-200 text-2xl font-bold text-gray-700">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>

          {/* 흰색 카드 컨테이너 */}
          <div
            className="bg-white rounded-tl-[32px] rounded-tr-[32px] mt-[80px] max-w-[calc(100%-32px)] md:max-w-[420px] mx-auto"
            style={{ minHeight: 'calc(var(--app-viewport-height, 100vh) - 124px)' }}
          >
            <div className="w-full px-6 sm:px-6 md:px-8">
              {/* 프로필 정보 */}
              <div className="flex flex-col items-center pt-[48px] pb-[32px]">
                <div className="flex flex-col items-center gap-2 mb-[32px]">
                  <button
                    onClick={() => setProfileImageDialogOpen(true)}
                    className="flex items-center gap-1 transition-opacity hover:opacity-70"
                  >
                    <h2 className="text-[20px] font-bold leading-[1.4] text-[#31363e]">
                      {firstName}
                    </h2>
                    <img
                      src="/icons/chevron.svg"
                      alt="프로필 이미지 보기"
                      width={20}
                      height={20}
                      className="flex-shrink-0"
                    />
                  </button>
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
                            {latestSubmission.bookAuthor && (
                              <p className="text-[12px] leading-[1.4] text-[#8f98a3] tracking-[-0.12px]">
                                {latestSubmission.bookAuthor}
                              </p>
                            )}
                          </div>
                        </div>
                        {/* 책 표지 표시: bookCoverUrl 우선, 없으면 bookImageUrl 사용 */}
                        {(latestSubmission.bookCoverUrl || latestSubmission.bookImageUrl) && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-[60px] h-[88px] bg-white rounded-[4px] overflow-hidden shadow-sm">
                            <Image
                              src={getResizedImageUrl(latestSubmission.bookCoverUrl || latestSubmission.bookImageUrl) || latestSubmission.bookCoverUrl || latestSubmission.bookImageUrl}
                              alt="책 표지"
                              fill
                              sizes="60px"
                              className="object-contain"
                            />
                          </div>
                        )}
                      </div>
                      {latestSubmission.bookDescription && (
                        <p className="text-[14px] font-medium leading-[1.4] text-[#575e68] tracking-[-0.14px]">
                          {latestSubmission.bookDescription.slice(0, 100)}
                          {latestSubmission.bookDescription.length > 100 ? '...' : ''}
                        </p>
                      )}
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
                      cohortNumber={cohortNumber}
                    />
                    <HistoryWeekRow
                      days={dailySubmissions.slice(7, 14)}
                      onSubmissionClick={setSelectedSubmission}
                      bookmarkCompleted={colors.bookmarkCompleted}
                      bookmarkEmpty={colors.bookmarkEmpty}
                      cohortNumber={cohortNumber}
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
                            ref={(el) => {
                              if (el) {
                                questionRefs.current.set(question, el);
                              } else {
                                questionRefs.current.delete(question);
                              }
                            }}
                            className={`${isLastQuestion ? '' : 'border-b border-[#dddddd]'} py-4 ${index === 0 ? 'pt-0' : ''}`}
                          >
                            <button
                              onClick={() => toggleQuestion(question)}
                              className="w-full flex items-center justify-between gap-1 text-left"
                            >
                              <p className="flex-1 text-[16px] font-medium leading-[1.4] text-[#575e68]">
                                {question}
                              </p>
                              <div className={`flex-shrink-0 transition-transform duration-300 ease-in-out ${isExpanded ? 'rotate-180' : ''
                                }`}>
                                <img
                                  src="/icons/chevron-down.svg"
                                  alt=""
                                  width={20}
                                  height={20}
                                />
                              </div>
                            </button>

                            <div
                              className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[2000px] mt-4 opacity-100' : 'max-h-0 mt-0 opacity-0'
                                }`}
                            >
                              <div className="rounded-[12px] px-4 py-4" style={{ backgroundColor: colors.accentLight }}>
                                <p className="text-[14px] leading-[1.4] text-[#31363e] whitespace-pre-wrap break-words">
                                  {answer}
                                </p>
                              </div>
                            </div>
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
            <DialogContent className="profile-reading-dialog profile-reading-dialog-ios-safe sm:max-w-md sm:rounded-2xl">
              <DialogHeader className="text-left gap-1">
                <DialogTitle className="text-base">
                  {submissionDateLabel ?? '독서 기록'}
                </DialogTitle>
              </DialogHeader>
              <div className="profile-reading-scroll space-y-4 overflow-y-auto">
                {/* 책 이미지 */}
                {selectedSubmission.bookImageUrl && (
                  <div
                    className="relative mx-auto w-full max-w-[360px] overflow-hidden rounded-2xl border bg-muted shadow-sm md:max-w-[420px]"
                    style={{
                      aspectRatio: detailImageAspectRatio ?? 3 / 4,
                      maxHeight: 'min(320px, 45vh)',
                    }}
                  >
                    <Image
                      src={getResizedImageUrl(selectedSubmission.bookImageUrl) || selectedSubmission.bookImageUrl}
                      alt="책 사진"
                      fill
                      sizes="(max-width: 768px) 90vw, 420px"
                      className="object-contain"
                      priority={false}
                      onLoadingComplete={({ naturalWidth, naturalHeight }) => {
                        if (naturalWidth > 0 && naturalHeight > 0) {
                          setDetailImageAspectRatio(naturalWidth / naturalHeight);
                        }
                      }}
                    />
                  </div>
                )}
                {/* 읽은 책 */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    읽은 책
                  </p>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      {selectedSubmission.bookTitle}
                    </p>
                    {selectedSubmission.bookAuthor && (
                      <p className="text-sm text-muted-foreground">
                        {selectedSubmission.bookAuthor}
                      </p>
                    )}
                  </div>
                </div>
                {/* 한 줄 감상평 */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    한 줄 감상평
                  </p>
                  <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap break-words">
                    {selectedSubmission.review}
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* 간단 프로필 이미지 다이얼로그 */}
        <ProfileImageDialog
          participant={participant}
          open={profileImageDialogOpen}
          onClose={() => setProfileImageDialogOpen(false)}
        />

        {/* 이미지 확대 뷰어 (프로필 이미지 클릭 시) */}
        <ImageViewerDialog
          open={imageViewerOpen}
          onOpenChange={setImageViewerOpen}
          imageUrl={imageViewerUrl}
        />

        {/* Safe Area CSS */}
        <style jsx global>{`
          .safe-area-header {
            padding-top: calc(1rem + env(safe-area-inset-top));
          }

          /* iOS 11.2 이전 버전 호환성 */
          @supports (padding-top: constant(safe-area-inset-top)) {
            .safe-area-header {
              padding-top: calc(1rem + constant(safe-area-inset-top));
            }
          }

          .profile-reading-dialog {
            margin: 0 !important;
            inset: auto 0 0 0 !important;
            width: 100% !important;
            max-width: none !important;
            border-radius: 28px 28px 0 0 !important;
            padding: 24px 24px calc(24px + env(safe-area-inset-bottom, 0px)) !important;
            box-shadow: 0 -20px 40px rgba(15, 23, 42, 0.18);
          }

          .profile-reading-scroll {
            max-height: min(65vh, 540px);
          }

          @media (min-width: 640px) {
            .profile-reading-dialog {
              inset: 50% auto auto 50% !important;
              transform: translate(-50%, -50%) !important;
              width: clamp(360px, 90vw, 520px) !important;
              border-radius: 20px !important;
              padding: 28px !important;
              box-shadow: 0 24px 48px rgba(15, 23, 42, 0.12);
            }

            .profile-reading-scroll {
              max-height: 60vh;
            }
          }

          /* iOS PWA 독서 기록 모달 Safe Area 대응 */
          @media (max-width: 640px) and (display-mode: standalone) {
            .profile-reading-dialog-ios-safe {
              padding-bottom: calc(24px + env(safe-area-inset-bottom, 0px)) !important;
            }

            /* iOS 11.2 이전 버전 호환성 */
            @supports (padding-top: constant(safe-area-inset-top)) {
              .profile-reading-dialog-ios-safe {
                padding-bottom: calc(24px + constant(safe-area-inset-bottom)) !important;
              }
            }
          }
        `}</style>
      </div>
    </PageTransition>
  );
}

export default function ProfileBookPage({ params }: { params: Promise<{ participantId: string }> }) {
  const resolvedParams = use(params);
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ProfileBookContent params={resolvedParams} />
    </Suspense>
  );
}
