'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Check, MessageSquare, MoreHorizontal, User } from 'lucide-react';
import { getInitials } from '@/lib/utils';
import { useVerifiedToday } from '@/stores/verified-today';
import { useUnreadCount } from '@/hooks/use-messages';
import { getConversationId } from '@/lib/firebase/messages';
import type { Participant } from '@/types/database';
import { getResizedImageUrl } from '@/lib/image-utils';

export interface ParticipantCardProps {
  participant: Participant;
  currentUserId: string;
  isAdmin: boolean;
  showUnreadBadge?: boolean;
  onDMClick?: (participant: Participant) => void;
  onProfileClick: (participant: Participant) => void;
}

/**
 * 참가자 카드 컴포넌트
 *
 * ParticipantsList와 ParticipantsPage에서 공통으로 사용하는 참가자 UI 컴포넌트
 *
 * Features:
 * - 프로필 이미지 및 이니셜 표시
 * - 오늘 독서 인증 완료 배지 (verified badge)
 * - 읽지 않은 DM 개수 배지 (선택적, showUnreadBadge)
 * - 관리자 전용: DM 보내기 / 프로필 보기 드롭다운 메뉴
 * - 일반 사용자: 프로필 보기 버튼
 */
export function ParticipantCard({
  participant,
  currentUserId,
  isAdmin,
  showUnreadBadge = false,
  onDMClick,
  onProfileClick,
}: ParticipantCardProps) {
  const initials = getInitials(participant.name);

  // 오늘 독서 인증 여부
  const { data: verifiedIds } = useVerifiedToday();
  const verified = verifiedIds?.has(participant.id) ?? false;

  // 조건부 unread count 조회 (showUnreadBadge가 true일 때만)
  // 관리자가 볼 때: 참가자 ID로 대화방 조회, 일반 유저가 볼 때: 자신의 ID로 조회
  const conversationId = showUnreadBadge && currentUserId
    ? isAdmin
      ? getConversationId(participant.id)  // 관리자가 볼 때
      : getConversationId(currentUserId)   // 참가자가 볼 때
    : '';
  const { data: unreadCount = 0 } = useUnreadCount(
    conversationId,
    showUnreadBadge && currentUserId ? (isAdmin ? 'admin' : currentUserId) : ''
  );

  // 관리자이면서 자신이 아닌 참가자: 드롭다운 메뉴(별도 버튼)
  if (isAdmin && participant.id !== currentUserId) {
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
                src={getResizedImageUrl(participant.profileImageCircle || participant.profileImage) || participant.profileImageCircle || participant.profileImage}
                alt={participant.name}
              />
              <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>

            {/* 독서 인증 완료 배지 */}
            {verified && (
              <div
                className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center w-5 h-5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full border-2 border-white shadow-md"
                aria-label="오늘 독서 인증 완료"
              >
                <Check className="h-3 w-3 text-white stroke-[3]" />
              </div>
            )}

            {/* 읽지 않은 메시지 배지 */}
            {showUnreadBadge && unreadCount > 0 && (
              <div className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 rounded-full bg-red-500 border-2 border-white">
                <span className="text-xs font-bold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              </div>
            )}
          </div>

          <span className="text-sm font-medium text-foreground">{participant.name}</span>
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
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  // 일반 사용자 또는 자기 자신: 단순 버튼
  return (
    <button
      type="button"
      onClick={() => onProfileClick(participant)}
      className="flex w-full items-center gap-3 rounded-lg p-3 hover:bg-muted transition-colors duration-normal"
    >
      <div className="relative">
        <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
          <AvatarImage
            src={getResizedImageUrl(participant.profileImageCircle || participant.profileImage) || participant.profileImageCircle || participant.profileImage}
            alt={participant.name}
          />
          <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>

        {/* 독서 인증 완료 배지 */}
        {verified && (
          <div
            className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center w-5 h-5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full border-2 border-white shadow-md"
            aria-label="오늘 독서 인증 완료"
          >
            <Check className="h-3 w-3 text-white stroke-[3]" />
          </div>
        )}
      </div>

      <span className="text-sm font-medium text-foreground">{participant.name}</span>
    </button>
  );
}
