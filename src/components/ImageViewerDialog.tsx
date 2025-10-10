'use client';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { X } from 'lucide-react';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';

interface ImageViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
}

/**
 * 이미지를 크게 볼 수 있는 다이얼로그
 * DM에서 작은 이미지 클릭 시 전체 화면으로 표시
 */
export default function ImageViewerDialog({
  open,
  onOpenChange,
  imageUrl,
}: ImageViewerDialogProps) {
  const [imageError, setImageError] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Dialog가 열릴 때마다 에러 상태 리셋 & 포커스 관리
  useEffect(() => {
    if (open) {
      setImageError(false);
      // 닫기 버튼에 자동 포커스
      if (closeButtonRef.current) {
        closeButtonRef.current.focus();
      }
    }
  }, [open, imageUrl]);

  // 빈 URL이면 렌더링하지 않음
  if (!imageUrl || imageUrl.trim() === '') {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton
        className="max-w-[95vw] max-h-[95vh] w-fit h-fit p-0 bg-transparent border-0 shadow-none z-[60] place-items-center"
        onEscapeKeyDown={(e) => {
          // ESC 키로 ImageViewer만 닫기 (DM Dialog는 유지)
          e.stopPropagation();
          onOpenChange(false);
        }}
      >
        {/* 접근성을 위한 숨겨진 제목 */}
        <DialogTitle className="sr-only">이미지 크게 보기</DialogTitle>

        {/* 닫기 버튼 */}
        <button
          ref={closeButtonRef}
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label="이미지 뷰어 닫기"
          className="absolute top-2 right-2 z-[100] p-2 bg-white/90 hover:bg-white rounded-full shadow-md transition-all duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <X className="h-5 w-5 text-foreground" />
        </button>

        {/* 이미지 - 중앙 정렬 */}
        {imageError ? (
          <div className="text-white text-center p-8">
            <p className="text-lg mb-2">이미지를 불러올 수 없습니다</p>
            <p className="text-sm">이미지가 삭제되었거나 네트워크 오류가 발생했습니다</p>
          </div>
        ) : (
          <Image
            src={imageUrl}
            alt="크게 보기"
            width={1000}
            height={1000}
            className="max-w-[90vw] max-h-[90vh] w-auto h-auto object-contain"
            onError={() => setImageError(true)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
