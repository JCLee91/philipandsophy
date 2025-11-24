'use client';

import Image from 'next/image';
import { useState, useEffect, useCallback } from 'react';
import { useModalCleanup } from '@/hooks/use-modal-cleanup';
import { Z_INDEX } from '@/constants/z-index';
import { getOriginalImageUrl } from '@/lib/image-utils';

interface ImageViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
}

/**
 * 이미지를 크게 볼 수 있는 다이얼로그
 * DM에서 작은 이미지 클릭 시 전체 화면으로 표시
 *
 * UX:
 * - 이미지 밖(오버레이) 클릭 시 닫힘
 * - ESC 키로 닫힘
 * - 닫기 버튼 없음 (깔끔한 UI)
 */
export default function ImageViewerDialog({
  open,
  onOpenChange,
  imageUrl,
}: ImageViewerDialogProps) {
  useModalCleanup(open);

  const [imageError, setImageError] = useState(false);

  // Dialog가 열릴 때마다 에러 상태 리셋
  useEffect(() => {
    if (open) {
      setImageError(false);
    }
  }, [open, imageUrl]);

  // ESC 키 핸들러
  const handleEscapeKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onOpenChange(false);
    }
  }, [onOpenChange]);

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleEscapeKey);
      return () => {
        document.removeEventListener('keydown', handleEscapeKey);
      };
    }
  }, [open, handleEscapeKey]);

  // 빈 URL이거나 닫혀있으면 렌더링하지 않음
  if (!open || !imageUrl || imageUrl.trim() === '') {
    return null;
  }

  return (
    <>
      {/* Backdrop - DM 다이얼로그보다 위에 표시 */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in-0 duration-normal"
        style={{ zIndex: Z_INDEX.IMAGE_VIEWER_BACKDROP }}
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />

      {/* Image Container - 백드롭 위에 표시 */}
      <div
        className="fixed inset-0 flex items-center justify-center p-4"
        style={{ zIndex: Z_INDEX.IMAGE_VIEWER_CONTENT }}
        onClick={() => onOpenChange(false)}
      >
        {/* 접근성을 위한 숨겨진 제목 */}
        <h2 className="sr-only">이미지 크게 보기 (클릭하여 닫기)</h2>

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
            className="max-w-[90vw] max-h-[90vh] w-auto h-auto object-contain cursor-zoom-out animate-in zoom-in-95 fade-in-0 duration-fast"
            onError={() => setImageError(true)}
            onClick={(e) => {
              e.stopPropagation();
              onOpenChange(false);
            }}
          />
        )}
      </div>
    </>
  );
}
