'use client';

import { Suspense, useRef, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BookOpen } from 'lucide-react';
import { logger } from '@/lib/logger';
import { scrollToBottom, formatDate, formatTime } from '@/lib/utils';
import { getTodayString } from '@/lib/date-utils';
import { APP_CONSTANTS, SYSTEM_IDS } from '@/constants/app';
import { uploadNoticeImage } from '@/lib/firebase/storage';
import { Notice, Participant } from '@/types/database';
import { appRoutes } from '@/lib/navigation';
import { AUTH_TIMING } from '@/constants/auth';
import { useCohort } from '@/hooks/use-cohorts';
import { useParticipantsByCohort } from '@/hooks/use-participants';
import { useNoticesByCohort, useCreateNotice, useUpdateNotice, useToggleNoticePin, useDeleteNotice } from '@/hooks/use-notices';
import { useAuth } from '@/contexts/AuthContext';
import { useIsIosStandalone } from '@/hooks/use-standalone-ios';
import { useIsAdminMode } from '@/contexts/ViewModeContext';
import { useSubmissionsByParticipant } from '@/hooks/use-submissions';
import { HeaderSkeleton, NoticeListSkeleton, FooterActionsSkeleton } from '@/components/ChatPageSkeleton';
import Header from '@/components/Header';
import ParticipantsList from '@/components/ParticipantsList';
import NoticeItem from '@/components/NoticeItem';
import PageTransition from '@/components/PageTransition';
import UnifiedButton from '@/components/UnifiedButton';
import { BookLibraryIcon } from '@/components/icons/BookLibraryIcon';
import FooterActions from '@/components/FooterActions';
import DirectMessageDialog from '@/components/DirectMessageDialog';
import ReadingSubmissionDialog from '@/components/ReadingSubmissionDialog';
import ProfileImageDialog from '@/components/ProfileImageDialog';
import NoticeWriteDialog from '@/components/NoticeWriteDialog';
import NoticeEditDialog from '@/components/NoticeEditDialog';
import NoticeDeleteDialog from '@/components/NoticeDeleteDialog';
import SettingsDialog from '@/components/SettingsDialog';

/**
 * Set에서 item을 토글 (추가/삭제)
 */
function toggleSetItem<T>(set: Set<T>, item: T): Set<T> {
  const newSet = new Set(set);
  if (newSet.has(item)) {
    newSet.delete(item);
  } else {
    newSet.add(item);
  }
  return newSet;
}

/**
 * localStorage에 데이터 저장 (에러 처리 포함)
 */
function saveToLocalStorage(key: string, data: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    logger.warn('localStorage 저장 실패:', error);
  }
}

function ChatPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cohortId = searchParams.get('cohort');

  // Firebase Auth 기반 인증
  const { participant, isLoading: sessionLoading } = useAuth();
  const currentUserId = participant?.id;

  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [writeDialogOpen, setWriteDialogOpen] = useState(false);
  const [newNoticeContent, setNewNoticeContent] = useState('');
  const [uploadingNoticeImage, setUploadingNoticeImage] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [editContent, setEditContent] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<Notice | null>(null);
  const [dmDialogOpen, setDmDialogOpen] = useState(false);
  const [dmTarget, setDmTarget] = useState<Participant | null>(null);
  const [submissionDialogOpen, setSubmissionDialogOpen] = useState(false);
  const [collapsedNotices, setCollapsedNotices] = useState<Set<string>>(new Set());
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const isIosStandalone = useIsIosStandalone();

  // Race Condition 방지: 이미 네비게이션 중인지 추적
  const [isNavigating, setIsNavigating] = useState(false);

  // 최신 공지 요소 ref (스크롤 타겟)
  const latestNoticeRef = useRef<HTMLDivElement>(null);

  // Firebase hooks for data fetching
  const { data: cohort, isLoading: cohortLoading } = useCohort(cohortId || undefined);
  const { data: participants = [], isLoading: participantsLoading } = useParticipantsByCohort(cohortId || undefined);

  // 관리자 모드 확인 (ViewModeContext가 DB의 isAdministrator와 UI 모드 상태를 모두 고려)
  const isAdmin = useIsAdminMode();

  // 오늘 제출 여부 확인
  const { data: submissions = [] } = useSubmissionsByParticipant(currentUserId);
  const todaySubmission = submissions.find(
    (sub) => sub.submissionDate === getTodayString()
  );
  const hasSubmittedToday = !!todaySubmission;

  // Firebase hooks
  const { data: noticesData = [], isLoading } = useNoticesByCohort(cohortId || undefined);
  const createNoticeMutation = useCreateNotice();
  const updateNoticeMutation = useUpdateNotice();
  const togglePinMutation = useToggleNoticePin();
  const deleteNoticeMutation = useDeleteNotice();

  // localStorage에서 접힌 공지 목록 로드 (클라이언트 전용, SSR 호환)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(APP_CONSTANTS.STORAGE_KEY_COLLAPSED_NOTICES);
      if (saved) {
        setCollapsedNotices(new Set(JSON.parse(saved)));
      }
    } catch (error) {
      logger.error('localStorage 로드 실패:', error);
    }
  }, []);

  // 세션 및 cohort 검증
  useEffect(() => {
    if (!sessionLoading) {
      if (!participant) {
        // 세션 없음 → 로그인 페이지로
        router.replace('/app');
        return;
      }

      if (!cohortId) {
        // cohortId 없음 → 로그인 페이지로
        router.replace('/app');
        return;
      }
    }
  }, [sessionLoading, participant, cohortId]);

  // 최신 공지로 자동 스크롤 (페이지 로드 및 최초 로그인 시)
  useEffect(() => {
    if (!isLoading && noticesData.length > 0 && latestNoticeRef.current) {
      // 최신 공지가 화면에 보이도록 스크롤
      latestNoticeRef.current.scrollIntoView({
        behavior: 'auto',
        block: 'center',
        inline: 'nearest'
      });

      logger.info('[Scroll Effect] Scrolled to latest notice');
    }
  }, [isLoading, noticesData.length]);

  // Callback hooks (must be before any conditional returns)
  const handleDMClick = useCallback((participant: Participant) => {
    setDmTarget(participant);
    setDmDialogOpen(true);
  }, []);

  const handleMessageAdmin = useCallback(() => {
    // 항상 admin 계정(필립앤소피)과 대화
    const adminTarget: Participant = {
      id: 'admin',
      cohortId: cohortId || '',
      name: APP_CONSTANTS.ADMIN_NAME,
      phoneNumber: '01000000001',
      profileImage: '/favicon.webp',
      isAdministrator: true,
      createdAt: new Date() as any,
      updatedAt: new Date() as any,
    };

    setDmTarget(adminTarget);
    setDmDialogOpen(true);
  }, [cohortId]);

  const handleProfileBookClick = useCallback((participant: Participant) => {
    if (!cohortId) return;
    router.push(appRoutes.profile(participant.id, cohortId));
  }, [router, cohortId]);

  // 참가자 목록 클릭 핸들러 (Race Condition 방지 + Sheet State 관리)
  const handleParticipantsClick = useCallback(() => {
    // cohortId는 항상 필수 (먼저 체크)
    if (!cohortId) {
      logger.warn('cohortId가 없어 참가자 목록을 열 수 없습니다');
      return;
    }

    // 이미 네비게이션 중이면 무시 (Race Condition 방지)
    if (isNavigating) {
      return;
    }

    if (isIosStandalone) {
      // iOS PWA: Sheet를 명시적으로 닫고 전용 페이지로 이동
      setParticipantsOpen(false);
      setIsNavigating(true);

      // 다음 프레임에 navigation (상태 업데이트 후)
      requestAnimationFrame(() => {
        router.push(appRoutes.participants(cohortId));

        // Navigation 완료 후 다시 활성화
        setTimeout(() => setIsNavigating(false), AUTH_TIMING.NAVIGATION_COOLDOWN);
      });
      return;
    }

    // 기타 플랫폼: Sheet 오버레이 열기
    setParticipantsOpen(true);
  }, [isIosStandalone, cohortId, router, isNavigating]);

  // 로딩 중 또는 인증 실패 (리다이렉트 전): 스켈레톤 UI 표시
  // sessionLoading: Firebase Auth 상태 확인 중
  // cohortLoading: Cohort 데이터 로딩 중
  // !participant || !cohort || !cohortId: 인증 실패 (useEffect가 리다이렉트 처리 중)
  if (sessionLoading || cohortLoading || !participant || !cohort || !cohortId) {
    return (
      <PageTransition>
        <div className="app-shell flex flex-col overflow-hidden">
          <HeaderSkeleton />
          <NoticeListSkeleton />
          <FooterActionsSkeleton />
        </div>
      </PageTransition>
    );
  }

  const handleWriteNotice = async (imageFile: File | null) => {
    if (!newNoticeContent.trim() || !cohortId) return;

    try {
      setUploadingNoticeImage(true);
      let imageUrl: string | undefined;

      // 이미지가 있으면 업로드
      if (imageFile) {
        imageUrl = await uploadNoticeImage(imageFile, cohortId);
      }

      await createNoticeMutation.mutateAsync({
        cohortId,
        author: APP_CONSTANTS.ADMIN_NAME,
        content: newNoticeContent.trim(),
        imageUrl,
      });

      setNewNoticeContent('');
      setWriteDialogOpen(false);
      // 공지 작성 후: 부드럽게 스크롤 (DOM 렌더링 대기)
      scrollToBottom(undefined, { behavior: 'smooth', delay: AUTH_TIMING.SCROLL_DELAY });
    } catch (error) {
      logger.error('공지 작성 실패:', error);
    } finally {
      setUploadingNoticeImage(false);
    }
  };


  const handleEditNotice = (notice: Notice) => {
    setEditingNotice(notice);
    setEditContent(notice.content);
  };

  const handleSaveEdit = async () => {
    if (!editingNotice || !editContent.trim()) return;

    try {
      await updateNoticeMutation.mutateAsync({
        id: editingNotice.id,
        data: { content: editContent.trim() },
      });

      setEditingNotice(null);
      setEditContent('');
    } catch (error) {
      logger.error('공지 수정 실패:', error);
    }
  };

  const handleDeleteNotice = async (notice: Notice) => {
    try {
      await deleteNoticeMutation.mutateAsync(notice.id);
      setDeleteConfirm(null);
    } catch (error) {
      logger.error('공지 삭제 실패:', error);
    }
  };

  const handleTogglePin = async (notice: Notice) => {
    try {
      await togglePinMutation.mutateAsync(notice.id);
    } catch (error) {
      logger.error('공지 고정 토글 실패:', error);
    }
  };

  const toggleNoticeCollapse = (noticeId: string) => {
    setCollapsedNotices((prev) => {
      const newSet = toggleSetItem(prev, noticeId);
      saveToLocalStorage(APP_CONSTANTS.STORAGE_KEY_COLLAPSED_NOTICES, [...newSet]);
      return newSet;
    });
  };


  // 고정 공지와 일반 공지 분리
  const pinnedNotices = noticesData.filter((n) => n.isPinned);
  const unpinnedNotices = noticesData.filter((n) => !n.isPinned);

  // 일반 공지만 날짜별로 그룹화
  const groupedNotices = unpinnedNotices.reduce(
    (acc, notice) => {
      const dateKey = formatDate(notice.createdAt);
      if (!acc[dateKey]) {
        acc[dateKey] = {
          date: notice.createdAt.toDate(),
          notices: [],
        };
      }
      acc[dateKey].notices.push(notice);
      return acc;
    },
    {} as Record<string, { date: Date; notices: Notice[] }>
  );

  // 날짜별로 정렬 (최신 날짜 → 오래된 날짜) - flex-col-reverse로 자동 역순
  const sortedGroupedNotices = Object.entries(groupedNotices).sort(
    ([, a], [, b]) => {
      const groupA = a as { date: Date; notices: Notice[] };
      const groupB = b as { date: Date; notices: Notice[] };
      return groupB.date.getTime() - groupA.date.getTime(); // 역순 정렬
    }
  );

  return (
    <PageTransition>
      <div className="app-shell flex flex-col overflow-hidden">
        <Header
          onParticipantsClick={handleParticipantsClick}
          onWriteClick={() => setWriteDialogOpen(true)}
          onMessageAdminClick={handleMessageAdmin}
          onSettingsClick={() => setSettingsOpen(true)}
          isAdmin={isAdmin}
        />

        <ParticipantsList
          participants={participants.filter((p) => p.id !== SYSTEM_IDS.ADMIN)}
          currentUserId={currentUserId || ''}
          open={participantsOpen}
          onOpenChange={setParticipantsOpen}
          isAdmin={isAdmin}
          onDMClick={handleDMClick}
          onProfileClick={setSelectedParticipant}
          onProfileBookClick={handleProfileBookClick}
        />
        <DirectMessageDialog
          open={dmDialogOpen}
          onOpenChange={setDmDialogOpen}
          currentUserId={currentUserId || ''}
          currentUser={participant}
          otherUser={dmTarget}
        />
        <ReadingSubmissionDialog
          open={submissionDialogOpen}
          onOpenChange={setSubmissionDialogOpen}
          participantId={currentUserId || ''}
          participationCode={currentUserId || ''}
          existingSubmission={todaySubmission || undefined}
        />
        <ProfileImageDialog
          participant={selectedParticipant}
          open={!!selectedParticipant}
          onClose={() => {
            setSelectedParticipant(null);
            // 프로필 리스트는 유지 (닫지 않음)
          }}
        />

        {/* 고정 공지 영역 - 항상 최상단 고정 (flex-col-reverse 영향 받지 않음) */}
        {pinnedNotices.length > 0 && (
          <div className="sticky top-0 z-40 border-b border-primary/20 shadow-sm bg-background">
            {pinnedNotices.map((notice, index) => (
              <div
                key={notice.id}
                className="group transition-colors duration-normal bg-primary-light hover:bg-blue-100"
              >
                <div className="container mx-auto max-w-3xl px-4 py-3">
                  <NoticeItem
                    notice={notice}
                    isAdmin={isAdmin}
                    isCollapsed={collapsedNotices.has(notice.id)}
                    onToggleCollapse={toggleNoticeCollapse}
                    onTogglePin={handleTogglePin}
                    onEdit={handleEditNotice}
                    onDelete={setDeleteConfirm}
                    formatTime={formatTime}
                    priority={index === 0 && !!notice.imageUrl}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 일반 공지 영역 - flex-col-reverse로 최신 공지가 아래로 */}
        <main className="relative flex flex-col-reverse flex-1 overflow-y-auto bg-background pb-20">
          {/* 일반 공지 영역 - 날짜별 그룹 */}
          {sortedGroupedNotices.map(([date, groupData], groupIndex) => {
            const { notices: dateNotices } = groupData as { date: Date; notices: Notice[] };
            // 첫 번째 그룹의 첫 번째 공지에만 priority (고정 공지가 없을 경우)
            const isFirstGroup = groupIndex === 0;
            const hasNoPinnedNotices = pinnedNotices.length === 0;

            return (
              <div key={date}>
                {/* 날짜 구분선 */}
                <div className="container mx-auto max-w-3xl px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-border" />
                    <span className="rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                      {date}
                    </span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                </div>

                {dateNotices.map((notice, noticeIndex) => {
                  // 최신 공지 (첫 번째 그룹의 마지막 공지)에 ref 연결
                  const isLatestNotice = isFirstGroup && noticeIndex === dateNotices.length - 1;

                  return (
                    <div
                      key={notice.id}
                      ref={isLatestNotice ? latestNoticeRef : null}
                      className="group transition-colors duration-normal hover:bg-muted/50"
                    >
                      <div className="container mx-auto max-w-3xl px-4 py-3">
                        <NoticeItem
                          notice={notice}
                          isAdmin={isAdmin}
                          onTogglePin={handleTogglePin}
                          onEdit={handleEditNotice}
                          onDelete={setDeleteConfirm}
                          formatTime={formatTime}
                          priority={hasNoPinnedNotices && isLatestNotice && !!notice.imageUrl}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </main>

      {/* 하단 네비게이션 바 */}
      <FooterActions>
        {isAdmin ? (
          /* 관리자 모드일 때 버튼 */
          <UnifiedButton
            variant="primary"
            onClick={() => router.push(`/app/admin/matching?cohort=${cohortId}`)}
            icon={<BookOpen className="h-5 w-5" />}
            className="w-full"
          >
            매칭 관리
          </UnifiedButton>
        ) : (
          /* 참가자 모드일 때 버튼 */
          <div className="grid grid-cols-2 gap-2">
            {/* 독서 인증하기 버튼 */}
            <UnifiedButton
              variant="primary"
              onClick={() => setSubmissionDialogOpen(true)}
              icon={<BookOpen className="h-5 w-5" />}
              className={hasSubmittedToday ? 'opacity-50' : ''}
            >
              {hasSubmittedToday ? '인증 수정하기' : '독서 인증'}
            </UnifiedButton>

            {/* 오늘의 서재 버튼 */}
            <UnifiedButton
              variant="secondary"
              onClick={() => router.push(appRoutes.todayLibrary(cohortId))}
              icon={<BookLibraryIcon className="h-5 w-5" />}
            >
              오늘의 서재
            </UnifiedButton>
          </div>
        )}
      </FooterActions>

      <NoticeWriteDialog
        open={writeDialogOpen}
        onOpenChange={setWriteDialogOpen}
        content={newNoticeContent}
        onContentChange={setNewNoticeContent}
        onSubmit={handleWriteNotice}
        uploading={uploadingNoticeImage}
      />

      <NoticeEditDialog
        open={!!editingNotice}
        onOpenChange={(open) => !open && setEditingNotice(null)}
        content={editContent}
        onContentChange={setEditContent}
        onSave={handleSaveEdit}
        saving={updateNoticeMutation.isPending}
      />

      <NoticeDeleteDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        notice={deleteConfirm}
        onConfirm={handleDeleteNotice}
        deleting={deleteNoticeMutation.isPending}
      />

      <SettingsDialog
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
      </div>
    </PageTransition>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<HeaderSkeleton />}>
      <ChatPageContent />
    </Suspense>
  );
}
