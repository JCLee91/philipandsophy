'use client';

import ParticipantsList from '@/components/ParticipantsList';
import { SYSTEM_IDS } from '@/constants/app';
import type { Participant } from '@/types/database';

type ChatParticipantsSheetProps = {
  participants: Participant[];
  currentUserId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin: boolean;
  onDMClick: (participant: Participant) => void;
  onProfileClick: (participant: Participant) => void;
  onProfileBookClick: (participant: Participant) => void;
  onImageClick?: (participant: Participant) => void;
  isImageViewerOpen?: boolean;
};

export function ChatParticipantsSheet({
  participants,
  currentUserId,
  open,
  onOpenChange,
  isAdmin,
  onDMClick,
  onProfileClick,
  onProfileBookClick,
  onImageClick,
  isImageViewerOpen,
}: ChatParticipantsSheetProps) {
  return (
    <ParticipantsList
      participants={participants.filter((p) => p.id !== SYSTEM_IDS.ADMIN)}
      currentUserId={currentUserId}
      open={open}
      onOpenChange={onOpenChange}
      isAdmin={isAdmin}
      onDMClick={onDMClick}
      onProfileClick={onProfileClick}
      onProfileBookClick={onProfileBookClick}
      onImageClick={onImageClick}
      isImageViewerOpen={isImageViewerOpen}
    />
  );
}

export default ChatParticipantsSheet;
