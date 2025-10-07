'use client';

import { format } from 'date-fns';
import Image from 'next/image';
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

export default function HistoryWeekRow({
  days,
  onSubmissionClick,
  bookmarkCompleted,
  bookmarkEmpty,
}: HistoryWeekRowProps) {
  return (
    <div className="grid grid-cols-7 gap-1">
      {days.map((day, index) => {
        const dateDay = format(day.date, 'd');
        return (
          <button
            key={index}
            onClick={() => day.hasSubmission && day.submission && onSubmissionClick(day.submission)}
            disabled={!day.hasSubmission}
            className={`flex flex-col items-center gap-1 transition-all duration-200 ${
              day.hasSubmission
                ? 'cursor-pointer hover:scale-110 active:scale-95'
                : 'cursor-not-allowed opacity-50'
            }`}
          >
            <p className="text-[14px] font-medium leading-[1.4] text-[#31363e] text-center">
              {dateDay}
            </p>
            <div className="w-10 h-10">
              {day.hasSubmission ? (
                <Image
                  src={bookmarkCompleted}
                  alt="완료"
                  width={40}
                  height={40}
                />
              ) : (
                <Image
                  src={bookmarkEmpty}
                  alt="미완료"
                  width={40}
                  height={40}
                />
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
