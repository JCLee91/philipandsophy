'use client';

import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface UnifiedButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  variant?: 'primary' | 'secondary' | 'destructive' | 'outline';
  children?: ReactNode;
  fullWidth?: boolean;
  icon?: ReactNode;
  size?: 'default' | 'sm';
  type?: 'button' | 'submit' | 'reset';
  loading?: boolean;
  loadingText?: string;
}

/**
 * 통일된 버튼 컴포넌트
 *
 * 웹앱 전체에서 사용하는 일관된 버튼 스타일을 제공합니다.
 * - Primary (검정): 주요 액션
 * - Secondary (흰색): 보조 액션
 * - Destructive (빨강): 삭제 등 위험한 액션
 * - Outline: 테두리만 있는 버튼
 *
 * @example
 * // Primary 버튼
 * <UnifiedButton onClick={handleClick}>입장하기</UnifiedButton>
 *
 * @example
 * // Destructive 버튼 with 작은 사이즈
 * <UnifiedButton variant="destructive" size="sm">
 *   삭제
 * </UnifiedButton>
 */
export default function UnifiedButton({
  variant = 'primary',
  children,
  fullWidth = false,
  icon,
  size = 'default',
  type = 'button',
  className,
  disabled,
  onClick,
  loading = false,
  loadingText,
  ...props
}: UnifiedButtonProps) {
  const isDisabled = disabled || loading;
  const displayIcon = loading ? <Loader2 className="h-5 w-5 animate-spin" /> : icon;
  const displayText = loading && loadingText ? loadingText : children;
  const hasTextContent = displayText !== undefined && displayText !== null;

  return (
    <button
      type={type}
      disabled={isDisabled}
      onClick={isDisabled ? undefined : onClick}
      className={cn(
        // Base styles
        'rounded-lg font-bold transition-colors',
        // Size styles
        size === 'default' && 'px-4 py-4',
        size === 'sm' && 'px-3 py-2 text-sm',
        // Variant styles
        variant === 'primary' && 'bg-black text-white hover:bg-gray-800 focus-visible:ring-white',
        variant === 'secondary' && 'bg-white border border-gray-200 text-black hover:bg-gray-50 focus-visible:ring-gray-200',
        variant === 'destructive' && 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600',
        variant === 'outline' && 'border-2 border-gray-300 bg-transparent text-gray-700 hover:bg-gray-100 focus-visible:ring-gray-300',
        // Layout
        fullWidth && 'w-full',
        // Icon만 있을 때는 gap 없이 중앙 정렬, 텍스트가 있으면 gap 적용
        (icon || loading) && 'flex items-center justify-center',
        (icon || loading) && hasTextContent && 'gap-2',
        // Text: 줄바꿈 방지
        'whitespace-nowrap',
        // States
        'enabled:active:scale-95',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'focus-visible:ring-2 focus-visible:ring-offset-2',
        // Custom className override
        className
      )}
      {...props}
    >
      {displayIcon}
      {displayText}
    </button>
  );
}
