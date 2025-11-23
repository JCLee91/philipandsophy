'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Image from 'next/image';
import { DirectMessage, Participant } from '@/types/database';
import { formatMessageTime } from '@/lib/message-grouping';
import { APP_CONSTANTS } from '@/constants/app';
import { getFirstName } from '@/lib/utils';
import { getTimestampDate } from '@/lib/firebase/timestamp-utils';
import { getResizedImageUrl } from '@/lib/image-utils';
import { Check, CheckCheck } from 'lucide-react';

interface MessageGroupProps {
  senderId: string;
  messages: DirectMessage[];
  showAvatar: boolean;
  showTimestamp: boolean;
  currentUserId: string;
  currentUser: Participant | null;
  otherUser: Participant;
  onImageClick: (imageUrl: string) => void;
  isFirstGroup?: boolean; // LCP 최적화: 첫 번째 그룹 여부
}

/**
 * 메시지 그룹 컴포넌트
 *
 * 같은 발신자가 5분 이내 연속으로 보낸 메시지들을 하나의 그룹으로 표시
 *
 * Features:
 * - 그룹의 첫 메시지에만 아바타 표시
 * - 그룹의 마지막 메시지에만 시간 표시
 * - 내 메시지는 오른쪽, 상대방 메시지는 왼쪽 정렬
 * - 관리자 팀의 경우 발신자 이름 표시
 */
export default function MessageGroup({
  senderId,
  messages,
  showAvatar,
  showTimestamp,
  currentUserId,
  currentUser,
  otherUser,
  onImageClick,
  isFirstGroup = false,
}: MessageGroupProps) {
  const isMine = senderId === currentUserId;
  const isFromAdminTeam = otherUser.id === 'admin-team';
  const displayName = otherUser.isAdministrator ? APP_CONSTANTS.ADMIN_NAME : getFirstName(otherUser.name);

  // 아바타 이미지 URL
  const avatarSrc = isMine
    ? getResizedImageUrl(currentUser?.profileImageCircle || currentUser?.profileImage) || currentUser?.profileImageCircle || currentUser?.profileImage || '/favicon.webp'
    : isFromAdminTeam
      ? '/favicon.webp'
      : getResizedImageUrl(otherUser.profileImageCircle || otherUser.profileImage) || otherUser.profileImageCircle || otherUser.profileImage;

  const avatarAlt = isMine ? '나' : isFromAdminTeam ? '필립앤소피' : displayName;
  const avatarFallback = isMine ? '나' : isFromAdminTeam ? '필' : displayName[0];

  // 마지막 메시지의 시간
  const lastMessage = messages[messages.length - 1];
  const lastMessageDate = getTimestampDate(lastMessage.createdAt);
  const timestamp = lastMessageDate ? formatMessageTime(lastMessageDate) : '';

  return (
    <div className={`flex gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* 아바타 - 그룹의 첫 메시지에만 표시 */}
      {showAvatar ? (
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={avatarSrc} alt={avatarAlt} />
          <AvatarFallback>{avatarFallback}</AvatarFallback>
        </Avatar>
      ) : (
        <div className="h-8 w-8 shrink-0" /> // 공간 유지용 빈 div
      )}

      {/* 메시지 목록 */}
      <div className={`flex flex-col max-w-[70%] gap-1 ${isMine ? 'items-end' : 'items-start'}`}>
        {/* 관리자 팀의 경우 발신자 이름 표시 (첫 메시지에만) */}
        {isFromAdminTeam && !isMine && showAvatar && (
          <span className="text-xs text-muted-foreground mb-1 px-1">
            {senderId === currentUserId ? '나' : '필립앤소피'}
          </span>
        )}

        {/* 메시지들 */}
        {messages.map((msg) => (
          <div key={msg.id} className="flex items-end gap-1 animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
            {isMine && (
              <span className={`mb-0.5 min-w-[14px] flex justify-center ${msg.isRead ? 'text-blue-500' : 'text-muted-foreground'}`}>
                {msg.isRead ? (
                  <CheckCheck className="h-3 w-3" strokeWidth={2.5} />
                ) : (
                  <Check className="h-3 w-3" strokeWidth={2.5} />
                )}
              </span>
            )}
            <div
              className={`rounded-2xl ${msg.imageUrl ? 'p-2' : 'px-4 py-2'} ${
                isMine
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground'
              }`}
            >
              {/* 이미지 */}
              {msg.imageUrl && (
                <div
                  className="mb-2 relative w-48 h-48 cursor-pointer hover:opacity-90 transition-opacity duration-fast"
                  onClick={() => onImageClick(msg.imageUrl!)}
                >
                  <Image
                    src={getResizedImageUrl(msg.imageUrl) || msg.imageUrl}
                    alt="첨부 이미지"
                    fill
                    sizes="192px"
                    className="object-cover rounded"
                    priority={isFirstGroup && messages[0].id === msg.id}
                  />
                </div>
              )}

              {/* 텍스트 */}
              {msg.content && (
                <p className="text-sm whitespace-pre-wrap break-words">
                  {msg.content}
                </p>
              )}
            </div>
          </div>
        ))}

        {/* 시간 - 그룹의 마지막 메시지에만 표시 */}
        {showTimestamp && (
          <span className="text-xs text-muted-foreground mt-1 px-1">
            {timestamp}
          </span>
        )}
      </div>
    </div>
  );
}
