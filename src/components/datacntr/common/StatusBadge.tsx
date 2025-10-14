'use client';

import { Circle } from 'lucide-react';
import type { ParticipantStatus as Status } from '@/lib/datacntr/status';

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
