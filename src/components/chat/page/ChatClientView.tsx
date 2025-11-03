'use client';

import { Suspense, useRef, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { logger } from '@/lib/logger';
import { scrollToBottom } from '@/lib/utils';
import { getTodayString } from '@/lib/date-utils';
import { getTimestampMillis } from '@/lib/firebase/timestamp-utils';
import { parseISO, differenceInDays } from 'date-fns';
import { APP_CONSTANTS } from '@/constants/app';
import type { Cohort, Notice, Participant } from '@/types/database';
import { appRoutes } from '@/lib/navigation';
import { AUTH_TIMING } from '@/constants/auth';
import { useCohort } from '@/hooks/use-cohorts';
import { useParticipantsByCohort } from '@/hooks/use-participants';
import { useNoticesByCohort } from '@/hooks/use-notices';
import { useAuth } from '@/contexts/AuthContext';
import { useIsIosStandalone } from '@/hooks/use-standalone-ios';
import { useIsAdminMode } from '@/contexts/ViewModeContext';
import { useSubmissionsByParticipant } from '@/hooks/use-submissions';
import { HeaderSkeleton, NoticeListSkeleton, FooterActionsSkeleton } from '@/components/ChatPageSkeleton';
import Header from '@/components/Header';
import NoticeTimeline from '@/components/chat/Notice/NoticeTimeline';
import PageTransition from '@/components/PageTransition';
import DirectMessageDialog from '@/components/chat/DM/DirectMessageDialog';
import ProfileImageDialog from '@/components/ProfileImageDialog';
import NoticeWriteDialog from '@/components/NoticeWriteDialog';
import NoticeEditDialog from '@/components/NoticeEditDialog';
import NoticeDeleteDialog from '@/components/NoticeDeleteDialog';
import SettingsDialog from '@/components/SettingsDialog';
import { useToast } from '@/hooks/use-toast';
import { useNoticeActions } from '@/hooks/chat/useNoticeActions';
import { useNoticeDialogs } from '@/hooks/chat/useNoticeDialogs';
import { useDirectMessageDialogState } from '@/hooks/chat/useDirectMessageDialogState';
import ChatFooterSection from '@/components/chat/page/ChatFooterSection';
import ChatParticipantsSheet from '@/components/chat/page/ChatParticipantsSheet';

type ChatClientViewProps = {
  initialCohortId?: string | null;
  initialCohort?: Cohort | null;
  initialParticipants?: Participant[];
  initialNotices?: Notice[];
};

export function ChatClientView({
  initialCohortId,
  initialCohort,
  initialParticipants,
  initialNotices,
}: ChatClientViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resolvedCohortId = useMemo(() => {
    const queryValue = searchParams.get('cohort');
    return queryValue ?? initialCohortId ?? null;
  }, [initialCohortId, searchParams]);
  const cohortId = resolvedCohortId;

  const { participant, isLoading: sessionLoading } = useAuth();
  const currentUserId = participant?.id;

  const { writeDialog, editDialog, deleteDialog } = useNoticeDialogs();
  const dmDialog = useDirectMessageDialogState();

  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const isIosStandalone = useIsIosStandalone();
  const { toast } = useToast();

  const [isNavigating, setIsNavigating] = useState(false);
  const latestNoticeRef = useRef<HTMLDivElement>(null);

  const { data: cohort, isLoading: cohortLoading } = useCohort(cohortId || undefined, {
    initialData: initialCohort ?? undefined,
  });
  const isAdmin = useIsAdminMode();

  const initialParticipantsLoaded = Boolean(initialParticipants && initialParticipants.length > 0);
  const [shouldLoadParticipants, setShouldLoadParticipants] = useState(isAdmin || initialParticipantsLoaded);
  const {
    data: participants = [],
    isLoading: participantsLoading,
  } = useParticipantsByCohort(cohortId || undefined, {
    initialData: shouldLoadParticipants ? initialParticipants : undefined,
    enabled: !!cohortId && !!participant && shouldLoadParticipants,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (isAdmin) {
      setShouldLoadParticipants(true);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (initialParticipantsLoaded) {
      setShouldLoadParticipants(true);
    }
  }, [initialParticipantsLoaded]);

  useEffect(() => {
    if (participantsOpen) {
      setShouldLoadParticipants(true);
    }
  }, [participantsOpen]);

  // 제출/수정 완료 후 토스트 표시
  useEffect(() => {
    const successType = searchParams.get('success');
    if (successType) {
      // URL에서 쿼리 파라미터 제거
      router.replace(appRoutes.chat(cohortId!), { scroll: false });

      // 토스트 표시
      if (successType === 'submit') {
        toast({
          title: '독서 인증 완료 ✅',
          description: '오늘의 서재에서 다른 멤버들의 프로필을 확인해보세요!',
        });
      } else if (successType === 'edit') {
        toast({
          title: '독서 인증 수정 완료 ✅',
          description: '수정된 내용이 저장되었습니다.',
        });
      }
    }
  }, [searchParams, router, cohortId, toast]);

  const {
    data: noticesData = [],
    isLoading: noticesLoading,
  } = useNoticesByCohort(cohortId || undefined, {
    initialData: initialNotices,
    enabled: !!cohortId && !!participant,
    refetchOnWindowFocus: false,
  });

  const { data: submissions = [] } = useSubmissionsByParticipant(currentUserId);
  const todaySubmission = submissions.find((sub) => sub.submissionDate === getTodayString());
  const hasSubmittedToday = !!todaySubmission;
  const todaySubmissionId = todaySubmission?.id;

  const currentDay = cohort && cohort.programStartDate
    ? differenceInDays(parseISO(getTodayString()), parseISO(cohort.programStartDate)) + 1
    : null;
  const isDay1 = currentDay === 1;
  const isAfterDay14 = currentDay !== null && currentDay > 14;

  const noticeActions = useNoticeActions();

  const latestNoticeId = useMemo(() => {
    if (noticesData.length === 0) return undefined;
    const latest = noticesData.reduce<{
      id: string;
      timestamp: number;
    } | null>((acc, notice) => {
      const timestamp = getTimestampMillis(notice.createdAt);
      if (!acc || timestamp > acc.timestamp) {
        return { id: notice.id, timestamp };
      }
      return acc;
    }, null);
    return latest?.id;
  }, [noticesData]);

  const handleCreateNotice = useCallback(
    async (imageFile: File | null) => {
      if (!cohortId) {
        toast({
          title: '기수 정보가 없습니다.',
          description: '다시 로그인 후 시도해주세요.',
          variant: 'destructive',
        });
        return;
      }

      const success = await noticeActions.createNotice({
        cohortId,
        content: writeDialog.content,
        imageFile,
      });

      if (success) {
        writeDialog.resetContent();
        writeDialog.close();
        scrollToBottom(undefined, { behavior: 'smooth', delay: AUTH_TIMING.SCROLL_DELAY });
      }
    },
    [cohortId, noticeActions, toast, writeDialog]
  );

  const handleEditNotice = useCallback(
    (notice: Notice) => {
      editDialog.openWithNotice(notice);
    },
    [editDialog]
  );

  const handleSaveEdit = useCallback(async () => {
    if (!editDialog.notice) return;
    const success = await noticeActions.updateNotice({
      noticeId: editDialog.notice.id,
      content: editDialog.content,
    });
    if (success) {
      editDialog.close();
    }
  }, [editDialog, noticeActions]);

  const handleDeleteNotice = useCallback(
    async (notice: Notice) => {
      const success = await noticeActions.deleteNotice(notice.id);
      if (success) {
        deleteDialog.close();
      }
    },
    [deleteDialog, noticeActions]
  );

  useEffect(() => {
    if (!sessionLoading) {
      if (!participant) {
        router.replace('/app');
        return;
      }

      if (!cohortId) {
        router.replace('/app');
        return;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionLoading, participant, cohortId]);

  useEffect(() => {
    if (!noticesLoading && noticesData.length > 0 && latestNoticeRef.current) {
      latestNoticeRef.current.scrollIntoView({
        behavior: 'auto',
        block: 'center',
        inline: 'nearest',
      });

    }
  }, [noticesLoading, noticesData.length]);

  const handleDMClick = useCallback(
    (participant: Participant) => {
      dmDialog.openWithParticipant({ participant });
    },
    [dmDialog]
  );

  const handleMessageAdmin = useCallback(() => {
    const adminTarget: Participant = {
      id: 'admin',
      cohortId: cohortId || '',
      name: APP_CONSTANTS.ADMIN_NAME,
      phoneNumber: '01000000001',
      profileImage: '/favicon.webp',
      isAdministrator: true,
      firebaseUid: null,
      createdAt: new Date() as any,
      updatedAt: new Date() as any,
    };

    dmDialog.openWithAdmin(adminTarget);
  }, [cohortId, dmDialog]);

  const handleProfileBookClick = useCallback(
    (participant: Participant) => {
      if (!cohortId) return;
      router.push(appRoutes.profile(participant.id, cohortId));
    },
    [router, cohortId]
  );

  const handleParticipantsClick = useCallback(() => {
    if (!cohortId) {

      return;
    }

    if (isNavigating) {
      return;
    }

    setShouldLoadParticipants(true);

    if (isIosStandalone) {
      setParticipantsOpen(false);
      setIsNavigating(true);

      requestAnimationFrame(() => {
      router.push(appRoutes.participants(cohortId));
      setTimeout(() => setIsNavigating(false), AUTH_TIMING.NAVIGATION_COOLDOWN);
    });
    return;
  }

  setParticipantsOpen(true);
  }, [cohortId, isIosStandalone, isNavigating, router]);

  const handleNavigateMatching = useCallback(() => {
    if (!cohortId) return;
    router.push(`/app/admin/matching?cohort=${cohortId}`);
  }, [cohortId, router]);

  const handleNavigateTodayLibrary = useCallback(() => {
    if (!cohortId) return;
    router.push(appRoutes.todayLibrary(cohortId));
  }, [cohortId, router]);

  const handleOpenSubmissionFlow = useCallback(() => {
    if (!cohortId) return;

    if (todaySubmissionId) {
      // 수정 모드: Step2로 바로 이동 (이미지 수정 불가)
      const step2Url = `/app/submit/step2?cohort=${cohortId}&edit=${todaySubmissionId}`;
      router.push(step2Url);
    } else {
      // 신규 제출: Step1부터 시작
      const step1Url = appRoutes.submitStep1(cohortId);
      router.push(step1Url);
    }
  }, [cohortId, router, todaySubmissionId]);

  const blockingParticipantsLoading = shouldLoadParticipants && participantsLoading;

  if (sessionLoading || cohortLoading || !participant || !cohort || !cohortId || blockingParticipantsLoading) {
    // ✅ 스켈레톤 대신 null 반환 (SplashScreen이 로딩 표시)
    return null;
  }

  return (
    <>
      <Header
        onParticipantsClick={handleParticipantsClick}
        onWriteClick={writeDialog.open}
        onMessageAdminClick={handleMessageAdmin}
        onSettingsClick={() => setSettingsOpen(true)}
        isAdmin={isAdmin}
      />
      <PageTransition>
        <div className="app-shell flex flex-col overflow-hidden pt-14">

        <ChatParticipantsSheet
          participants={participants}
          currentUserId={currentUserId || ''}
          open={participantsOpen}
          onOpenChange={setParticipantsOpen}
          isAdmin={isAdmin}
          onDMClick={handleDMClick}
          onProfileClick={(participant) => setSelectedParticipant(participant)}
          onProfileBookClick={handleProfileBookClick}
        />

        <DirectMessageDialog
          open={dmDialog.isOpen}
          onOpenChange={dmDialog.setOpen}
          currentUserId={currentUserId || ''}
          currentUser={participant}
          otherUser={dmDialog.target}
        />

        <ProfileImageDialog
          participant={selectedParticipant}
          open={!!selectedParticipant}
          onClose={() => {
            setSelectedParticipant(null);
          }}
        />

        <main className="app-main-content relative flex flex-col-reverse flex-1 overflow-y-auto bg-background pb-6">
          <NoticeTimeline
            notices={noticesData}
            isAdmin={isAdmin}
            onEdit={handleEditNotice}
            onRequestDelete={deleteDialog.openWithNotice}
            latestNoticeId={latestNoticeId}
            latestNoticeRef={latestNoticeRef}
          />
        </main>

        <ChatFooterSection
          isAdmin={isAdmin}
          isDay1={isDay1 ?? false}
          isAfterDay14={isAfterDay14}
          hasSubmittedToday={hasSubmittedToday}
          onRequestSubmission={handleOpenSubmissionFlow}
          onNavigateMatching={handleNavigateMatching}
          onNavigateTodayLibrary={handleNavigateTodayLibrary}
        />

        <NoticeWriteDialog
          open={writeDialog.isOpen}
          onOpenChange={(open) => (open ? writeDialog.open() : writeDialog.close())}
          content={writeDialog.content}
          onContentChange={writeDialog.setContent}
          onSubmit={handleCreateNotice}
          uploading={noticeActions.isUploading}
        />

        <NoticeEditDialog
          open={editDialog.isOpen}
          onOpenChange={(open) => !open && editDialog.close()}
          content={editDialog.content}
          onContentChange={editDialog.setContent}
          onSave={handleSaveEdit}
          saving={noticeActions.isUpdating}
        />

        <NoticeDeleteDialog
          open={deleteDialog.isOpen}
          onOpenChange={(open) => !open && deleteDialog.close()}
          notice={deleteDialog.notice}
          onConfirm={handleDeleteNotice}
          deleting={noticeActions.isDeleting}
        />

        <SettingsDialog isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      </div>
    </PageTransition>
    </>
  );
}

export function ChatClientViewWithSuspense(props: ChatClientViewProps) {
  return (
    <Suspense fallback={<HeaderSkeleton />}>
      <ChatClientView {...props} />
    </Suspense>
  );
}
