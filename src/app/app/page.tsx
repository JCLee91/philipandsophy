'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PhoneAuthCard from '@/features/auth/components/PhoneAuthCard';
import SplashScreen from '@/features/auth/components/SplashScreen';
import { useAuth } from '@/contexts/AuthContext';
import { appRoutes } from '@/lib/navigation';
import { useActiveCohorts, useCohort } from '@/hooks/use-cohorts';
import SocializingDashboard from '@/features/socializing/components/SocializingDashboard';
import { getSocializingStats } from '@/features/socializing/actions/socializing-actions';

export const dynamic = 'force-dynamic';

const MAX_LOADING_TIME = 10000;
const MIN_SPLASH_TIME = 1000;

export default function Home() {
  const router = useRouter();
  const { participant, participantStatus, isLoading, retryParticipantFetch } = useAuth();
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

  // Socializing Phase Logic - must be at top level
  const targetCohortId = participant?.cohortId;
  const { data: targetCohort } = useCohort(targetCohortId || undefined);
  const [voteStats, setVoteStats] = useState<{ dateVotes: Record<string, number>; locationVotes: Record<string, number> }>({ dateVotes: {}, locationVotes: {} });

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
    if (targetCohortId && targetCohort?.socializingPhase && targetCohort.socializingPhase !== 'idle' && targetCohort.socializingPhase !== 'confirmed') {
      getSocializingStats(targetCohortId).then(setVoteStats);
    }
  }, [targetCohortId, targetCohort?.socializingPhase]);

  useEffect(() => {
    if (participantStatus === 'ready' && participant && !hasNavigated) {
      // Check if socializing is active - if so, don't redirect
      if (targetCohort?.socializingPhase && targetCohort.socializingPhase !== 'idle') {
        // Socializing is active, stay on this page to show socializing screen
        return;
      }

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
    targetCohort,
  ]);

  if (isLoading || !minSplashElapsed) {
    return <SplashScreen />;
  }

  // Handle initialization error specifically
  if (participantStatus === 'error') {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center p-4 bg-gray-50">
        <div className="max-w-md w-full bg-white p-6 rounded-xl shadow-sm text-center space-y-4">
          <h2 className="text-xl font-bold text-gray-900">접속 오류</h2>
          <p className="text-gray-600">
            사용자 정보를 불러오는데 실패했습니다.<br />
            잠시 후 다시 시도해주세요.
          </p>
          <button
            type="button"
            onClick={() => retryParticipantFetch()}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            다시 시도
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full py-3 text-gray-500 hover:text-gray-700 text-sm"
          >
            새로고침
          </button>
        </div>
      </div>
    );
  }

  if (participantStatus === 'ready' && participant) {
    // Check for Socializing Phase
    if (targetCohort && targetCohort.socializingPhase && targetCohort.socializingPhase !== 'idle') {
      return (
        <div className="app-shell flex min-h-screen flex-col p-4 bg-gray-50">
          <SocializingDashboard
            cohort={targetCohort}
            participant={participant}
            voteStats={voteStats}
          />
        </div>
      );
    }

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
