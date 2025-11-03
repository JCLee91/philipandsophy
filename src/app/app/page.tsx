'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PhoneAuthCard from '@/features/auth/components/PhoneAuthCard';
import SplashScreen from '@/features/auth/components/SplashScreen';
import { useAuth } from '@/contexts/AuthContext';
import { appRoutes } from '@/lib/navigation';
import { useActiveCohorts } from '@/hooks/use-cohorts';

export const dynamic = 'force-dynamic';

const MAX_LOADING_TIME = 10000;
const MIN_SPLASH_TIME = 1000;

export default function Home() {
  const router = useRouter();
  const { participant, participantStatus, isLoading } = useAuth();
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [hasNavigated, setHasNavigated] = useState(false);
  const [minSplashElapsed, setMinSplashElapsed] = useState(false);

  const isAdminUser = Boolean(participant?.isAdministrator || participant?.isSuperAdmin);
  const {
    data: activeCohorts = [],
    isLoading: activeCohortsLoading,
    error: activeCohortsError,
  } = useActiveCohorts({
    enabled: isAdminUser,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setMinSplashElapsed(true);
    }, MIN_SPLASH_TIME);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isLoading || (isAdminUser && activeCohortsLoading)) {
      const timer = setTimeout(() => {
        setLoadingTimeout(true);
      }, MAX_LOADING_TIME);

      return () => clearTimeout(timer);
    }
  }, [isLoading, isAdminUser, activeCohortsLoading]);

  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    const currentUrl = window.location.href;

    if (userAgent.includes('kakaotalk')) {
      window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(currentUrl)}`;
      return;
    }

    if (userAgent.includes('line')) {
      const separator = currentUrl.includes('?') ? '&' : '?';
      window.location.href = `${currentUrl}${separator}openExternalBrowser=1`;
      return;
    }

  }, []);

  useEffect(() => {
    if (participantStatus === 'ready' && participant && !hasNavigated) {
      let targetCohortId: string | null = null;

      if (isAdminUser) {
        const activeCohort = activeCohorts[0];

        if (activeCohort) {
          targetCohortId = activeCohort.id;
        } else if (!activeCohortsLoading || loadingTimeout || activeCohortsError) {
          targetCohortId = participant.cohortId;
        }
      } else {
        targetCohortId = participant.cohortId;
      }

      if (targetCohortId) {
        setHasNavigated(true);
        router.replace(appRoutes.chat(targetCohortId));
      }
    }
  }, [
    participantStatus,
    participant,
    activeCohorts,
    activeCohortsLoading,
    activeCohortsError,
    loadingTimeout,
    hasNavigated,
    isAdminUser,
    router,
  ]);

  if (isLoading || !minSplashElapsed) {
    return <SplashScreen />;
  }

  if (participantStatus === 'ready' && participant) {
    if (!hasNavigated) {
      return <SplashScreen />;
    }
    return null;
  }

  return (
    <div className="app-shell flex min-h-screen items-center justify-center p-4">
      <PhoneAuthCard />
    </div>
  );
}
