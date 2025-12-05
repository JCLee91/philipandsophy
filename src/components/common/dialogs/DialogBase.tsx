'use client';

import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { useModalCleanup } from '@/hooks/use-modal-cleanup';
import { Z_INDEX } from '@/constants/z-index';
import { IconButton } from '../buttons/IconButton';
import type { ReactNode } from 'react';

interface DialogBaseProps {
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
   * 다이얼로그 variant
   * - default: 중앙 모달 (데스크톱/모바일 공통)
   * - fullscreen: 모바일 전체화면, 데스크톱 모달
   * - sheet: 하단 시트 스타일
   */
  variant?: 'default' | 'fullscreen' | 'sheet';
  /**
   * 다이얼로그 크기 (variant='default' 또는 데스크톱에서 적용)
   */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /**
   * 닫기 버튼 표시 여부
   */
  showCloseButton?: boolean;
  /**
   * 백드롭 클릭 시 닫기 허용 여부
   */
  closeOnBackdropClick?: boolean;
  /**
   * 헤더 영역 커스텀 액션 (닫기 버튼 좌측에 표시)
   */
  headerAction?: ReactNode;
  /**
   * 본문 콘텐츠
   */
  children: ReactNode;
  /**
   * 푸터 영역 (버튼 등)
   */
  footer?: ReactNode;
  /**
   * 콘텐츠 영역 추가 클래스
   */
  contentClassName?: string;
  /**
   * 다이얼로그 전체 추가 클래스
   */
  className?: string;
}

const sizeClasses = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-xl',
  full: 'sm:max-w-4xl',
};

/**
 * 통합 다이얼로그 베이스 컴포넌트
 *
 * 프로젝트 전역에서 사용되는 모달/다이얼로그의 공통 기반을 제공합니다.
 * - 통일된 백드롭 스타일
 * - 공통 닫기 버튼
 * - 헤더/본문/푸터 레이아웃
 * - useModalCleanup 내장
 *
 * @example
 * // 기본 사용
 * <DialogBase
 *   open={open}
 *   onOpenChange={setOpen}
 *   title="제목"
 *   description="설명"
 * >
 *   <p>내용</p>
 * </DialogBase>
 *
 * @example
 * // 전체화면 다이얼로그 (모바일)
 * <DialogBase
 *   open={open}
 *   onOpenChange={setOpen}
 *   title="글쓰기"
 *   variant="fullscreen"
 *   footer={<UnifiedButton>저장</UnifiedButton>}
 * >
 *   <textarea />
 * </DialogBase>
 */
export function DialogBase({
  open,
  onOpenChange,
  title,
  description,
  variant = 'default',
  size = 'md',
  showCloseButton = true,
  closeOnBackdropClick = true,
  headerAction,
  children,
  footer,
  contentClassName,
  className,
}: DialogBaseProps) {
  // Radix UI body 스타일 정리
  useModalCleanup(open);

  if (!open) return null;

  const handleBackdropClick = () => {
    if (closeOnBackdropClick) {
      onOpenChange(false);
    }
  };

  const isFullscreen = variant === 'fullscreen';
  const isSheet = variant === 'sheet';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in-0 duration-200"
        style={{ zIndex: Z_INDEX.MODAL_BACKDROP }}
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Dialog Container */}
      <div
        className={cn(
          'fixed bg-background transition-all duration-300',
          // Variant별 위치/크기
          isFullscreen && [
            // 모바일: 전체화면
            'inset-0 w-full h-full',
            // 데스크톱: 중앙 모달
            'sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2',
            'sm:w-full sm:h-auto sm:max-h-[85vh] sm:rounded-xl sm:border sm:shadow-lg',
            sizeClasses[size],
          ],
          isSheet && [
            // 하단 시트
            'inset-x-0 bottom-0 rounded-t-xl border-t shadow-lg',
            'animate-in slide-in-from-bottom duration-300',
          ],
          !isFullscreen && !isSheet && [
            // 기본 중앙 모달
            'inset-x-4 top-1/2 -translate-y-1/2 max-w-md mx-auto',
            'rounded-xl shadow-lg',
          ],
          className
        )}
        style={{ zIndex: Z_INDEX.MODAL_CONTENT }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby={description ? 'dialog-description' : undefined}
      >
        <div
          className={cn(
            'flex flex-col bg-background overflow-hidden',
            isFullscreen ? 'h-full sm:rounded-xl' : 'rounded-xl',
            isSheet && 'rounded-t-xl'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b px-5 py-4 shrink-0">
            <div className="flex-1 min-w-0">
              <h2 id="dialog-title" className="text-lg font-bold truncate">
                {title}
              </h2>
              {description && (
                <p id="dialog-description" className="text-xs text-gray-500 mt-0.5 truncate">
                  {description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {headerAction}
              {showCloseButton && (
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
          <div
            className={cn(
              'flex-1 overflow-y-auto',
              isFullscreen ? 'min-h-0' : 'max-h-[60vh]',
              contentClassName
            )}
          >
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="border-t px-5 py-4 shrink-0 bg-background">
              {footer}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default DialogBase;
