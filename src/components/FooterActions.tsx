'use client';

import { ReactNode } from 'react';

/**
 * 통일된 하단 액션 버튼 영역 컴포넌트
 *
 * 모든 화면의 하단 버튼 영역에서 일관된 레이아웃을 제공합니다.
 * - px-6: 좌우 여백 24px
 * - py: app-footer 유틸리티가 상단 16px + Safe Area 하단 여백 적용
 * - max-w-md: 최대 너비 448px
 */
interface FooterActionsProps {
  children: ReactNode;
}

export default function FooterActions({ children }: FooterActionsProps) {
  return (
    <div className="shrink-0 border-t">
      <div className="mx-auto max-w-md px-6 app-footer bg-white">
        {children}
      </div>
    </div>
  );
}
