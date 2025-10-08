'use client';

export default function Tooltip() {
  return (
    <div className="tooltip-container">
      <div className="tooltip-box">
        <p className="tooltip-text">10월 멤버십은 마감됐어요</p>
      </div>
      <div className="tooltip-arrow">
        <img src="/image/tooltip-arrow.svg" alt="" />
      </div>
    </div>
  );
}
