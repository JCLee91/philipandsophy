'use client';

import { cn } from '@/lib/utils';
import {
  AlertCircle,
  Users,
  Clock,
  FileQuestion,
  Inbox,
  Search,
  Loader2,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  /**
   * 제목
   */
  title: string;
  /**
   * 설명 메시지
   */
  description?: string;
  /**
   * 아이콘 타입 또는 커스텀 아이콘
   * - 'error': 에러 (빨간색)
   * - 'warning': 경고 (노란색)
   * - 'users': 사용자 관련
   * - 'clock': 대기/시간 관련
   * - 'inbox': 빈 목록
   * - 'search': 검색 결과 없음
   * - 'loading': 로딩 스피너
   * - LucideIcon: 커스텀 아이콘
   */
  icon?: 'error' | 'warning' | 'users' | 'clock' | 'inbox' | 'search' | 'loading' | LucideIcon;
  /**
   * 액션 버튼들
   */
  actions?: ReactNode;
  /**
   * 스타일 variant
   * - default: 일반 (중앙 정렬, 회색)
   * - card: 카드 스타일 (배경색 있음)
   * - warning: 경고 스타일 (노란색 배경)
   * - error: 에러 스타일 (빨간색 배경)
   */
  variant?: 'default' | 'card' | 'warning' | 'error';
  /**
   * 레이아웃
   * - center: 화면 중앙 (기본값)
   * - inline: 인라인 표시
   * - fullPage: 전체 페이지
   */
  layout?: 'center' | 'inline' | 'fullPage';
  /**
   * 추가 클래스
   */
  className?: string;
}

const iconMap: Record<string, { Icon: LucideIcon; className: string }> = {
  error: { Icon: AlertCircle, className: 'text-red-500' },
  warning: { Icon: AlertCircle, className: 'text-yellow-500' },
  users: { Icon: Users, className: 'text-gray-400' },
  clock: { Icon: Clock, className: 'text-gray-400' },
  inbox: { Icon: Inbox, className: 'text-gray-400' },
  search: { Icon: Search, className: 'text-gray-400' },
  loading: { Icon: Loader2, className: 'text-gray-400 animate-spin' },
};

const variantClasses = {
  default: '',
  card: 'bg-gray-50 border border-gray-200 rounded-lg p-8',
  warning: 'bg-yellow-50 border border-yellow-200 rounded-lg p-8',
  error: 'bg-red-50 border border-red-200 rounded-lg p-8',
};

const layoutClasses = {
  center: 'flex flex-col items-center justify-center text-center',
  inline: 'flex flex-col items-center text-center py-8',
  fullPage: 'app-shell flex flex-col items-center justify-center px-4',
};

/**
 * 통합 빈 상태 컴포넌트
 *
 * 데이터가 없거나, 에러가 발생했거나, 로딩 중일 때 표시합니다.
 *
 * @example
 * // 기본 사용
 * <EmptyState
 *   icon="inbox"
 *   title="데이터가 없습니다"
 *   description="아직 등록된 항목이 없어요."
 * />
 *
 * @example
 * // 에러 상태
 * <EmptyState
 *   icon="error"
 *   title="오류가 발생했어요"
 *   description={error.message}
 *   variant="error"
 *   actions={<UnifiedButton onClick={retry}>다시 시도</UnifiedButton>}
 * />
 *
 * @example
 * // 경고 카드
 * <EmptyState
 *   icon="users"
 *   title="기수를 먼저 선택해주세요"
 *   description="상단 헤더에서 기수를 선택해야 합니다."
 *   variant="warning"
 *   layout="inline"
 * />
 */
export function EmptyState({
  title,
  description,
  icon,
  actions,
  variant = 'default',
  layout = 'center',
  className,
}: EmptyStateProps) {
  // 아이콘 결정
  let IconComponent: LucideIcon | null = null;
  let iconClassName = 'text-gray-400';

  if (icon) {
    if (typeof icon === 'string' && icon in iconMap) {
      const iconInfo = iconMap[icon];
      IconComponent = iconInfo.Icon;
      iconClassName = iconInfo.className;
    } else if (typeof icon === 'function') {
      IconComponent = icon;
    }
  }

  return (
    <div className={cn(layoutClasses[layout], variantClasses[variant], className)}>
      {IconComponent && <IconComponent className={cn('h-12 w-12 mb-4', iconClassName)} />}
      <h2 className="text-lg font-semibold text-gray-900 mb-2">{title}</h2>
      {description && <p className="text-gray-600 text-sm mb-4 max-w-md">{description}</p>}
      {actions && <div className="flex gap-3">{actions}</div>}
    </div>
  );
}

export default EmptyState;
