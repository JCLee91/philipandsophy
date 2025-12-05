'use client';

import { Users, type LucideIcon } from 'lucide-react';

interface EmptyStateCohortSelectProps {
  /** 페이지 제목 */
  title: string;
  /** 안내 메시지 (기본: "상단 헤더에서 기수를 선택해야 합니다.") */
  message?: string;
  /** 아이콘 (기본: Users) */
  icon?: LucideIcon;
}

/**
 * 기수 미선택 시 표시되는 안내 컴포넌트
 */
export function EmptyStateCohortSelect({
  title,
  message = '상단 헤더에서 기수를 선택해야 합니다.',
  icon: Icon = Users,
}: EmptyStateCohortSelectProps) {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
      </div>
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
        <Icon className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-gray-900 mb-2">기수를 먼저 선택해주세요</h2>
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  );
}
