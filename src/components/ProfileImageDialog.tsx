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
  const [showDialog, setShowDialog] = useState(false);
  const isMountedRef = useRef(true);

  // Track component mount state to prevent race conditions
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 이미지 프리로드 및 모달 표시 타이밍 제어
  useEffect(() => {
    if (open && participant?.profileImage) {
      setImageLoaded(false);
      setShowDialog(false);

      const img = new window.Image();
      img.onload = () => {
        if (isMountedRef.current) {
          setImageLoaded(true);
          // 이미지 로드 완료 후 잠깐 딜레이 후 모달 표시 (부드러운 전환)
          setTimeout(() => {
            setShowDialog(true);
          }, 100);
        }
      };
      img.src = participant.profileImage;
    } else if (!open) {
      setShowDialog(false);
      setImageLoaded(false);
    }
  }, [open, participant?.profileImage]);

  if (!participant) return null;

  return (
    <Dialog open={showDialog} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-[90vw] max-h-[90vh] w-fit h-fit p-0 gap-0 overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.16)]"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">{participant.name} 프로필</DialogTitle>
        <DialogDescription className="sr-only">
          {participant.name}님의 프로필 이미지
        </DialogDescription>
        {participant.profileImage && imageLoaded ? (
          <div className="relative flex items-center justify-center bg-gray-100">
            <Image
              src={participant.profileImage}
              alt={participant.name}
              width={800}
              height={1000}
              className="max-w-[85vw] max-h-[85vh] w-auto h-auto object-contain"
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
