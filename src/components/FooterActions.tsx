'use client';

import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface FooterActionsProps {
  cohortId: string;
  currentUserId: string;
  isLocked: boolean;
}

export default function FooterActions({
  cohortId,
  currentUserId,
  isLocked,
}: FooterActionsProps) {
  const router = useRouter();

  return (
    <div className="shrink-0 border-t bg-white pb-safe">
      <div className="mx-auto max-w-md px-6 pt-4 pb-8">
        <div className={cn("flex gap-2", isLocked && "grid grid-cols-2")}>
          {isLocked ? (
            <>
              {/* Unauthenticated: 2 Buttons */}
              <button
                type="button"
                onClick={() => router.push(`/app/profile/${currentUserId}?cohort=${cohortId}&userId=${currentUserId}`)}
                className="bg-white border border-gray-200 rounded-lg px-0 py-4 transition-colors hover:bg-gray-50 flex-1"
              >
                <span className="font-bold text-body-base text-center text-black whitespace-nowrap">
                  내 프로필 북 보기
                </span>
              </button>
              <button
                type="button"
                onClick={() => router.push(`/app/chat?cohort=${cohortId}&userId=${currentUserId}`)}
                className="bg-black rounded-lg px-0 py-4 transition-colors hover:bg-gray-800 flex-1"
              >
                <span className="font-bold text-body-base text-center text-white whitespace-nowrap">
                  독서 인증하기
                </span>
              </button>
            </>
          ) : (
            <>
              {/* Authenticated: 1 Button */}
              <button
                type="button"
                onClick={() => router.push(`/app/profile/${currentUserId}?cohort=${cohortId}&userId=${currentUserId}`)}
                className="bg-black rounded-lg px-0 py-4 transition-colors hover:bg-gray-800 flex-1"
              >
                <span className="font-bold text-body-base text-center text-white whitespace-nowrap">
                  내 프로필 북 보기
                </span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
