'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { getInitials, getFirstName } from '@/lib/utils';
import { User, MessageSquare, Check, BookOpen, LogOut, MoreHorizontal } from 'lucide-react';
import { useVerifiedToday } from '@/stores/verified-today';
import { useUnreadCount } from '@/hooks/use-messages';
import { getConversationId } from '@/lib/firebase/messages';
import { useAuth } from '@/contexts/AuthContext';
import { useModalCleanup } from '@/hooks/use-modal-cleanup';
import { useRouter } from 'next/navigation';

import type { Participant } from '@/types/database';

interface ParticipantsListProps {
  participants: Participant[];
  currentUserId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin?: boolean;
  onDMClick?: (participant: Participant) => void;
  onProfileClick?: (participant: Participant) => void;
  onProfileBookClick?: (participant: Participant) => void;
}

function ParticipantItem({
  participant,
  currentUserId,
  isAdmin,
  onDMClick,
  onProfileClick,
  onProfileBookClick,
}: {
  participant: Participant;
  currentUserId: string;
  isAdmin: boolean;
  onDMClick?: (participant: Participant) => void;
  onProfileClick: (participant: Participant) => void;
  onProfileBookClick?: (participant: Participant) => void;
}) {
  const { data: verifiedIds } = useVerifiedToday();

  // 항상 참가자 ID 기준으로 대화방 조회
  const conversationId = isAdmin
    ? getConversationId(participant.id)  // 관리자가 볼 때: 참가자 ID 사용
    : getConversationId(currentUserId);   // 참가자가 볼 때: 자신의 ID 사용

  const { data: unreadCount = 0 } = useUnreadCount(
    conversationId,
    isAdmin ? 'admin' : currentUserId
  );

  const initials = getInitials(participant.name);

  // 운영자는 드롭다운 메뉴 사용 (DM 옵션 포함)
  if (isAdmin) {
    return (
      <div className="flex w-full items-center gap-2 rounded-lg p-3 hover:bg-muted transition-colors duration-normal">
        <button
          type="button"
          onClick={() => onProfileClick(participant)}
          className="flex flex-1 items-center gap-3 text-left"
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
            {verifiedIds?.has(participant.id) && (
              <div className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center w-5 h-5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full border-2 border-white shadow-md">
                <Check
                  className="h-3 w-3 text-white stroke-[3]"
                  aria-label="오늘 독서 인증 완료"
                />
              </div>
            )}
            {unreadCount > 0 && (
              <div className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 rounded-full bg-red-500 border-2 border-white">
                <span className="text-xs font-bold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              </div>
            )}
          </div>
          <span className="text-sm font-medium text-foreground">
            {getFirstName(participant.name)}
          </span>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-md border border-transparent text-muted-foreground hover:bg-muted"
              aria-label="참가자 옵션"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => onDMClick?.(participant)}>
              <MessageSquare className="mr-2 h-4 w-4" />
              DM 보내기
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onProfileClick(participant)}>
              <User className="mr-2 h-4 w-4" />
              프로필 보기
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onProfileBookClick?.(participant)}>
              <BookOpen className="mr-2 h-4 w-4" />
              프로필북 보기
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  // 일반 참가자는 클릭하면 바로 프로필 모달 표시
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
        {verifiedIds?.has(participant.id) && (
          <div className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center w-5 h-5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full border-2 border-white shadow-md">
            <Check
              className="h-3 w-3 text-white stroke-[3]"
              aria-label="오늘 독서 인증 완료"
            />
          </div>
        )}
      </div>
      <span className="text-sm font-medium text-foreground">
        {getFirstName(participant.name)}
      </span>
    </button>
  );
}

export default function ParticipantsList({
  participants,
  currentUserId,
  open,
  onOpenChange,
  isAdmin = false,
  onDMClick,
  onProfileClick,
  onProfileBookClick,
}: ParticipantsListProps) {
  useModalCleanup(open);

  const router = useRouter();
  const { data: verifiedIds } = useVerifiedToday();
  const { logout, participant } = useAuth();

  // 슈퍼 관리자 제외 후 본인을 맨 위로 정렬
  const sortedParticipants = [...participants]
    .filter((p) => !p.isSuperAdmin) // 슈퍼 관리자는 리스트에 표시 안 함
    .sort((a, b) => {
      if (a.id === currentUserId) return -1;
      if (b.id === currentUserId) return 1;
      return 0;
    });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-80 p-0 flex flex-col">
          <SheetHeader className="border-b px-6 py-4">
            <SheetTitle>참가자 목록 ({sortedParticipants.length})</SheetTitle>
            <SheetDescription className="sr-only">
              프로그램에 참여 중인 멤버 목록을 확인하고 소통할 수 있습니다
            </SheetDescription>
          </SheetHeader>

          {/* 네이티브 스크롤 사용 - PWA/모바일 호환성 최적화 */}
          <div className="flex-1 min-h-0 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
            <div className="px-4 py-2">
              {sortedParticipants.map((participant) => {
                const isMe = participant.id === currentUserId;

                // 본인 프로필
                if (isMe) {
                  const initials = getInitials(participant.name);

                  return (
                    <DropdownMenu key={participant.id}>
                      <DropdownMenuTrigger asChild>
                        <button className="flex w-full items-center gap-3 rounded-lg p-3 hover:bg-muted transition-colors duration-normal">
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
                            {verifiedIds?.has(participant.id) && (
                              <div className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center w-5 h-5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full border-2 border-white shadow-md">
                                <Check
                                  className="h-3 w-3 text-white stroke-[3]"
                                  aria-label="오늘 독서 인증 완료"
                                />
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">
                              {getFirstName(participant.name)}
                            </span>
                            <span className="text-xs text-muted-foreground">(나)</span>
                          </div>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => onProfileClick?.(participant)}>
                          <User className="mr-2 h-4 w-4" />
                          간단 프로필 보기
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          // cohortId는 participant에서 가져옴
                          const cohortId = participant.cohortId;
                          if (cohortId && onProfileBookClick) {
                            onProfileBookClick(participant);
                          }
                        }}>
                          <BookOpen className="mr-2 h-4 w-4" />
                          프로필북 보기
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  );
                }

                // 다른 참가자
                return (
                  <ParticipantItem
                    key={participant.id}
                    participant={participant}
                    currentUserId={currentUserId}
                    isAdmin={isAdmin}
                    onDMClick={onDMClick}
                    onProfileClick={(p) => onProfileClick?.(p)}
                    onProfileBookClick={onProfileBookClick}
                  />
                );
              })}
            </div>
          </div>

          {/* 로그아웃 버튼 - 하단 고정 */}
          <div className="border-t px-4 pt-4 pb-[60px]">
            <button
              type="button"
              onClick={async () => {
                await logout();
                // Next.js 캐시를 무시하고 완전히 새로 로드
                window.location.href = '/app';
              }}
              className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 font-medium text-destructive hover:bg-destructive/10 transition-colors duration-normal"
            >
              <LogOut className="h-5 w-5" />
              로그아웃
            </button>
          </div>
        </SheetContent>
      </Sheet>
  );
}
