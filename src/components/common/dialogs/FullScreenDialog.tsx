'use client';

import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { useModalCleanup } from '@/hooks/use-modal-cleanup';
import { useKeyboardHeight } from '@/hooks/use-keyboard-height';
import { Z_INDEX } from '@/constants/z-index';
import { IconButton } from '../buttons/IconButton';
import type { ReactNode } from 'react';

interface FullScreenDialogProps {
  /**
   * 다이얼로그 열림 상태
   */
  open: boolean;
  /**
   * 열림 상태 변경 핸들러
   */
  onOpenChange: (open: boolean) => void;
  /**
   * 다이얼로그 제목
   */
  title: string;
  /**
   * 다이얼로그 설명 (선택)
   */
  description?: string;
  /**
   * 닫기 버튼 표시 여부
   * @default true
   */
  showCloseButton?: boolean;
  /**
   * 헤더 좌측 액션 (닫기 버튼 대신 표시)
   */
  headerLeftAction?: ReactNode;
  /**
   * 헤더 우측 액션
   */
  headerRightAction?: ReactNode;
  /**
   * 본문 콘텐츠
   */
  children: ReactNode;
  /**
   * 푸터 영역 (버튼 등)
   * - 키보드가 열려있을 때 safe-area 제외
   * - 키보드가 닫혀있을 때 safe-area 포함
   */
  footer?: ReactNode;
  /**
   * 콘텐츠 영역 추가 클래스
   */
  contentClassName?: string;
  /**
   * 푸터 영역 추가 클래스
   */
  footerClassName?: string;
  /**
   * 데스크톱에서 모달 크기
   * @default 'lg'
   */
  desktopSize?: 'sm' | 'md' | 'lg' | 'xl';
  /**
   * 데스크톱에서 모달 높이
   * @default '600px'
   */
  desktopHeight?: string;
}

const sizeClasses = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-xl',
};

/**
 * 전체화면 다이얼로그 컴포넌트
 *
 * 모바일에서는 전체화면으로, 데스크톱에서는 중앙 모달로 표시됩니다.
 * 키보드 높이 대응이 내장되어 있어 입력 폼에 적합합니다.
 *
 * @example
 * <FullScreenDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   title="글쓰기"
 *   description="새 글을 작성합니다"
 *   footer={
 *     <UnifiedButton onClick={handleSubmit} fullWidth>
 *       작성 완료
 *     </UnifiedButton>
 *   }
 * >
 *   <Textarea placeholder="내용을 입력하세요" />
 * </FullScreenDialog>
 */
export function FullScreenDialog({
  open,
  onOpenChange,
  title,
  description,
  showCloseButton = true,
  headerLeftAction,
  headerRightAction,
  children,
  footer,
  contentClassName,
  footerClassName,
  desktopSize = 'lg',
  desktopHeight = '600px',
}: FullScreenDialogProps) {
  const keyboardHeight = useKeyboardHeight();
  const isKeyboardOpen = keyboardHeight > 0;

  // Radix UI body 스타일 정리
  useModalCleanup(open);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in-0 duration-200"
        style={{ zIndex: Z_INDEX.DM_DIALOG }}
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        className={cn(
          'fixed bg-background transition-all duration-300',
          // 모바일: 전체화면
          'inset-0 w-full h-full',
          // 데스크톱: 중앙 모달
          'sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2',
          'sm:w-full sm:rounded-xl sm:border sm:shadow-lg',
          sizeClasses[desktopSize]
        )}
        style={{
          zIndex: Z_INDEX.MODAL_CONTENT,
          // 모바일 키보드 대응
          ...(isKeyboardOpen && typeof window !== 'undefined' && window.innerWidth < 640
            ? { height: `calc(100vh - ${keyboardHeight}px)`, top: 0 }
            : {}),
          // 데스크톱 고정 높이
          ...(typeof window !== 'undefined' && window.innerWidth >= 640
            ? { height: desktopHeight }
            : {}),
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="fullscreen-dialog-title"
        aria-describedby={description ? 'fullscreen-dialog-description' : undefined}
      >
        <div className="flex flex-col h-full w-full bg-background sm:rounded-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-5 py-4 shrink-0">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {headerLeftAction}
              <div className="flex-1 min-w-0">
                <h2 id="fullscreen-dialog-title" className="text-lg font-bold truncate">
                  {title}
                </h2>
                {description && (
                  <p
                    id="fullscreen-dialog-description"
                    className="text-xs text-gray-500 truncate"
                  >
                    {description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {headerRightAction}
              {showCloseButton && !headerLeftAction && (
                <IconButton
                  icon={<X className="h-6 w-6" />}
                  aria-label="닫기"
                  onClick={() => onOpenChange(false)}
                  className="text-gray-400 hover:text-gray-600 -mr-2"
                />
              )}
            </div>
          </div>

          {/* Content */}
          <div className={cn('flex-1 overflow-y-auto', contentClassName)}>{children}</div>

          {/* Footer */}
          {footer && (
            <div
              className={cn(
                'border-t bg-background shrink-0',
                // 키보드가 닫혀있을 때만 safe-area 적용
                !isKeyboardOpen && 'pb-[env(safe-area-inset-bottom)]',
                footerClassName
              )}
            >
              {footer}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default FullScreenDialog;
