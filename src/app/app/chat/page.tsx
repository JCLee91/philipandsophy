'use client';

import { Suspense } from 'react';
import Header from '@/components/Header';
import ParticipantsList from '@/components/ParticipantsList';
import DirectMessageDialog from '@/components/DirectMessageDialog';
import ReadingSubmissionDialog from '@/components/ReadingSubmissionDialog';
import ProfileImageDialog from '@/components/ProfileImageDialog';
import NoticeItem from '@/components/NoticeItem';
import LoadingSpinner from '@/components/LoadingSpinner';
import NoticeWriteDialog from '@/components/NoticeWriteDialog';
import NoticeEditDialog from '@/components/NoticeEditDialog';
import NoticeDeleteDialog from '@/components/NoticeDeleteDialog';
import PageTransition from '@/components/PageTransition';
import { Notice, Participant } from '@/types/database';
import { useCohort } from '@/hooks/use-cohorts';
import { useParticipant, useParticipantsByCohort } from '@/hooks/use-participants';
import { BookOpen } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useNoticesByCohort, useCreateNotice, useUpdateNotice, useToggleNoticePin, useDeleteNotice } from '@/hooks/use-notices';
import { scrollToBottom, formatDate, formatTime } from '@/lib/utils';
import { APP_CONSTANTS } from '@/constants/app';
import { uploadNoticeImage } from '@/lib/firebase/storage';

function ChatPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cohortId = searchParams.get('cohort');
  const currentUserId = searchParams.get('userId');

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

  // Firebase hooks for data fetching
  const { data: cohort, isLoading: cohortLoading } = useCohort(cohortId || undefined);
  const { data: participants = [], isLoading: participantsLoading } = useParticipantsByCohort(cohortId || undefined);
  const { data: currentUser, isLoading: currentUserLoading } = useParticipant(currentUserId || undefined);
  const isAdmin = currentUser?.isAdmin || false;

  // Firebase hooks
  const { data: noticesData = [], isLoading } = useNoticesByCohort(cohortId || undefined);
  const createNoticeMutation = useCreateNotice();
  const updateNoticeMutation = useUpdateNotice();
  const togglePinMutation = useToggleNoticePin();
  const deleteNoticeMutation = useDeleteNotice();

  useEffect(() => {
    if (!cohortId || !currentUserId) {
      router.push('/');
    }
  }, [cohortId, currentUserId, router]);

  // 공지 로드 시 스크롤
  useEffect(() => {
    if (noticesData.length > 0) {
      scrollToBottom();
    }
  }, [noticesData]);

  // Show loading state
  if (cohortLoading || currentUserLoading) {
    return <LoadingSpinner />;
  }

  if (!cohortId || !currentUserId || !cohort || !currentUser) {
    router.push('/');
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
      scrollToBottom();
    } catch (error) {
      console.error('공지 작성 실패:', error);
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

    await updateNoticeMutation.mutateAsync({
      id: editingNotice.id,
      data: { content: editContent.trim() },
    });

    setEditingNotice(null);
    setEditContent('');
  };

  const handleDeleteNotice = async (notice: Notice) => {
    await deleteNoticeMutation.mutateAsync(notice.id);
    setDeleteConfirm(null);
  };

  const handleTogglePin = async (notice: Notice) => {
    await togglePinMutation.mutateAsync(notice.id);
  };

  const handleDMClick = (participant: Participant) => {
    setDmTarget(participant);
    setDmDialogOpen(true);
  };

  const handleMessageAdmin = () => {
    const admin = participants.find((p) => p.isAdmin);
    if (admin) {
      setDmTarget(admin);
      setDmDialogOpen(true);
    }
  };

  const handleProfileBookClick = (participant: Participant) => {
    router.push(`/app/profile/${participant.id}?cohort=${cohortId}&userId=${currentUserId}`);
  };

  const toggleNoticeCollapse = (noticeId: string) => {
    setCollapsedNotices((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(noticeId)) {
        newSet.delete(noticeId);
      } else {
        newSet.add(noticeId);
      }
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
      const dateA = (a as { date: Date; notices: Notice[] }).date;
      const dateB = (b as { date: Date; notices: Notice[] }).date;
      return dateA.getTime() - dateB.getTime();
    }
  );

  return (
    <PageTransition>
      <div className="flex min-h-screen flex-col max-h-screen overflow-hidden">
        <Header
        onParticipantsClick={() => setParticipantsOpen(true)}
        onWriteClick={() => setWriteDialogOpen(true)}
        onMessageAdminClick={handleMessageAdmin}
        isAdmin={isAdmin}
        currentUserId={currentUserId || ''}
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
      <main className="flex-1 overflow-y-auto bg-background pb-20 relative">
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
      <div className="sticky bottom-0 border-t bg-background/95 backdrop-blur-sm pb-safe">
        <div className="container mx-auto max-w-3xl px-4 py-3">
          <div className="grid grid-cols-2 gap-3">
            {/* 독서 인증하기 버튼 */}
            <button
              type="button"
              onClick={() => setSubmissionDialogOpen(true)}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 font-semibold text-primary-foreground shadow-sm transition-all duration-normal hover:bg-primary/90 active:scale-95"
            >
              <BookOpen className="h-5 w-5" />
              <span>독서 인증</span>
            </button>

            {/* 오늘의 서재 버튼 */}
            <button
              type="button"
              onClick={() => router.push(`/app/chat/today-library?cohort=${cohortId}&userId=${currentUserId}`)}
              className="flex items-center justify-center gap-2 rounded-xl border-2 border-primary bg-background px-4 py-3.5 font-semibold text-primary shadow-sm transition-all duration-normal hover:bg-primary/5 active:scale-95"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
              <span>오늘의 서재</span>
            </button>
          </div>
        </div>
      </div>

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
    <Suspense fallback={<LoadingSpinner />}>
      <ChatPageContent />
    </Suspense>
  );
}
