'use client';

/**
 * 날짜 구분선 컴포넌트
 * 메시지 목록에서 날짜가 바뀔 때 표시되는 구분선
 *
 * 카카오톡, 텔레그램 스타일:
 * — 오늘 —
 * — 어제 —
 * — 2025년 10월 10일 —
 */
export default function DateDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs font-medium text-muted-foreground px-2">
        {label}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}
