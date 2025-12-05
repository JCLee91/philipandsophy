'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCohort } from '@/hooks/use-cohorts';
import LoadingSkeleton from '@/components/today-library/common/LoadingSkeleton';
import TodayLibraryV2Content from '@/components/today-library/v2/TodayLibraryV2Content';
import TodayLibraryV3Content from '@/components/today-library/v3/TodayLibraryV3Content';

export const dynamic = 'force-dynamic';

function TodayLibraryContent() {
  const searchParams = useSearchParams();
  const cohortId = searchParams.get('cohort');
  const { data: cohort, isLoading } = useCohort(cohortId || undefined);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!cohort) {
    return null;
  }

  // 매칭 시스템 설정에 따라 분기 처리
  // 기본값은 false (v2.0 레거시)
  const useClusterMatching = cohort.useClusterMatching === true;

  if (useClusterMatching) {
    return <TodayLibraryV3Content />;
  }

  return <TodayLibraryV2Content />;
}

export default function TodayLibraryPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <TodayLibraryContent />
    </Suspense>
  );
}
