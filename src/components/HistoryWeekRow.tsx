'use client';

import { memo } from 'react';
import { format } from 'date-fns';
import type { ReadingSubmission } from '@/types/database';

interface DaySubmission {
  date: Date;
  submission: ReadingSubmission | undefined;
  hasSubmission: boolean;
}

interface HistoryWeekRowProps {
  days: DaySubmission[];
  onSubmissionClick: (submission: ReadingSubmission) => void;
  bookmarkCompleted: string;
  bookmarkEmpty: string;
}

const HistoryWeekRow = memo(function HistoryWeekRow({
  days,
  onSubmissionClick,
  bookmarkCompleted,
  bookmarkEmpty,
}: HistoryWeekRowProps) {
  return (
    <div className="grid grid-cols-7 gap-1">
      {days.map((day, index) => {
        const dateDay = format(day.date, 'd');

        // 공통 콘텐츠
        const content = (
          <>
            <p className="text-[14px] font-medium leading-[1.4] text-[#31363e] text-center">
              {dateDay}
            </p>
            <div className="w-10 h-10">
              {day.hasSubmission ? (
                <img
                  src={bookmarkCompleted}
                  alt="완료"
                  width={40}
                  height={40}
                />
              ) : (
                <img
                  src={bookmarkEmpty}
                  alt="미완료"
                  width={40}
                  height={40}
                />
              )}
            </div>
          </>
        );

        // 인증된 날: button (클릭 가능)
        if (day.hasSubmission && day.submission) {
          return (
            <button
              key={index}
              onClick={() => {
                if (day.submission) {
                  onSubmissionClick(day.submission);
                }
              }}
              className="flex flex-col items-center gap-1 cursor-pointer hover:scale-110 active:scale-95 transition-all duration-200"
            >
              {content}
            </button>
          );
        }

        // 미인증 날: div (클릭 불가, hover 효과 없음)
        return (
          <div
            key={index}
            className="flex flex-col items-center gap-1 opacity-50"
          >
            {content}
          </div>
        );
      })}
    </div>
  );
});

export default HistoryWeekRow;
