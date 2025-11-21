'use client';

import { useRouter } from 'next/navigation';
import UnifiedButton from '@/components/UnifiedButton';
import FooterActions from '@/components/FooterActions';
import { appRoutes } from '@/lib/navigation';

interface TodayLibraryFooterProps {
  viewerHasSubmittedToday: boolean;
  cohortId: string;
}

export default function TodayLibraryFooter({
  viewerHasSubmittedToday,
  cohortId,
}: TodayLibraryFooterProps) {
  const router = useRouter();

  if (viewerHasSubmittedToday) {
    return null;
  }

  return (
    <FooterActions>
      <div className="grid grid-cols-2 gap-2">
        <UnifiedButton
          variant="primary"
          fullWidth
          className="col-span-2"
          onClick={() => router.push(appRoutes.submitStep1(cohortId))}
        >
          독서 인증하기
        </UnifiedButton>
      </div>
    </FooterActions>
  );
}

