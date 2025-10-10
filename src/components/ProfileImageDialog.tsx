'use client';

import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import type { Participant } from '@/types/database';
import { UI_CONFIG } from '@/constants/migration';

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
  const [imageLoaded, setImageLoaded] = useState(false);
  const isMountedRef = useRef(true);

  // Track component mount state to prevent race conditions
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 모달이 닫힐 때 로딩 상태 초기화
  useEffect(() => {
    if (!open) {
      setImageLoaded(false);
    }
  }, [open]);

  if (!participant) return null;

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="sm:max-w-lg p-0 gap-0 overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.16)] min-h-[60vh] sm:min-h-[70vh]"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">{participant.name} 프로필</DialogTitle>
        <DialogDescription className="sr-only">
          {participant.name}님의 프로필 이미지
        </DialogDescription>
        {participant.profileImage ? (
          <div className="relative w-full h-full overflow-hidden bg-muted/30">
            {/* Shimmer loader - 이미지 로딩 중에 표시 */}
            {!imageLoaded && (
              <div className="absolute inset-0 shimmer" />
            )}

            <Image
              src={participant.profileImage}
              alt={participant.name}
              width={0}
              height={0}
              sizes="100vw"
              priority
              className={`w-full h-auto max-h-[${UI_CONFIG.MODAL_IMAGE_MAX_HEIGHT}vh] object-contain transition-opacity duration-${UI_CONFIG.IMAGE_FADE_DURATION} ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={() => {
                // Only update state if component is still mounted
                if (isMountedRef.current) {
                  setImageLoaded(true);
                }
              }}
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
