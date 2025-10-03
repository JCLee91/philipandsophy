'use client';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import Image from 'next/image';
import type { Participant } from '@/types/database';

interface ProfileImageDialogProps {
  participant: Participant | null;
  open: boolean;
  onClose: () => void;
}

export default function ProfileImageDialog({
  participant,
  open,
  onClose,
}: ProfileImageDialogProps) {
  if (!participant) return null;

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="sm:max-w-lg p-0 gap-0 overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.16)]"
        onOpenAutoFocus={(e) => e.preventDefault()}
        aria-describedby="profile-description"
      >
        <DialogTitle className="sr-only">{participant.name} 프로필</DialogTitle>
        <p id="profile-description" className="sr-only">
          {participant.name}님의 프로필 이미지
        </p>
        {participant.profileImage ? (
          <div className="relative w-full overflow-hidden">
            <Image
              src={participant.profileImage}
              alt={participant.name}
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
  );
}
