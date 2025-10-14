'use client';

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { TextCounter } from '@/components/TextCounter';
import { SUBMISSION_VALIDATION } from '@/constants/validation';
import type { DailyQuestion } from '@/constants/daily-questions';

interface DailyQuestionSectionProps {
  question: DailyQuestion | null;
  answer: string;
  onAnswerChange: (value: string) => void;
  disabled: boolean;
}

/**
 * 오늘의 질문 섹션
 *
 * 독서 인증 다이얼로그에서 분리한 재사용 가능한 컴포넌트
 */
export function DailyQuestionSection({
  question,
  answer,
  onAnswerChange,
  disabled,
}: DailyQuestionSectionProps) {
  return (
    <div className="space-y-3">
      <Label htmlFor="dailyAnswer" className="text-base font-semibold">
        4. 오늘의 질문 (40자 이상) <span className="text-destructive">*</span>
      </Label>
      <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
        {question && (
          <div className="space-y-1">
            <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary mb-2">
              {question.category}
            </span>
            <p className="text-sm font-medium text-primary">{question.question}</p>
          </div>
        )}
      </div>
      <Textarea
        id="dailyAnswer"
        value={answer}
        onChange={(e) => onAnswerChange(e.target.value)}
        placeholder="질문에 대한 답변을 자유롭게 작성해주세요..."
        className="min-h-[100px] resize-none"
        disabled={disabled}
      />
      <TextCounter
        current={answer.length}
        min={SUBMISSION_VALIDATION.MIN_TEXT_LENGTH}
      />
    </div>
  );
}
