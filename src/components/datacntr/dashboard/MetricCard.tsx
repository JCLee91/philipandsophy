'use client';

import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color?: 'blue' | 'green' | 'orange' | 'purple' | 'pink' | 'gray' | 'indigo' | 'sky';
  isLoading?: boolean;
  subtitle?: string; // 부제목 (예: "회/인")
  trend?: {
    value: number;
    label: string;
  };
}

const colorClasses = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-green-50 text-green-600',
  orange: 'bg-orange-50 text-orange-600',
  purple: 'bg-purple-50 text-purple-600',
  pink: 'bg-pink-50 text-pink-600',
  gray: 'bg-gray-50 text-gray-600',
  indigo: 'bg-indigo-50 text-indigo-600',
  sky: 'bg-sky-50 text-sky-600',
};

export default function MetricCard({
  title,
  value,
  icon: Icon,
  color = 'blue',
  isLoading,
  subtitle,
  trend,
}: MetricCardProps) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-xs border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          {isLoading ? (
            <div className="h-8 w-24 shimmer rounded" />
          ) : (
            <div>
              <div className="flex items-baseline gap-1">
                <p className="text-3xl font-bold text-gray-900">{value}</p>
                {subtitle && (
                  <p className="text-sm text-gray-500">{subtitle}</p>
                )}
              </div>
              {trend && (
                <p className="text-xs text-gray-500 mt-1">
                  <span className="font-medium text-green-600">+{trend.value}</span> {trend.label}
                </p>
              )}
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
