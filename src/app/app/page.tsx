'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PhoneAuthCard from '@/features/auth/components/PhoneAuthCard';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';
import { appRoutes } from '@/lib/navigation';

export default function Home() {
  const router = useRouter();
  const { participant, isLoading } = useAuth();

  // ✅ AuthContext에서 이미 participant 조회했으므로 중복 조회 제거
  useEffect(() => {
    if (!isLoading && participant) {
      logger.info('기존 로그인 감지, 채팅으로 이동', {
        participantId: participant.id,
        cohortId: participant.cohortId,
      });
      router.replace(appRoutes.chat(participant.cohortId));
    }
  }, [isLoading, participant, router]);

  // ✅ 하나의 통합된 로딩 상태
  if (isLoading) {
    return (
      <div className="app-shell flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center space-y-4">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="text-gray-600">로그인 확인 중...</p>
        </div>
      </div>
    );
  }

  // ✅ 로그인 필요
  return (
    <div className="app-shell flex items-center justify-center p-4">
      <PhoneAuthCard />
    </div>
  );
}