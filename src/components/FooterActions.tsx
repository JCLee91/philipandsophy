'use client';

import { ReactNode } from 'react';

/**
 * 통일된 하단 액션 버튼 영역 컴포넌트
 *
 * 모든 화면의 하단 버튼 영역에서 일관된 레이아웃을 제공합니다.
 * - px-6: 좌우 여백 24px
 * - py-4: 상하 여백 16px (동일)
 * - max-w-md: 최대 너비 448px
 */
interface FooterActionsProps {
  children: ReactNode;
}

export default function FooterActions({ children }: FooterActionsProps) {
  return (
    <div className="shrink-0 border-t bg-white pb-safe">
      <div className="mx-auto max-w-md px-6 py-4">
        {children}
      </div>
    </div>
  );
}
