'use client';

import Image from 'next/image';
import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { Participant } from '@/types/database';
import { useModalCleanup } from '@/hooks/use-modal-cleanup';
import { getResizedImageUrl } from '@/lib/image-utils';
import { Z_INDEX } from '@/constants/z-index';

interface ProfileImageDialogProps {
  participant: Participant | null;
  open: boolean;
  onClose: () => void;
}

/**
 * 프로필 이미지를 크게 볼 수 있는 다이얼로그
 * 참가자 리스트에서 프로필 사진 클릭 시 전체 화면으로 표시
 *
 * UX:
 * - 이미지 밖(오버레이) 클릭 시 닫힘
 * - ESC 키로 닫힘
 * - 안드로이드 백 버튼으로 닫힘
 * - 닫기 버튼 없음 (깔끔한 UI)
 */
export default function ProfileImageDialog({
  participant,
  open,
  onClose,
}: ProfileImageDialogProps) {
  useModalCleanup(open);

  const [imageLoaded, setImageLoaded] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isMountedRef = useRef(true);
  const wasClosedByBackButton = useRef(false);
  const historyEntryTimestamp = useRef<number>(0);

  // Track component mount state to prevent race conditions
  useEffect(() => {
    isMountedRef.current = true;
    setMounted(true);
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

  // 빈 participant이거나 닫혀있으면 렌더링하지 않음
  if (!participant || !showDialog || !mounted) {
    return null;
  }

  const content = (
    <>
      {/* Backdrop - Sheet보다 위에 표시 */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-xs animate-in fade-in-0 duration-normal"
        style={{ zIndex: Z_INDEX.IMAGE_VIEWER_BACKDROP }}
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-hidden="true"
      />

      {/* Image Container - 백드롭 위에 표시 */}
      <div
        className="fixed inset-0 flex items-center justify-center p-4 cursor-default pointer-events-auto"
        style={{ zIndex: Z_INDEX.IMAGE_VIEWER_CONTENT }}
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      >
        {/* 접근성을 위한 숨겨진 제목 */}
        <h2 className="sr-only">{participant.name} 프로필 (클릭하여 닫기)</h2>

        {/* 이미지 - 중앙 정렬 */}
        {imageUrl && imageLoaded ? (
          <Image
            src={getResizedImageUrl(imageUrl) || imageUrl}
            alt={participant.name}
            width={1024}
            height={1024}
            className="max-w-[90vw] max-h-[90vh] w-auto h-auto object-contain cursor-zoom-out animate-in zoom-in-95 fade-in-0 duration-fast"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          />
        ) : (
          <div className="text-white text-center p-8">
            <p className="text-muted-foreground">프로필 이미지가 없습니다</p>
          </div>
        )}
      </div>
    </>
  );

  // Portal을 사용해서 body에 직접 렌더링
  // PageTransition(Framer Motion)의 stacking context를 벗어나기 위함
  return createPortal(content, document.body);
}
