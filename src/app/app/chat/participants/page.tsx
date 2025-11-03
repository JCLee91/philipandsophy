'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PageTransition from '@/components/PageTransition';
import BackHeader from '@/components/BackHeader';
import LoadingSpinner from '@/components/LoadingSpinner';
import DirectMessageDialog from '@/components/chat/DM/DirectMessageDialog';
import ProfileImageDialog from '@/components/ProfileImageDialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import UnifiedButton from '@/components/UnifiedButton';
import { Check, MessageSquare, User, BookOpen, LogOut, MoreHorizontal } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useViewMode } from '@/contexts/ViewModeContext';
import { useParticipantsByCohort } from '@/hooks/use-participants';
import { useVerifiedToday } from '@/stores/verified-today';
import { useUnreadCount } from '@/hooks/use-messages';
import { getConversationId } from '@/lib/firebase/messages';
import { appRoutes } from '@/lib/navigation';
import { getInitials, getFirstName } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { SYSTEM_IDS } from '@/constants/app';
import type { Participant } from '@/types/database';

// ✅ Disable static generation - requires runtime data
export const dynamic = 'force-dynamic';

function ParticipantRow({
  participant,
  currentUserId,
  isAdmin,
  verified,
  onDMClick,
  onProfileClick,
  onProfileBookClick,
  cohortId,
  isOpen,
  onOpenChange,
}: {
  participant: Participant;
  currentUserId: string;
  isAdmin: boolean;
  verified: boolean;
  onDMClick?: (participant: Participant) => void;
  onProfileClick: (participant: Participant) => void;
  onProfileBookClick: (participant: Participant) => void;
  cohortId: string | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const initials = getInitials(participant.name);

  // 항상 참가자 ID 기준으로 대화방 조회
  const conversationId = isAdmin
    ? getConversationId(participant.id)  // 관리자가 볼 때: 참가자 ID 사용
    : getConversationId(currentUserId);   // 참가자가 볼 때: 자신의 ID 사용
  const { data: unreadCount = 0 } = useUnreadCount(
    conversationId,
    isAdmin ? 'admin' : currentUserId
  );

  if (isAdmin && participant.id !== currentUserId) {
    return (
      <div className="flex w-full items-center gap-2 rounded-lg p-3">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative">
            <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
              <AvatarImage
                src={participant.profileImageCircle || participant.profileImage}
                alt={participant.name}
              />
              <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            {verified && (
              <div className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center w-5 h-5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full border-2 border-white shadow-md">
                <Check className="h-3 w-3 text-white stroke-[3]" aria-label="오늘 독서 인증 완료" />
              </div>
            )}
            {unreadCount > 0 && (
              <div className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 rounded-full bg-red-500 border-2 border-white">
                <span className="text-xs font-bold text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>
              </div>
            )}
          </div>
          <span className="text-sm font-medium text-foreground">{getFirstName(participant.name)}</span>
        </div>
        <DropdownMenu open={isOpen} onOpenChange={onOpenChange}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-md border border-transparent text-muted-foreground hover:bg-muted active:bg-muted/80"
              aria-label="참가자 옵션"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => onDMClick?.(participant)}>
              <MessageSquare className="mr-2 h-4 w-4" />
              DM 보내기
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onProfileClick(participant)}>
              <User className="mr-2 h-4 w-4" />
              프로필 카드
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onProfileBookClick(participant)}>
              <BookOpen className="mr-2 h-4 w-4" />
              프로필 북
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onProfileClick(participant)}
      className="flex w-full items-center gap-3 rounded-lg p-3 hover:bg-muted transition-colors duration-normal"
    >
      <div className="relative">
        <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
          <AvatarImage
            src={participant.profileImageCircle || participant.profileImage}
            alt={participant.name}
          />
          <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        {verified && (
          <div className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center w-5 h-5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full border-2 border-white shadow-md">
            <Check className="h-3 w-3 text-white stroke-[3]" aria-label="오늘 독서 인증 완료" />
          </div>
        )}
      </div>
      <span className="text-sm font-medium text-foreground">{getFirstName(participant.name)}</span>
    </button>
  );
}

function ParticipantsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cohortId = searchParams.get('cohort');

  const { participant, isLoading: sessionLoading, logout } = useAuth();
  const currentUserId = participant?.id || '';

  // ViewMode 사용: 설정에서 모드를 전환하면 즉시 반영
  const { viewMode } = useViewMode();
  const isAdmin = viewMode === 'admin';

  const { data: participants = [], isLoading: participantsLoading } = useParticipantsByCohort(cohortId || undefined);
  const { data: verifiedIds } = useVerifiedToday();

  const [dmDialogOpen, setDmDialogOpen] = useState(false);
  const [dmTarget, setDmTarget] = useState<Participant | null>(null);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  // 참가자 정렬: admin 계정 + 고스트 제외, 현재 사용자 최상단, 나머지는 원래 순서
  const sortedParticipants = useMemo(() => {
    return [...participants]
      .filter((p) => p.id !== SYSTEM_IDS.ADMIN && !p.isGhost) // admin 계정 + 고스트 제외
      .sort((a, b) => {
        // 현재 사용자를 맨 위로
        if (a.id === currentUserId) return -1;
        if (b.id === currentUserId) return 1;

        // 나머지는 원래 순서 유지
        return 0;
      });
  }, [participants, currentUserId]);

  const handleProfileBookClick = (participant: Participant) => {
    // cohortId는 URL에서 가져오거나, 없으면 참가자의 cohortId 사용
    const targetCohortId = cohortId || participant.cohortId;
    if (!targetCohortId) {

      return;
    }
    router.push(appRoutes.profile(participant.id, targetCohortId));
  };

  const handleDMClick = (participant: Participant) => {
    setDmTarget(participant);
    setDmDialogOpen(true);
  };

  // 무한 리다이렉트 방지: 리다이렉트 플래그 추적
  const hasRedirectedRef = useRef(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (sessionLoading) return;

    // 이미 리다이렉트한 경우 중복 방지
    if (hasRedirectedRef.current) return;

    if (!participant || !cohortId) {
      hasRedirectedRef.current = true;
      setIsRedirecting(true);

      router.replace('/app');
    }
    // router는 Next.js useRouter에서 반환되는 안정적인 객체이므로 의존성 배열에 불필요
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionLoading, participant, cohortId]);

  // 리다이렉트 중에는 빈 화면 (깜빡임 방지)
  if (isRedirecting) {
    return null;
  }

  if (sessionLoading || participantsLoading || !participant || !cohortId) {
    return <LoadingSpinner message="참가자 목록을 불러오는 중입니다" />;
  }

  return (
    <PageTransition>
      <div className="app-shell flex flex-col overflow-hidden bg-background pt-14">
        <BackHeader onBack={() => router.back()} title={`참가자 목록 (${sortedParticipants.length})`} />
        <main className="app-main-content flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-xl flex-col gap-2 px-6 py-4">
            {sortedParticipants.map((participant) => {
              const isMe = participant.id === currentUserId;
              const verified = verifiedIds?.has(participant.id) ?? false;

              if (isMe) {
                const initials = getInitials(participant.name);
                return (
                  <div key={participant.id} className="rounded-lg border bg-white p-3 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                          <AvatarImage
                            src={participant.profileImageCircle || participant.profileImage}
                            alt={participant.name}
                          />
                          <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        {verified && (
                          <div className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center w-5 h-5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full border-2 border-white shadow-md">
                            <Check className="h-3 w-3 text-white stroke-[3]" aria-label="오늘 독서 인증 완료" />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-foreground">{getFirstName(participant.name)}</span>
                        <span className="text-xs text-muted-foreground">(나)</span>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <UnifiedButton variant="outline" onClick={() => setSelectedParticipant(participant)}>
                        간단 프로필 보기
                      </UnifiedButton>
                      <UnifiedButton onClick={() => handleProfileBookClick(participant)}>
                        프로필북 보기
                      </UnifiedButton>
                    </div>
                  </div>
                );
              }

              return (
                <ParticipantRow
                  key={participant.id}
                  participant={participant}
                  currentUserId={currentUserId}
                  isAdmin={isAdmin}
                  verified={verified}
                  onDMClick={handleDMClick}
                  onProfileClick={setSelectedParticipant}
                  onProfileBookClick={handleProfileBookClick}
                  cohortId={cohortId}
                  isOpen={openDropdownId === participant.id}
                  onOpenChange={(open) => setOpenDropdownId(open ? participant.id : null)}
                />
              );
            })}
          </div>
        </main>

        <div className="border-t bg-white">
          <div className="mx-auto flex w-full max-w-xl flex-col gap-2 px-6 pt-4 pb-[60px]">
            <UnifiedButton
              variant="destructive"
              onClick={async () => {
                await logout();
                // Next.js 캐시를 무시하고 완전히 새로 로드
                window.location.href = '/app';
              }}
              icon={<LogOut className="h-5 w-5" />}
            >
              로그아웃
            </UnifiedButton>
          </div>
        </div>

        <DirectMessageDialog
          open={dmDialogOpen}
          onOpenChange={setDmDialogOpen}
          currentUserId={currentUserId}
          currentUser={participant}
          otherUser={dmTarget}
        />

        <ProfileImageDialog
          participant={selectedParticipant}
          open={!!selectedParticipant}
          onClose={() => setSelectedParticipant(null)}
        />
      </div>
    </PageTransition>
  );
}

export default function ParticipantsPage() {
  return (
    <Suspense fallback={<LoadingSpinner message="참가자 목록을 불러오는 중입니다" />}>
      <ParticipantsPageContent />
    </Suspense>
  );
}
