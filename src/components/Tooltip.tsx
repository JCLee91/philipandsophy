'use client';

interface TooltipProps {
  /** 툴팁 메시지 */
  message: string;
}

/**
 * 랜딩페이지 툴팁 컴포넌트
 * CTA 버튼 위에 표시되는 메시지
 */
export default function Tooltip({ message }: TooltipProps) {
  return (
    <div className="tooltip-container">
      <div className="tooltip-box">
        <p className="tooltip-text">{message}</p>
      </div>
      <div className="tooltip-arrow" />
    </div>
  );
}
