'use client';

import { LANDING_CONSTANTS, TOOLTIP_MESSAGES } from '@/constants/landing';

interface TooltipProps {
  /** 툴팁 메시지 (기본값: 마감된 기수 메시지) */
  message?: string;
}

/**
 * 랜딩페이지 툴팁 컴포넌트
 * CTA 버튼 위에 표시되는 기수 마감 메시지
 */
export default function Tooltip({
  message = TOOLTIP_MESSAGES.CLOSED(LANDING_CONSTANTS.CLOSED_COHORT_NUMBER),
}: TooltipProps) {
  return (
    <div className="tooltip-container">
      <div className="tooltip-box">
        <p className="tooltip-text">{message}</p>
      </div>
      <div className="tooltip-arrow" />
    </div>
  );
}
