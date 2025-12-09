'use client';

import { AlertCircle, ArrowRight } from 'lucide-react';
import { DATACNTR_COLORS } from '@/constants/datacntr';

interface Alert {
  message: string;
  severity: 'warning' | 'danger' | 'info';
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface AlertPanelProps {
  alerts: Alert[];
}

export default function AlertPanel({ alerts }: AlertPanelProps) {
  if (alerts.length === 0) {
    return null;
  }

  const severityColors = {
    warning: DATACNTR_COLORS.WARNING,
    danger: DATACNTR_COLORS.DANGER,
    info: DATACNTR_COLORS.INFO,
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-xs border border-gray-200">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <AlertCircle className="h-5 w-5 text-orange-600" />
        주의 필요
      </h3>

      <div className="space-y-3">
        {alerts.map((alert, idx) => {
          const colors = severityColors[alert.severity];

          return (
            <div
              key={idx}
              className={`rounded-lg p-4 border ${colors.bg} ${colors.border}`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className={`text-sm font-medium ${colors.text}`}>{alert.message}</p>

                {alert.action && (
                  <button
                    onClick={alert.action.onClick}
                    className={`shrink-0 flex items-center gap-1 text-xs font-semibold ${colors.text} hover:underline`}
                  >
                    {alert.action.label}
                    <ArrowRight className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
