'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * 통일된 하단 액션 버튼 영역 컴포넌트
 *
 * 모든 화면의 하단 버튼 영역에서 일관된 레이아웃을 제공합니다.
 * - px-6: 좌우 여백 24px
 * - app-footer: 상단 16px + Safe Area 하단 여백 (CSS로 통일 관리)
 *
 * @example
 * // 기본 사용 (max-w-md)
 * <FooterActions>
 *   <UnifiedButton fullWidth>확인</UnifiedButton>
 * </FooterActions>
 *
 * @example
 * // 넓은 레이아웃 (max-w-xl)
 * <FooterActions maxWidth="xl">
 *   <UnifiedButton fullWidth>다음</UnifiedButton>
 * </FooterActions>
 *
 * @example
 * // 테두리 없이
 * <FooterActions noBorder>
 *   <UnifiedButton fullWidth>완료</UnifiedButton>
 * </FooterActions>
 */
interface FooterActionsProps {
  children: ReactNode;
  /** 최대 너비: 'md' (448px, 기본값) | 'xl' (576px) */
  maxWidth?: 'md' | 'xl';
  /** 상단 테두리 숨김 */
  noBorder?: boolean;
  /** 추가 className */
  className?: string;
}

const maxWidthClasses = {
  md: 'max-w-md',
  xl: 'max-w-xl',
} as const;

export default function FooterActions({
  children,
  maxWidth = 'md',
  noBorder = false,
  className,
}: FooterActionsProps) {
  return (
    <div className={cn('shrink-0 bg-white', !noBorder && 'border-t', className)}>
      <div className={cn('mx-auto px-6 app-footer', maxWidthClasses[maxWidth])}>
        {children}
      </div>
    </div>
  );
}
