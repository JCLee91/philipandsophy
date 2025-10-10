'use client';

import { Suspense, useRef, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BookOpen } from 'lucide-react';
import { logger } from '@/lib/logger';
import { scrollToBottom, formatDate, formatTime } from '@/lib/utils';
import { APP_CONSTANTS } from '@/constants/app';
import { uploadNoticeImage } from '@/lib/firebase/storage';
import { Notice, Participant } from '@/types/database';
import { appRoutes } from '@/lib/navigation';
import { useCohort } from '@/hooks/use-cohorts';
import { useParticipantsByCohort } from '@/hooks/use-participants';
import { useNoticesByCohort, useCreateNotice, useUpdateNotice, useToggleNoticePin, useDeleteNotice } from '@/hooks/use-notices';
import { useSession } from '@/hooks/use-session';
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

  // 세션 기반 인증 (URL에서 userId 제거)
  const { currentUser, isLoading: sessionLoading } = useSession();
  const currentUserId = currentUser?.id;

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
  const hasScrolledRef = useRef(false);

  // Firebase hooks for data fetching
  const { data: cohort, isLoading: cohortLoading } = useCohort(cohortId || undefined);
  const { data: participants = [], isLoading: participantsLoading } = useParticipantsByCohort(cohortId || undefined);
  const isAdmin = currentUser?.isAdmin || false;

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
      if (!currentUser) {
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
  }, [sessionLoading, currentUser, cohortId, router]);

  // 초기 로드 시 즉시 스크롤 (번쩍임 방지)
  useEffect(() => {
    if (noticesData.length > 0 && !hasScrolledRef.current) {
      scrollToBottom(undefined, { behavior: 'auto', delay: 0 });
      hasScrolledRef.current = true;
    }
  }, [noticesData]);

  // Callback hooks (must be before any conditional returns)
  const handleDMClick = useCallback((participant: Participant) => {
    setDmTarget(participant);
    setDmDialogOpen(true);
  }, []);

  const handleMessageAdmin = useCallback(() => {
    const admins = participants.filter((p) => p.isAdmin);
    if (admins.length === 0) return;

    if (admins.length === 1) {
      // 관리자가 1명만 있으면 기존 방식 사용
      setDmTarget(admins[0]);
      setDmDialogOpen(true);
    } else {
      // 관리자가 여러 명이면 관리자 팀과 대화
      // 모든 관리자가 공유하는 팀 채팅방 사용
      const adminTeamTarget = {
        id: 'admin-team',
        name: APP_CONSTANTS.ADMIN_NAME,
        isAdmin: true,
        // 다른 필요한 필드들...
      } as Participant;

      setDmTarget(adminTeamTarget);
      setDmDialogOpen(true);
    }
  }, [participants]);

  const handleProfileBookClick = useCallback((participant: Participant) => {
    if (!cohortId) return;
    router.push(appRoutes.profile(participant.id, cohortId));
  }, [router, cohortId]);

  // 로딩 중: 스켈레톤 UI 표시
  if (sessionLoading || cohortLoading) {
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

  // 세션 or cohort 없음 (useEffect에서 리다이렉트 처리됨)
  if (!currentUser || !cohort || !cohortId) {
    return null;
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
      // 공지 작성 후: 부드럽게 스크롤
      scrollToBottom(undefined, { behavior: 'smooth', delay: 100 });
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

  // 날짜별로 정렬 (오래된 날짜 → 최신 날짜)
  const sortedGroupedNotices = Object.entries(groupedNotices).sort(
    ([, a], [, b]) => {
      const groupA = a as { date: Date; notices: Notice[] };
      const groupB = b as { date: Date; notices: Notice[] };
      return groupA.date.getTime() - groupB.date.getTime();
    }
  );

  return (
    <PageTransition>
      <div className="app-shell flex flex-col overflow-hidden">
        <Header
          onParticipantsClick={() => setParticipantsOpen(true)}
          onWriteClick={() => setWriteDialogOpen(true)}
          onMessageAdminClick={handleMessageAdmin}
          isAdmin={isAdmin}
        />
        <ParticipantsList
          participants={participants.filter((p) => !p.isAdmin)}
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
          currentUser={currentUser}
          otherUser={dmTarget}
        />
        <ReadingSubmissionDialog
          open={submissionDialogOpen}
          onOpenChange={setSubmissionDialogOpen}
          participantId={currentUserId || ''}
          participationCode={currentUserId || ''}
        />
        <ProfileImageDialog
          participant={selectedParticipant}
          open={!!selectedParticipant}
          onClose={() => setSelectedParticipant(null)}
        />
        <main className="relative flex-1 overflow-y-auto bg-background pb-20">
          {/* 고정 공지 영역 - sticky로 스크롤 시 상단 고정 */}
          {pinnedNotices.length > 0 && (
            <div className="sticky top-0 z-40 border-b border-primary/20 shadow-sm">
              {pinnedNotices.map((notice) => (
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
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 일반 공지 영역 - 날짜별 그룹 */}
          {sortedGroupedNotices.map(([date, groupData]) => {
            const { notices: dateNotices } = groupData as { date: Date; notices: Notice[] };
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

                {dateNotices.map((notice) => (
                  <div
                    key={notice.id}
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
                      />
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </main>

      {/* 하단 네비게이션 바 */}
      <FooterActions>
        <div className="grid grid-cols-2 gap-2">
          {/* 독서 인증하기 버튼 */}
          <UnifiedButton
            variant="primary"
            onClick={() => setSubmissionDialogOpen(true)}
            icon={<BookOpen className="h-5 w-5" />}
          >
            독서 인증
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
      />

      <NoticeDeleteDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        notice={deleteConfirm}
        onConfirm={handleDeleteNotice}
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
