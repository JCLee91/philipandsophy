'use client';

import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  /**
   * 로딩 메시지
   * @default "로딩 중..."
   */
  message?: string;
  /**
   * 스피너 크기
   * - sm: 24x24
   * - md: 32x32 (기본값)
   * - lg: 48x48
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * 레이아웃
   * - fullPage: 전체 화면 중앙 (기본값)
   * - inline: 인라인
   * - center: 컨테이너 중앙
   */
  layout?: 'fullPage' | 'inline' | 'center';
  /**
   * 메시지 숨김
   */
  hideMessage?: boolean;
  /**
   * 추가 클래스
   */
  className?: string;
}

const sizeClasses = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
};

const layoutClasses = {
  fullPage: 'app-shell flex items-center justify-center',
  inline: 'inline-flex items-center gap-2',
  center: 'flex items-center justify-center h-full',
};

/**
 * 로딩 스피너 컴포넌트
 *
 * @example
 * // 전체 페이지 로딩
 * <LoadingSpinner message="데이터를 불러오는 중..." />
 *
 * @example
 * // 인라인 로딩
 * <LoadingSpinner layout="inline" size="sm" hideMessage />
 *
 * @example
 * // 컨테이너 중앙
 * <LoadingSpinner layout="center" size="lg" />
 */
export function LoadingSpinner({
  message = '로딩 중...',
  size = 'md',
  layout = 'fullPage',
  hideMessage = false,
  className,
}: LoadingSpinnerProps) {
  const isInline = layout === 'inline';

  return (
    <div
      className={cn(
        layoutClasses[layout],
        'animate-in fade-in duration-normal',
        className
      )}
    >
      <div
        className={cn(
          'flex items-center',
          isInline ? 'flex-row gap-2' : 'flex-col gap-3'
        )}
      >
        <Loader2 className={cn(sizeClasses[size], 'animate-spin text-primary')} />
        {!hideMessage && message && (
          <p className="text-sm text-muted-foreground">{message}</p>
        )}
      </div>
    </div>
  );
}

export default LoadingSpinner;
