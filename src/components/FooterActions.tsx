'use client';

import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import UnifiedButton from '@/components/UnifiedButton';
import { appRoutes } from '@/lib/navigation';

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
              <UnifiedButton
                variant="secondary"
                onClick={() => router.push(appRoutes.profile(currentUserId, cohortId, currentUserId))}
                className="flex-1"
              >
                내 프로필 북 보기
              </UnifiedButton>
              <UnifiedButton
                variant="primary"
                onClick={() => router.push(appRoutes.chat(cohortId, currentUserId))}
                className="flex-1"
              >
                독서 인증하기
              </UnifiedButton>
            </>
          ) : (
            <>
              {/* Authenticated: 1 Button */}
              <UnifiedButton
                variant="primary"
                onClick={() => router.push(appRoutes.profile(currentUserId, cohortId, currentUserId))}
                className="flex-1"
              >
                내 프로필 북 보기
              </UnifiedButton>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
