'use client';

import { ParticipantCard } from '@/components/ParticipantCard';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { LogOut } from 'lucide-react';
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
  const { logout } = useAuth();

  // 슈퍼 관리자 제외 후 본인을 맨 위로 정렬
  const sortedParticipants = [...participants]
    .filter((p) => !p.isSuperAdmin) // 슈퍼 관리자는 리스트에 표시 안 함
    .sort((a, b) => {
      if (a.id === currentUserId) return -1;
      if (b.id === currentUserId) return 1;
      return 0;
    });

  const handleProfileClick = (participant: Participant) => {
    if (onProfileClick) {
      onProfileClick(participant);
    }
  };

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
          <div className="px-4 pt-2 pb-2 space-y-1">
            {sortedParticipants.map((participant) => {
              const isMe = participant.id === currentUserId;

              return (
                <ParticipantCard
                  key={participant.id}
                  participant={participant}
                  currentUserId={currentUserId}
                  isAdmin={isAdmin}
                  showUnreadBadge={isAdmin} // 관리자만 뱃지 표시
                  onDMClick={onDMClick}
                  onProfileClick={handleProfileClick}
                  onProfileBookClick={onProfileBookClick}
                />
              );
            })}
          </div>
        </div>

        {/* 로그아웃 버튼 - 하단 고정 */}
        <div className="border-t px-4 pt-4 pb-[30px]">
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
