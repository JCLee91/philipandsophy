'use client';

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { TextCounter } from '@/components/TextCounter';
import { SUBMISSION_VALIDATION } from '@/constants/validation';

interface ReviewSectionProps {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}

/**
 * 감상평 작성 섹션
 *
 * 독서 인증 다이얼로그에서 분리한 재사용 가능한 컴포넌트
 */
export function ReviewSection({ value, onChange, disabled }: ReviewSectionProps) {
  return (
    <div className="space-y-3">
      <Label htmlFor="review" className="text-base font-semibold">
        3. 간단 감상평 <span className="text-destructive">*</span>
      </Label>
      <p className="text-sm text-muted-foreground">
        오늘 읽은 내용에 대한 생각이나 느낀 점을 자유롭게 적어주세요. (40자 이상)
      </p>
      <Textarea
        id="review"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="예: 오늘은 주인공이 중요한 결정을 내리는 장면을 읽었어요. 용기 있는 선택이 인상 깊었습니다..."
        className="min-h-[120px] resize-none"
        disabled={disabled}
      />
      <TextCounter
        current={value.length}
        min={SUBMISSION_VALIDATION.MIN_TEXT_LENGTH}
      />
    </div>
  );
}
