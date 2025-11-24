'use client';

import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import type { Participant } from '@/types/database';
import { UI_CONFIG } from '@/constants/migration';
import { useModalCleanup } from '@/hooks/use-modal-cleanup';
import { getResizedImageUrl } from '@/lib/image-utils';

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
  useModalCleanup(open);

  const [imageLoaded, setImageLoaded] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const isMountedRef = useRef(true);
  const wasClosedByBackButton = useRef(false);
  const historyEntryTimestamp = useRef<number>(0);

  // Track component mount state to prevent race conditions
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 이미지 프리로드 및 모달 표시 타이밍 제어
  // 간단 프로필 보기(프로필 카드)에서는 profileImage가 우선입니다.
  const imageUrl = participant?.profileImage || participant?.faceImage;

  useEffect(() => {
    if (open && imageUrl) {
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
      img.src = imageUrl;
    } else if (!open) {
      setShowDialog(false);
      setImageLoaded(false);
    }
  }, [open, imageUrl]);

  // 안드로이드 back button 처리 (history API 활용)
  useEffect(() => {
    if (!open) {
      wasClosedByBackButton.current = false;
      return;
    }

    // 다이얼로그가 열릴 때 고유한 타임스탬프와 함께 history state 추가
    historyEntryTimestamp.current = Date.now();
    const historyState = {
      profileDialog: true,
      timestamp: historyEntryTimestamp.current
    };
    window.history.pushState(historyState, '');

    // popstate 이벤트 리스너 (back button 감지)
    const handlePopState = (event: PopStateEvent) => {
      // 우리가 추가한 history entry가 pop된 경우에만 처리
      if (
        event.state?.profileDialog !== true ||
        event.state?.timestamp !== historyEntryTimestamp.current
      ) {
        // Back button으로 우리의 history entry가 pop되면 다이얼로그 닫기
        wasClosedByBackButton.current = true;
        onClose();
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);

      // 다이얼로그가 닫힐 때:
      // 1. Back button으로 닫힌 경우: 이미 history가 pop되었으므로 history.back() 호출 안 함
      // 2. ESC/외부클릭으로 닫힌 경우: 추가한 history entry 제거
      if (
        !wasClosedByBackButton.current &&
        window.history.state?.profileDialog === true &&
        window.history.state?.timestamp === historyEntryTimestamp.current
      ) {
        window.history.back();
      }
    };
    // onClose는 부모에서 전달되어 자주 변경될 수 있으므로 의존성에서 제외
    // effect는 open 상태 변경 시에만 실행되어야 함
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!participant) return null;

  return (
    <Dialog open={showDialog} onOpenChange={(open) => {
      if (!open) {
        onClose();
      }
    }}>
      <DialogContent
        hideCloseButton
        className="max-w-[95vw] max-h-[95vh] w-fit h-fit p-0 bg-transparent border-0 shadow-none place-items-center"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => {
          // ESC 키로 ProfileImageDialog만 닫기 (Sheet는 유지)
          e.stopPropagation();
          onClose();
        }}
        onPointerDownOutside={(e) => {
          // 외부 클릭 시 이벤트 전파 방지
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }}
        onInteractOutside={(e) => {
          // 외부 상호작용 시 이벤트 전파 방지
          e.preventDefault();
          e.stopPropagation();
        }}
        onClick={(e) => {
          // 이미지 자체를 클릭한 경우가 아니라면 닫기
          if (e.target === e.currentTarget) {
            e.stopPropagation();
            onClose();
          }
        }}
      >
        <DialogTitle className="sr-only">{participant.name} 프로필 (클릭하여 닫기)</DialogTitle>
        <DialogDescription className="sr-only">
          {participant.name}님의 프로필 이미지
        </DialogDescription>
        {imageUrl && imageLoaded ? (
          <div className="relative max-w-[90vw] max-h-[90vh]" style={{ aspectRatio: 'auto' }}>
            <Image
              src={getResizedImageUrl(imageUrl) || imageUrl}
              alt={participant.name}
              width={1024}
              height={1024}
              className="max-w-[90vw] max-h-[90vh] w-auto h-auto object-contain cursor-zoom-out"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
            />
          </div>
        ) : (
          <div className="text-white text-center p-8">
            <p className="text-muted-foreground">프로필 이미지가 없습니다</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
