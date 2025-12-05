'use client';

import { MoreVertical, type LucideIcon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

export interface DropdownMenuItem {
  /** 메뉴 텍스트 */
  label: string;
  /** 아이콘 */
  icon?: LucideIcon;
  /** 클릭 핸들러 */
  onClick: () => void;
  /** 스타일 변형 (destructive=빨간색, warning=주황색) */
  variant?: 'default' | 'destructive' | 'warning';
  /** 비활성화 여부 */
  disabled?: boolean;
  /** 위에 구분선 추가 */
  separator?: boolean;
}

interface DatacntrDropdownMenuProps {
  /** 메뉴 아이템 목록 */
  items: DropdownMenuItem[];
  /** 트리거 아이콘 (기본: MoreVertical) */
  triggerIcon?: LucideIcon;
  /** 드롭다운 정렬 (기본: end) */
  align?: 'start' | 'end';
}

const variantStyles = {
  default: '',
  destructive: 'text-red-600 focus:text-red-700 focus:bg-red-50',
  warning: 'text-amber-600 focus:text-amber-700 focus:bg-amber-50',
};

/**
 * 데이터센터 공통 드롭다운 메뉴
 */
export function DatacntrDropdownMenu({
  items,
  triggerIcon: TriggerIcon = MoreVertical,
  align = 'end',
}: DatacntrDropdownMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <TriggerIcon className="h-4 w-4 text-gray-600" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align}>
        {items.map((item, index) => (
          <div key={index}>
            {item.separator && <DropdownMenuSeparator />}
            <DropdownMenuItem
              onClick={item.onClick}
              disabled={item.disabled}
              className={variantStyles[item.variant ?? 'default']}
            >
              {item.icon && <item.icon className="h-4 w-4 mr-2" />}
              {item.label}
            </DropdownMenuItem>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
