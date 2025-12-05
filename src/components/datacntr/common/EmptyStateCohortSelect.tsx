'use client';

import { Users, type LucideIcon } from 'lucide-react';
import { EmptyState } from '@/components/common/states';

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
      <EmptyState
        icon={Icon}
        title="기수를 먼저 선택해주세요"
        description={message}
        variant="warning"
        layout="inline"
      />
    </div>
  );
}
