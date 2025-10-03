'use client';

import { Suspense } from 'react';
import Header from '@/components/Header';
import ParticipantsList from '@/components/ParticipantsList';
import DirectMessageDialog from '@/components/DirectMessageDialog';
import ReadingSubmissionDialog from '@/components/ReadingSubmissionDialog';
import NoticeItem from '@/components/NoticeItem';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Notice, Participant } from '@/types/database';
import { useCohort } from '@/hooks/use-cohorts';
import { useParticipant, useParticipantsByCohort } from '@/hooks/use-participants';
import { format, isToday, isYesterday } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Paperclip, X, BookOpen } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useEffect, useState, useMemo } from 'react';
import { useNoticesByCohort, useCreateNotice, useUpdateNotice, useToggleNoticePin, useDeleteNotice } from '@/hooks/use-notices';
import { scrollToBottom } from '@/lib/utils';
import { APP_CONSTANTS } from '@/constants/app';
import { Timestamp } from 'firebase/firestore';
import { uploadNoticeImage } from '@/lib/firebase/storage';

function ChatPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cohortId = searchParams.get('cohort');
  const currentUserId = searchParams.get('userId');

  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [writeDialogOpen, setWriteDialogOpen] = useState(false);
  const [newNoticeContent, setNewNoticeContent] = useState('');
  const [noticeImageFile, setNoticeImageFile] = useState<File | null>(null);
  const [noticeImagePreview, setNoticeImagePreview] = useState<string | null>(null);
  const [uploadingNoticeImage, setUploadingNoticeImage] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [editContent, setEditContent] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<Notice | null>(null);
  const [dmDialogOpen, setDmDialogOpen] = useState(false);
  const [dmTarget, setDmTarget] = useState<Participant | null>(null);
  const [submissionDialogOpen, setSubmissionDialogOpen] = useState(false);
  const [collapsedNotices, setCollapsedNotices] = useState<Set<string>>(new Set());

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
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">로딩 중...</p>
      </div>
    );
  }

  if (!cohortId || !currentUserId || !cohort || !currentUser) {
    router.push('/');
    return null;
  }

  const handleWriteNotice = async () => {
    if (!newNoticeContent.trim() || !cohortId) return;

    try {
      setUploadingNoticeImage(true);
      let imageUrl: string | undefined;

      // 이미지가 있으면 업로드
      if (noticeImageFile) {
        imageUrl = await uploadNoticeImage(noticeImageFile, cohortId);
      }

      await createNoticeMutation.mutateAsync({
        cohortId,
        author: APP_CONSTANTS.ADMIN_NAME,
        content: newNoticeContent.trim(),
        imageUrl,
      });

      setNewNoticeContent('');
      setNoticeImageFile(null);
      setNoticeImagePreview(null);
      setWriteDialogOpen(false);
      scrollToBottom();
    } catch (error) {
      console.error('공지 작성 실패:', error);
    } finally {
      setUploadingNoticeImage(false);
    }
  };

  const handleNoticeImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNoticeImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setNoticeImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveNoticeImage = () => {
    setNoticeImageFile(null);
    setNoticeImagePreview(null);
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


  const formatDate = (timestamp: Timestamp) => {
    const date = timestamp.toDate();
    if (isToday(date)) return '오늘';
    if (isYesterday(date)) return '어제';
    return format(date, 'M월 d일', { locale: ko });
  };

  const formatTime = (timestamp: Timestamp) => {
    const date = timestamp.toDate();
    return format(date, 'a h:mm', { locale: ko });
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
      <main className="flex-1 overflow-y-auto bg-background pb-20 relative">
        {/* 고정 공지 영역 - sticky로 스크롤 시 상단 고정 */}
        {pinnedNotices.length > 0 && (
          <div className="sticky top-0 z-40 border-b border-primary/20 shadow-sm">
            {pinnedNotices.map((notice) => (
              <div
                key={notice.id}
                className="group transition-colors bg-primary-light hover:bg-blue-100"
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
                className="group transition-colors hover:bg-muted/50"
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
              onClick={() => setSubmissionDialogOpen(true)}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-95"
            >
              <BookOpen className="h-5 w-5" />
              <span>독서 인증</span>
            </button>

            {/* 오늘의 서재 버튼 */}
            <button
              onClick={() => router.push(`/chat/today-library?cohort=${cohortId}&userId=${currentUserId}`)}
              className="flex items-center justify-center gap-2 rounded-xl border-2 border-primary bg-background px-4 py-3.5 font-semibold text-primary shadow-sm transition-all hover:bg-primary/5 active:scale-95"
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

      {/* 공지 작성 Dialog */}
      <Dialog open={writeDialogOpen} onOpenChange={setWriteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>공지 작성</DialogTitle>
            <DialogDescription>
              참가자들에게 전달할 공지사항을 작성하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              value={newNoticeContent}
              onChange={(e) => setNewNoticeContent(e.target.value)}
              className="min-h-[120px]"
              placeholder="공지 내용을 입력하세요..."
              autoFocus
            />
            
            {/* 이미지 미리보기 */}
            {noticeImagePreview && (
              <div className="relative w-full max-w-sm h-48">
                <Image
                  src={noticeImagePreview}
                  alt="첨부 이미지"
                  fill
                  className="object-contain rounded border"
                />
                <button
                  onClick={handleRemoveNoticeImage}
                  className="absolute top-2 right-2 p-1 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
                >
                  <X className="h-4 w-4 text-white" />
                </button>
              </div>
            )}
          </div>

          <DialogFooter className="gap-3">
            <div className="flex items-center gap-3 flex-1">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleNoticeImageSelect}
                  className="hidden"
                />
                <div className="flex items-center gap-2 px-3 py-2 text-sm border rounded-md hover:bg-muted transition-colors">
                  <Paperclip className="h-4 w-4" />
                  <span>이미지 첨부</span>
                </div>
              </label>
            </div>
            <Button variant="outline" onClick={() => {
              setWriteDialogOpen(false);
              setNoticeImageFile(null);
              setNoticeImagePreview(null);
            }}>
              취소
            </Button>
            <Button 
              onClick={handleWriteNotice} 
              disabled={!newNoticeContent.trim() || uploadingNoticeImage}
            >
              {uploadingNoticeImage ? '업로드 중...' : '작성'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 수정 Dialog */}
      <Dialog open={!!editingNotice} onOpenChange={(open) => !open && setEditingNotice(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>공지 수정</DialogTitle>
            <DialogDescription>
              공지 내용을 수정하세요.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="min-h-[120px]"
            placeholder="공지 내용을 입력하세요..."
          />
          <DialogFooter className="gap-3">
            <Button variant="outline" onClick={() => setEditingNotice(null)}>
              취소
            </Button>
            <Button onClick={handleSaveEdit} disabled={!editContent.trim()}>
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>공지 삭제</DialogTitle>
            <DialogDescription>
              정말로 이 공지를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && handleDeleteNotice(deleteConfirm)}
            >
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">로딩 중...</div>}>
      <ChatPageContent />
    </Suspense>
  );
}
