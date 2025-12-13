'use client';

import { Suspense, use } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ProfileBookContent } from '@/app/app/profile/[participantId]/page';

export default function PartyProfileBookPage({ params }: { params: Promise<{ participantId: string }> }) {
  const resolvedParams = use(params);
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ProfileBookContent params={resolvedParams} />
    </Suspense>
  );
}
