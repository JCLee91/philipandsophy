'use client';

interface TextCounterProps {
  current: number;
  min: number;
}

/**
 * 텍스트 길이 카운터
 *
 * 최소 길이 미달 시 빨간색으로 표시
 */
export function TextCounter({ current, min }: TextCounterProps) {
  const isValid = current >= min;

  return (
    <div className={`text-xs text-right ${isValid ? 'text-muted-foreground' : 'text-destructive'}`}>
      {current}/{min}
    </div>
  );
}
