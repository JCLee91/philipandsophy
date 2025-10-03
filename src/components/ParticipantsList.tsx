'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
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
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getInitials } from '@/lib/utils';
import { User, MessageSquare, Check } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { useVerifiedToday } from '@/hooks/use-verified-today';
import { useUnreadCount } from '@/hooks/use-messages';
import { getConversationId } from '@/lib/firebase/messages';

import type { Participant } from '@/types/database';

interface ParticipantsListProps {
  participants: Participant[];
  currentUserId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin?: boolean;
  onDMClick?: (participant: Participant) => void;
}

function ParticipantItem({
  participant,
  currentUserId,
  isAdmin,
  onDMClick,
  onProfileClick,
}: {
  participant: Participant;
  currentUserId: string;
  isAdmin: boolean;
  onDMClick?: (participant: Participant) => void;
  onProfileClick: (participant: Participant) => void;
}) {
  const { data: verifiedIds } = useVerifiedToday();
  const conversationId = getConversationId(currentUserId, participant.id);
  const { data: unreadCount = 0 } = useUnreadCount(conversationId, currentUserId);

  const initials = getInitials(participant.name);

  // 운영자는 드롭다운 메뉴 사용 (DM 옵션 포함)
  if (isAdmin) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex w-full items-center gap-3 rounded-lg p-3 hover:bg-muted transition-colors">
            <div className="relative">
              <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                <AvatarImage
                  src={participant.profileImage}
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
              {participant.name}
            </span>
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
    );
  }

  // 일반 참가자는 클릭하면 바로 프로필 모달 표시
  return (
    <button
      type="button"
      onClick={() => onProfileClick(participant)}
      className="flex w-full items-center gap-3 rounded-lg p-3 hover:bg-muted transition-colors"
    >
      <div className="relative">
        <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
          <AvatarImage
            src={participant.profileImage}
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
        {participant.name}
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
}: ParticipantsListProps) {
  const [selectedParticipant, setSelectedParticipant] =
    useState<Participant | null>(null);
  const { data: verifiedIds } = useVerifiedToday();

  const handleParticipantClick = (participant: Participant) => {
    setSelectedParticipant(participant);
  };

  // 본인을 맨 위로 정렬
  const sortedParticipants = [...participants].sort((a, b) => {
    if (a.id === currentUserId) return -1;
    if (b.id === currentUserId) return 1;
    return 0;
  });

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-80 p-0">
          <SheetHeader className="border-b px-6 py-4">
            <SheetTitle>참가자 목록 ({participants.length})</SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-73px)]">
            <div className="px-4 py-2">
              {sortedParticipants.map((participant) => {
                const isMe = participant.id === currentUserId;
                
                // 본인 프로필
                if (isMe) {
                  const initials = getInitials(participant.name);

                  return (
                    <button
                      key={participant.id}
                      type="button"
                      onClick={() => handleParticipantClick(participant)}
                      className="flex w-full items-center gap-3 rounded-lg p-3 hover:bg-muted transition-colors"
                    >
                      <div className="relative">
                        <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                          <AvatarImage
                            src={participant.profileImage}
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
                          {participant.name}
                        </span>
                        <span className="text-xs text-muted-foreground">(나)</span>
                      </div>
                    </button>
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
                    onProfileClick={handleParticipantClick}
                  />
                );
              })}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* 간단 프로필 모달 */}
      <Dialog
        open={!!selectedParticipant}
        onOpenChange={(open) => !open && setSelectedParticipant(null)}
      >
        <DialogContent
          className="sm:max-w-lg p-0 gap-0 overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.16)]"
          onOpenAutoFocus={(e) => e.preventDefault()}
          aria-describedby="profile-description"
        >
          <DialogTitle className="sr-only">
            {selectedParticipant?.name} 프로필
          </DialogTitle>
          <p id="profile-description" className="sr-only">
            {selectedParticipant?.name}님의 프로필 이미지
          </p>
          {selectedParticipant?.profileImage ? (
            <div className="relative w-full overflow-hidden bg-muted/20">
              <Image
                src={selectedParticipant.profileImage}
                alt={selectedParticipant.name}
                width={0}
                height={0}
                sizes="100vw"
                priority
                className="w-full h-auto max-h-[80vh] object-contain"
              />
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">프로필 이미지가 없습니다</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
