'use client';

import { Suspense, use } from 'react';
import { redirect } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ProfileBookContent } from '@/app/app/profile/[participantId]/page';

// ARCHIVED(2025-12): 연말파티 종료 - 다음 시즌에 이 플래그를 false로 변경하면 재활성화
const PARTY_ARCHIVED = true;

export default function PartyProfileBookPage({ params }: { params: Promise<{ participantId: string }> }) {
  // ARCHIVED: 연말파티 종료 시 /party로 리다이렉트
  if (PARTY_ARCHIVED) {
    redirect('/party');
  }

  const resolvedParams = use(params);
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ProfileBookContent params={resolvedParams} />
    </Suspense>
  );
}
