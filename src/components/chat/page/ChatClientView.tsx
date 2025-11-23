'use client';

import { Suspense, useRef, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { logger } from '@/lib/logger';
import { scrollToBottom } from '@/lib/utils';
import { getSubmissionDate } from '@/lib/date-utils';
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
import { useAdminConversations } from '@/hooks/chat/useAdminConversations';

import { MessageCircle, Send } from 'lucide-react';
import UnifiedButton from '@/components/UnifiedButton';
import ConfirmedCard from '@/features/socializing/components/ConfirmedCard';
import { Input } from '@/components/ui/input';
import { useMeetupChat } from '@/hooks/chat/useMeetupChat';
import MeetupChatTimeline from '@/components/chat/Meetup/MeetupChatTimeline';
import ChatInputBar from '@/components/chat/page/ChatInputBar';

// ... existing imports ...

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

  const { participant, isLoading: sessionLoading, allUserParticipants } = useAuth();
  const currentUserId = participant?.id;

  // 유저가 참가한 모든 코호트 조회 (AuthContext에서 이미 조회한 데이터 활용)
  const [userCohorts, setUserCohorts] = useState<Array<{ cohortId: string; cohortName: string }>>([]);
  useEffect(() => {
    if (!allUserParticipants || allUserParticipants.length === 0) return;

    const fetchCohortNames = async () => {
      try {
        const { getCohortById } = await import('@/lib/firebase');
        const cohortPromises = allUserParticipants
          .filter(p => p && p.cohortId) // null/undefined 필터링
          .map(async (p) => {
            try {
              const cohort = await getCohortById(p.cohortId);
              return {
                cohortId: p.cohortId,
                cohortName: cohort?.name || `${p.cohortId}기`
              };
            } catch (err) {
              logger.error('Failed to fetch cohort', { cohortId: p.cohortId, error: err });
              return {
                cohortId: p.cohortId,
                cohortName: `${p.cohortId}기`
              };
            }
          });

        const cohorts = await Promise.all(cohortPromises);
        setUserCohorts(cohorts.filter(c => c !== null));
      } catch (error) {
        logger.error('Failed to fetch cohort names', error);
        // 에러 시 기본값 설정
        const fallbackCohorts = allUserParticipants
          .filter(p => p && p.cohortId)
          .map(p => ({ cohortId: p.cohortId, cohortName: `${p.cohortId}기` }));
        setUserCohorts(fallbackCohorts);
      }
    };

    fetchCohortNames();
  }, [allUserParticipants]);

  const { writeDialog, editDialog, deleteDialog } = useNoticeDialogs();
  const dmDialog = useDirectMessageDialogState();

  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const isAdminMode = useIsAdminMode(); // ViewMode 전환용 (UI 기능)

  // Admin Inquiry Inbox (Only active in Admin Mode)
  const { data: adminConversations = [] } = useAdminConversations({ enabled: isAdminMode });
  const adminUnreadCount = useMemo(() => {
    return adminConversations.reduce((acc, conv) => acc + (conv.adminUnreadCount || 0), 0);
  }, [adminConversations]);

  const isIosStandalone = useIsIosStandalone();
  const { toast } = useToast();

  const [isNavigating, setIsNavigating] = useState(false);
  const latestNoticeRef = useRef<HTMLDivElement>(null);

  const { data: cohort, isLoading: cohortLoading } = useCohort(cohortId || undefined, {
    initialData: initialCohort ?? undefined,
  });

  // 소셜링 채팅 Hook (isMeetup 상태일 때만 활성화)
  const isMeetupMode = cohort?.socializingPhase === 'confirmed' || cohort?.type === 'meetup';
  const { 
      messages: meetupMessages, 
      sendMessage: sendMeetupMessage, 
      isSending: isMeetupSending 
  } = useMeetupChat(
      isMeetupMode ? cohortId || undefined : undefined, 
      participant || undefined
  );

  // 실제 관리자 권한 (participant.isAdministrator 기반) - 데이터 접근 권한
  const isRealAdmin = participant?.isAdministrator === true || participant?.isSuperAdmin === true;

  const initialParticipantsLoaded = Boolean(initialParticipants && initialParticipants.length > 0);
  const [shouldLoadParticipants, setShouldLoadParticipants] = useState(isAdminMode || initialParticipantsLoaded);
  const {
    data: participants = [],
    isLoading: participantsLoading,
  } = useParticipantsByCohort(cohortId || undefined, {
    initialData: shouldLoadParticipants ? initialParticipants : undefined,
    enabled: !!cohortId && !!participant && shouldLoadParticipants,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (isAdminMode) {
      setShouldLoadParticipants(true);
    }
  }, [isAdminMode]);

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

  // ✅ 페이지 진입 시 notice 타입 알림 제거 (알림센터 정리)
  useEffect(() => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CLEAR_NOTIFICATIONS_BY_TYPE',
        notificationType: 'notice',
      });
    }
  }, []); // 마운트 시 한 번만 실행

  const {
    data: noticesData = [],
    isLoading: noticesLoading,
  } = useNoticesByCohort(cohortId || undefined, {
    initialData: initialNotices,
    enabled: !!cohortId && !!participant,
  });

  const { data: submissions = [] } = useSubmissionsByParticipant(currentUserId);
  // 새벽 2시 마감 정책 적용: getSubmissionDate() 사용
  // 새벽 0-2시에 제출한 것은 어제로 간주되어 "수정하기" 버튼 표시
  const todaySubmissionDate = getSubmissionDate();
  const todaySubmission = submissions.find((sub) => sub.submissionDate === todaySubmissionDate);
  const hasSubmittedToday = !!todaySubmission;
  const todaySubmissionId = todaySubmission?.id;

  // ✅ FIX: 새벽 2시 마감 정책 적용 (getSubmissionDate 사용)
  const currentDay = useMemo(() => {
    if (!cohort?.programStartDate) return null;

    try {
      const programStart = parseISO(cohort.programStartDate);
      const today = parseISO(getSubmissionDate());

      // Invalid Date 체크
      if (isNaN(programStart.getTime()) || isNaN(today.getTime())) {
        logger.error('Invalid date in currentDay calculation', {
          programStartDate: cohort.programStartDate,
          submissionDate: getSubmissionDate(),
        });
        return null;
      }

      return differenceInDays(today, programStart) + 1;
    } catch (error) {
      logger.error('Error calculating currentDay', error);
      return null;
    }
  }, [cohort?.programStartDate]);
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
    async (imageFile: File | null, contentOverride?: string) => {
      if (!cohortId) {
        toast({
          title: '기수 정보가 없습니다.',
          description: '다시 로그인 후 시도해주세요.',
          variant: 'destructive',
        });
        return;
      }

      // Use provided content or dialog content
      const contentToUse = contentOverride ?? writeDialog.content;

      const success = await noticeActions.createNotice({
        cohortId,
        content: contentToUse,
        imageFile,
        // 관리자 모드이면 '필립앤소피', 소셜링 모임이면 내 이름, 그 외에는 기본값(필립앤소피)
        author: isAdminMode 
          ? APP_CONSTANTS.ADMIN_NAME 
          : (cohort?.type === 'meetup' || cohort?.socializingPhase === 'confirmed')
            ? participant?.name 
            : APP_CONSTANTS.ADMIN_NAME,
      });

      if (success) {
        // Only reset dialog if we used it
        if (!contentOverride) {
          writeDialog.resetContent();
          writeDialog.close();
        }
        scrollToBottom(undefined, { behavior: 'smooth', delay: AUTH_TIMING.SCROLL_DELAY });
      }
    },
    [cohortId, noticeActions, toast, writeDialog, isAdminMode, cohort?.type, cohort?.socializingPhase, participant?.name]
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
        onWriteClick={isAdminMode || cohort?.type === 'meetup' || cohort?.socializingPhase === 'confirmed' ? writeDialog.open : undefined}
        onInquiryClick={() => router.push('/app/admin/inquiries')}
        onMessageAdminClick={handleMessageAdmin}
        onSettingsClick={() => setSettingsOpen(true)}
        isAdmin={isAdminMode}
        adminUnreadCount={adminUnreadCount}
        currentCohort={cohort ? { id: cohort.id, name: cohort.name } : null}
      />
      <PageTransition>
        <div className="app-shell flex flex-col overflow-hidden pt-14">

          <ChatParticipantsSheet
            participants={participants}
            currentUserId={currentUserId || ''}
            open={participantsOpen}
            onOpenChange={setParticipantsOpen}
            isAdmin={isAdminMode}
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

          {/* 모임 확정 카드 (채팅방 상단) */}
          {cohort.socializingPhase === 'confirmed' && cohort.socializingResult && (
            <div className="px-4 pt-4">
              <ConfirmedCard result={{ ...cohort.socializingResult, cohortId: cohort.id }} />
            </div>
          )}

          <main className="app-main-content relative flex flex-col-reverse flex-1 overflow-y-auto bg-background pb-6">
            {isMeetupMode ? (
              <div className="flex flex-col justify-end min-h-full">
                 <MeetupChatTimeline messages={meetupMessages} currentUserId={currentUserId} />
              </div>
            ) : (
              <NoticeTimeline
                notices={noticesData}
                isAdmin={isRealAdmin}
                onEdit={handleEditNotice}
                onRequestDelete={deleteDialog.openWithNotice}
                latestNoticeId={latestNoticeId}
                latestNoticeRef={latestNoticeRef}
              />
            )}
          </main>

          {isMeetupMode ? (
            <ChatInputBar
              onSend={async (text) => { await sendMeetupMessage(text); }}
              isLoading={isMeetupSending}
            />
          ) : (
            <ChatFooterSection
              isAdmin={isAdminMode}
              isDay1={isDay1 ?? false}
              isAfterDay14={isAfterDay14}
              hasSubmittedToday={hasSubmittedToday}
              cohortName={cohort?.name}
              onRequestSubmission={handleOpenSubmissionFlow}
              onNavigateMatching={handleNavigateMatching}
              onNavigateTodayLibrary={handleNavigateTodayLibrary}
            />
          )}

          <NoticeWriteDialog
            open={writeDialog.isOpen}
            onOpenChange={(open) => (open ? writeDialog.open() : writeDialog.close())}
            content={writeDialog.content}
            onContentChange={writeDialog.setContent}
            onSubmit={(file) => handleCreateNotice(file)}
            uploading={noticeActions.isUploading}
            isMeetup={cohort?.type === 'meetup' || cohort?.socializingPhase === 'confirmed'}
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

          <SettingsDialog
            isOpen={settingsOpen}
            onClose={() => setSettingsOpen(false)}
            userCohorts={userCohorts}
          />
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
