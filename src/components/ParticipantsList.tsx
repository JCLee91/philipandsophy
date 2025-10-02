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
import { ExternalLink, User, MessageSquare, Check } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { useVerifiedToday } from '@/hooks/use-verified-today';

import type { Participant } from '@/types/database';

interface ParticipantsListProps {
  participants: Participant[];
  currentUserId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin?: boolean;
  onDMClick?: (participant: Participant) => void;
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
    if (participant.id !== currentUserId) {
      setSelectedParticipant(participant);
    }
  };

  const handleViewMyProfile = (participant: Participant) => {
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
                const initials = participant.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2);

                const isMe = participant.id === currentUserId;

                if (isMe) {
                  return (
                    <DropdownMenu key={participant.id}>
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
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">
                              {participant.name}
                            </span>
                            <span className="text-xs text-muted-foreground">(나)</span>
                          </div>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onClick={() => handleViewMyProfile(participant)}
                        >
                          <User className="mr-2 h-4 w-4" />
                          간단 프로필 보기
                        </DropdownMenuItem>
                        {participant.profileBookUrl && (
                          <DropdownMenuItem asChild>
                            <a
                              href={participant.profileBookUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="mr-2 h-4 w-4" />
                              프로필 북 접속
                            </a>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  );
                }

                // 운영자는 참가자에게 DM 옵션 제공
                if (isAdmin) {
                  return (
                    <DropdownMenu key={participant.id}>
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
                          </div>
                          <span className="text-sm font-medium text-foreground">
                            {participant.name}
                          </span>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onClick={() => onDMClick?.(participant)}
                        >
                          <MessageSquare className="mr-2 h-4 w-4" />
                          DM 보내기
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleParticipantClick(participant)}
                        >
                          <User className="mr-2 h-4 w-4" />
                          간단 프로필 보기
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  );
                }

                // 일반 참가자는 프로필만 보기
                return (
                  <button
                    key={participant.id}
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
                    <span className="text-sm font-medium text-foreground">
                      {participant.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <Dialog
        open={!!selectedParticipant}
        onOpenChange={(open) => !open && setSelectedParticipant(null)}
      >
        <DialogContent 
          className="sm:max-w-lg p-0 gap-0 overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.16)]"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogTitle className="sr-only">
            {selectedParticipant?.name} 프로필
          </DialogTitle>
          {selectedParticipant?.profileImage ? (
            <div className="relative w-full overflow-hidden bg-muted/20">
              <Image
                src={selectedParticipant.profileImage}
                alt={selectedParticipant.name}
                width={0}
                height={0}
                sizes="100vw"
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
