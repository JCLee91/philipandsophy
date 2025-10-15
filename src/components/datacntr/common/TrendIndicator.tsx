'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface TrendIndicatorProps {
  value: number; // 변화율 (퍼센티지)
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function TrendIndicator({ value, showIcon = true, size = 'md' }: TrendIndicatorProps) {
  const isPositive = value > 0;
  const isNegative = value < 0;
  const isNeutral = value === 0;

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  const colorClass = isPositive
    ? 'text-green-600'
    : isNegative
    ? 'text-red-600'
    : 'text-gray-500';

  const Icon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;

  return (
    <span className={`inline-flex items-center gap-1 font-semibold ${colorClass} ${sizeClasses[size]}`}>
      {showIcon && <Icon className={iconSizes[size]} />}
      {isPositive && '+'}
      {value}%
    </span>
  );
}
