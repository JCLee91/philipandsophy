'use client';

import { Circle } from 'lucide-react';

type Status = 'active' | 'moderate' | 'dormant';

interface StatusBadgeProps {
  status: Status;
  label?: string;
}

const statusConfig = {
  active: {
    label: '활성',
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200',
    dot: 'fill-green-600',
  },
  moderate: {
    label: '보통',
    color: 'text-yellow-600',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    dot: 'fill-yellow-600',
  },
  dormant: {
    label: '휴면',
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    dot: 'fill-red-600',
  },
};

export default function StatusBadge({ status, label }: StatusBadgeProps) {
  const config = statusConfig[status];
  const displayLabel = label || config.label;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${config.bg} ${config.border} ${config.color}`}
    >
      <Circle className={`h-2 w-2 ${config.dot}`} />
      {displayLabel}
    </span>
  );
}

/**
 * 참가자 활동 상태 계산
 * @param lastActivityDays - 마지막 활동으로부터 경과 일수
 * @returns Status
 */
export function getParticipantStatus(lastActivityDays: number): Status {
  if (lastActivityDays <= 3) return 'active';
  if (lastActivityDays <= 7) return 'moderate';
  return 'dormant';
}
