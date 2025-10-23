'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PhoneAuthCard from '@/features/auth/components/PhoneAuthCard';
import SplashScreen from '@/features/auth/components/SplashScreen';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';
import { appRoutes } from '@/lib/navigation';

export default function Home() {
  const router = useRouter();
  const { participant, participantStatus, isLoading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);

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

  // ✅ 스플래시 화면 표시 (로딩 중이거나 초기 진입 시)
  if (showSplash || isLoading) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  // ✅ 로그인 한 상태면 리다이렉트
  if (participantStatus === 'ready' && participant) {
    return null;
  }

  // ✅ 로그인 필요
  return (
    <div className="app-shell flex items-center justify-center p-4">
      <PhoneAuthCard />
    </div>
  );
}
