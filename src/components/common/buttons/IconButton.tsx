'use client';

import { cn } from '@/lib/utils';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /**
   * 버튼 내부에 표시할 아이콘
   */
  icon: ReactNode;
  /**
   * 버튼 크기
   * - sm: 36x36 (h-9 w-9)
   * - md: 44x44 (h-11 w-11) - 기본값
   * - lg: 48x48 (h-12 w-12)
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * 버튼 스타일 variant
   * - ghost: 투명 배경, 호버 시 배경 (기본값)
   * - outline: 테두리 있는 스타일
   */
  variant?: 'ghost' | 'outline';
  /**
   * 알림 배지
   * - number: 숫자 표시 (99 초과 시 99+)
   * - true: 빨간 점만 표시
   * - false/undefined: 배지 없음
   */
  badge?: number | boolean;
  /**
   * 접근성을 위한 라벨 (필수)
   */
  'aria-label': string;
}

const sizeClasses = {
  sm: 'h-9 w-9',
  md: 'h-11 w-11',
  lg: 'h-12 w-12',
};

const variantClasses = {
  ghost: 'hover:bg-muted active:bg-muted/80',
  outline: 'border border-gray-200 hover:bg-gray-50 active:bg-gray-100',
};

/**
 * 통합 아이콘 버튼 컴포넌트
 *
 * 헤더, 다이얼로그 닫기 버튼, 액션 버튼 등에 사용되는
 * 아이콘만 있는 버튼의 공통 스타일을 제공합니다.
 *
 * @example
 * // 기본 사용
 * <IconButton icon={<X className="h-6 w-6" />} aria-label="닫기" onClick={onClose} />
 *
 * @example
 * // 배지 포함
 * <IconButton
 *   icon={<Mail className="h-5 w-5" />}
 *   badge={unreadCount}
 *   aria-label="메시지"
 *   onClick={onMessageClick}
 * />
 */
export function IconButton({
  icon,
  size = 'md',
  variant = 'ghost',
  badge,
  className,
  disabled,
  ...props
}: IconButtonProps) {
  const showBadge = badge === true || (typeof badge === 'number' && badge > 0);
  const badgeText = typeof badge === 'number' ? (badge > 99 ? '99+' : String(badge)) : null;

  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        // Base styles
        'relative flex items-center justify-center rounded-lg transition-colors duration-150',
        // Size
        sizeClasses[size],
        // Variant
        variantClasses[variant],
        // Disabled
        disabled && 'opacity-50 cursor-not-allowed',
        // Custom
        className
      )}
      {...props}
    >
      {icon}

      {/* Badge */}
      {showBadge && (
        <span
          className={cn(
            'absolute flex items-center justify-center rounded-full bg-red-500 text-white font-bold',
            badgeText
              ? '-top-1 -right-1 h-5 min-w-5 px-1 text-xs'
              : 'top-0 right-0 h-2.5 w-2.5'
          )}
        >
          {badgeText}
        </span>
      )}
    </button>
  );
}

export default IconButton;
