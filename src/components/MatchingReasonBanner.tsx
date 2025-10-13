'use client';

import { cn } from '@/lib/utils';
import { Sparkles, Target } from 'lucide-react';
import type { ProfileTheme } from '@/constants/profile-themes';

interface MatchingReasonBannerProps {
  reason: string;
  theme: ProfileTheme;
  className?: string;
}

/**
 * 매칭 이유 배너 컴포넌트
 *
 * AI가 생성한 매칭 이유를 프로필북 상단에 표시합니다.
 * - similar: 비슷한 가치관 (파란색)
 * - opposite: 상반된 가치관 (노란색)
 */
export default function MatchingReasonBanner({ reason, theme, className }: MatchingReasonBannerProps) {
  const isSimilar = theme === 'similar';

  return (
    <div
      className={cn(
        'rounded-2xl p-5 transition-all duration-300',
        isSimilar
          ? 'bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200'
          : 'bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200',
        className
      )}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={cn(
            'flex-shrink-0 mt-0.5 p-2 rounded-full',
            isSimilar ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'
          )}
        >
          {isSimilar ? (
            <Sparkles className="w-4 h-4" />
          ) : (
            <Target className="w-4 h-4" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3
            className={cn(
              'font-bold text-sm mb-1.5',
              isSimilar ? 'text-blue-900' : 'text-amber-900'
            )}
          >
            {isSimilar ? '🤝 비슷한 점' : '🎯 다른 점'}
          </h3>
          <p
            className={cn(
              'text-sm leading-relaxed',
              isSimilar ? 'text-blue-800' : 'text-amber-800'
            )}
          >
            {reason}
          </p>
        </div>
      </div>
    </div>
  );
}
