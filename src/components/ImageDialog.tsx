'use client';

import Image from 'next/image';
import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useModalCleanup } from '@/hooks/use-modal-cleanup';
import { getResizedImageUrl } from '@/lib/image-utils';
import { Z_INDEX } from '@/constants/z-index';

interface ImageDialogProps {
  imageUrl: string | null;
  alt?: string;
  open: boolean;
  onClose: () => void;
}

/**
 * 이미지를 크게 볼 수 있는 다이얼로그 (Lightbox)
 * - Portal을 사용하여 최상위 레이어에 렌더링
 * - 이미지/배경 클릭 시 닫힘
 * - ESC 키/뒤로가기 버튼 지원
 */
export default function ImageDialog({
  imageUrl,
  alt = '이미지',
  open,
  onClose,
}: ImageDialogProps) {
  useModalCleanup(open);

  const [imageLoaded, setImageLoaded] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isMountedRef = useRef(true);
  const wasClosedByBackButton = useRef(false);
  const historyEntryTimestamp = useRef<number>(0);

  // Track component mount state
  useEffect(() => {
    isMountedRef.current = true;
    setMounted(true);
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (open && imageUrl) {
      setImageLoaded(false);
      setShowDialog(false);

      const img = new window.Image();
      img.onload = () => {
        if (isMountedRef.current) {
          setImageLoaded(true);
          // 부드러운 전환을 위한 딜레이
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

  // ESC 키 핸들러
  const handleEscapeKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (showDialog) {
      document.addEventListener('keydown', handleEscapeKey);
      return () => {
        document.removeEventListener('keydown', handleEscapeKey);
      };
    }
  }, [showDialog, handleEscapeKey]);

  // 안드로이드 back button 처리
  useEffect(() => {
    if (!open) {
      wasClosedByBackButton.current = false;
      return;
    }

    historyEntryTimestamp.current = Date.now();
    const historyState = {
      imageDialog: true,
      timestamp: historyEntryTimestamp.current
    };
    window.history.pushState(historyState, '');

    const handlePopState = (event: PopStateEvent) => {
      if (
        event.state?.imageDialog !== true ||
        event.state?.timestamp !== historyEntryTimestamp.current
      ) {
        wasClosedByBackButton.current = true;
        onClose();
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (
        !wasClosedByBackButton.current &&
        window.history.state?.imageDialog === true &&
        window.history.state?.timestamp === historyEntryTimestamp.current
      ) {
        window.history.back();
      }
    };
  }, [open, onClose]);

  if (!imageUrl || !showDialog || !mounted) {
    return null;
  }

  const content = (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/90 backdrop-blur-sm animate-in fade-in-0 duration-normal"
        style={{ zIndex: Z_INDEX.IMAGE_VIEWER_BACKDROP }}
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-hidden="true"
      />

      {/* Image Container */}
      <div
        className="fixed inset-0 flex items-center justify-center p-4 cursor-default pointer-events-auto"
        style={{ zIndex: Z_INDEX.IMAGE_VIEWER_CONTENT }}
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      >
        <h2 className="sr-only">{alt} 확대 보기 (클릭하여 닫기)</h2>

        {imageUrl && imageLoaded ? (
          <Image
            src={getResizedImageUrl(imageUrl) || imageUrl}
            alt={alt}
            width={1024}
            height={1024}
            className="max-w-[95vw] max-h-[95vh] w-auto h-auto object-contain cursor-zoom-out animate-in zoom-in-95 fade-in-0 duration-fast"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          />
        ) : (
          <div className="text-white text-center p-8">
            <p className="text-muted-foreground">이미지를 불러올 수 없습니다</p>
          </div>
        )}
      </div>
    </>
  );

  return createPortal(content, document.body);
}

