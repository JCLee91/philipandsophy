'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PhoneAuthCard from '@/features/auth/components/PhoneAuthCard';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';
import { appRoutes } from '@/lib/navigation';

export default function Home() {
  const router = useRouter();
  const { participant, participantStatus, isLoading } = useAuth();

  // ✅ participant가 ready 상태이면 채팅으로 이동
  useEffect(() => {
    if (!isLoading && participantStatus === 'ready' && participant) {
      logger.info('기존 로그인 감지, 채팅으로 이동', {
        participantId: participant.id,
        cohortId: participant.cohortId,
      });
      router.replace(appRoutes.chat(participant.cohortId));
    }
  }, [isLoading, participantStatus, participant, router]);

  // ✅ 하나의 통합된 로딩 상태
  if (isLoading || (participantStatus === 'ready' && participant)) {
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

      {/* 디버깅용 링크 */}
      <div className="fixed bottom-4 right-4">
        <a
          href="/app/sw-test"
          className="inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg"
        >
          🔧 SW Test
        </a>
      </div>
    </div>
  );
}
