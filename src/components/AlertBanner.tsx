'use client';

import { AlertCircle, Info, AlertTriangle } from 'lucide-react';

interface AlertBannerProps {
  variant?: 'info' | 'warning' | 'error';
  title: string;
  description: string;
}

/**
 * 알림 배너 컴포넌트
 *
 * 다양한 variant 지원 (info, warning, error)
 */
export function AlertBanner({ variant = 'warning', title, description }: AlertBannerProps) {
  const config = {
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: 'text-blue-600',
      text: 'text-blue-900',
      Icon: Info,
    },
    warning: {
      bg: 'bg-destructive/10',
      border: 'border-destructive/20',
      icon: 'text-destructive',
      text: 'text-destructive',
      Icon: AlertCircle,
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: 'text-red-600',
      text: 'text-red-900',
      Icon: AlertTriangle,
    },
  }[variant];

  const { bg, border, icon, text, Icon } = config;

  return (
    <div className={`rounded-lg ${bg} border ${border} p-4 flex items-start gap-3`}>
      <Icon className={`h-5 w-5 ${icon} flex-shrink-0 mt-0.5`} />
      <div className="flex-1">
        <p className={`text-sm font-semibold ${text}`}>{title}</p>
        <p className={`text-sm ${text}/80 mt-1`}>{description}</p>
      </div>
    </div>
  );
}
