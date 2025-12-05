'use client';

import { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { EmptyStateCohortSelect } from '@/components/datacntr/common/EmptyStateCohortSelect';

interface DatacntrPageShellProps {
  /** 페이지 제목 */
  title: string;
  /** 페이지 설명 */
  description?: string;
  /** 페이지 콘텐츠 */
  children: ReactNode;
  /** 헤더 우측 액션 버튼 */
  headerActions?: ReactNode;
  /** 로딩 상태 */
  isLoading?: boolean;
  /** 기수 선택 필수 여부 (true이고 미선택 시 안내 표시) */
  requiresCohort?: boolean;
  /** 기수 선택 여부 (requiresCohort와 함께 사용) */
  hasCohortSelected?: boolean;
}

/**
 * 데이터센터 페이지 공통 레이아웃
 */
export function DatacntrPageShell({
  title,
  description,
  children,
  headerActions,
  isLoading,
  requiresCohort,
  hasCohortSelected,
}: DatacntrPageShellProps) {
  // 로딩 상태
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // 기수 미선택 상태
  if (requiresCohort && !hasCohortSelected) {
    return <EmptyStateCohortSelect title={title} />;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
          {description && <p className="text-gray-600 mt-2">{description}</p>}
        </div>
        {headerActions && <div className="flex gap-3">{headerActions}</div>}
      </div>
      {children}
    </div>
  );
}
