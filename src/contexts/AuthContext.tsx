'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { initializeFirebase, getFirebaseAuth } from '@/lib/firebase';
import { logger } from '@/lib/logger';
import { Participant } from '@/types/database';
import { useParticipant as useParticipantQuery } from '@/hooks/useParticipant';
import { deleteClientCookie } from '@/lib/cookies';

/**
 * AuthContext - Firebase Authentication + Participant 통합 관리
 *
 * 여러 코호트 참가 지원:
 * - URL cohortId에 따라 해당 코호트의 participant로 자동 전환
 * - 전화번호로 모든 participants 조회 후 cohortId 매칭
 */

// Participant 조회 상태
export type ParticipantStatus = 'idle' | 'loading' | 'ready' | 'missing' | 'error';

interface AuthContextType {
  user: User | null;
  participant: Participant | null;
  participantStatus: ParticipantStatus;
  isAdministrator: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
  retryParticipantFetch: () => void;
  allUserParticipants: Participant[]; // 유저의 모든 participant (여러 코호트)
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// AuthContext Provider는 Firebase Auth만 제공
function FirebaseAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [allUserParticipants, setAllUserParticipants] = useState<Participant[]>([]);
  const [urlCohortId, setUrlCohortId] = useState<string | null>(null);

  // URL cohortId 감지 (window.location 사용)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateCohortId = () => {
      const params = new URLSearchParams(window.location.search);
      setUrlCohortId(params.get('cohort'));
    };

    updateCohortId();

    // URL 변경 감지
    window.addEventListener('popstate', updateCohortId);
    const originalPushState = window.history.pushState;
    window.history.pushState = function(...args) {
      originalPushState.apply(this, args);
      updateCohortId();
    };

    return () => {
      window.removeEventListener('popstate', updateCohortId);
      window.history.pushState = originalPushState;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | null = null;

    const setupAuth = async () => {
      try {
        initializeFirebase();
        const auth = getFirebaseAuth();

        if (!mounted) return;

        unsubscribe = onAuthStateChanged(auth, (currentUser) => {
          if (!mounted) return;

          setUser(currentUser);
          setAuthLoading(false);

          if (currentUser) {

          } else {

            // ✅ localStorage에서 participantId 제거
            try {
              localStorage.removeItem('participantId');
            } catch (error) {

            }
            deleteClientCookie('pns-participant');
            deleteClientCookie('pns-cohort');
            setAllUserParticipants([]); // 모든 participants 초기화
          }
        });
      } catch (error) {

        if (mounted) {
          setAuthLoading(false);
        }
      }
    };

    setupAuth();

    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, []);

  // 기본 participant 조회 (firebaseUid 기준)
  const {
    data: baseParticipant,
    isLoading: participantLoading,
    isError: participantError,
    refetch: retryParticipantFetch,
  } = useParticipantQuery(user?.uid);

  // 모든 participants 조회 (전화번호 기준)
  useEffect(() => {
    if (!baseParticipant?.phoneNumber) {
      setAllUserParticipants([]);
      return;
    }

    const fetchAllParticipants = async () => {
      try {
        const { getAllParticipantsByPhoneNumber } = await import('@/lib/firebase');
        const participants = await getAllParticipantsByPhoneNumber(baseParticipant.phoneNumber);
        setAllUserParticipants(participants);
      } catch (error) {
        logger.error('Failed to fetch all user participants', error);
        setAllUserParticipants([baseParticipant]); // fallback to base
      }
    };

    fetchAllParticipants();
  }, [baseParticipant?.phoneNumber, baseParticipant?.id]);

  // cohortId에 맞는 participant 선택
  const activeCohortId = urlCohortId || baseParticipant?.cohortId;
  const participant = activeCohortId && allUserParticipants.length > 0
    ? allUserParticipants.find(p => p.cohortId === activeCohortId) || baseParticipant
    : baseParticipant;

  // participant 변경 시 쿠키 및 localStorage 업데이트
  useEffect(() => {
    if (!participant) return;

    try {
      // localStorage 업데이트
      localStorage.setItem('participantId', participant.id);

      // 쿠키 업데이트 (서버 사이드 라우팅용)
      const { setClientCookie } = require('@/lib/cookies');
      setClientCookie('pns-participant', participant.id);
      if (participant.cohortId) {
        setClientCookie('pns-cohort', participant.cohortId);
      }
    } catch (error) {
      logger.error('Failed to update participant cookies', error);
    }
  }, [participant?.id, participant?.cohortId]);

  const logout = async () => {
    try {
      const auth = getFirebaseAuth();
      await signOut(auth);
      deleteClientCookie('pns-participant');
      deleteClientCookie('pns-cohort');

    } catch (error) {

      throw error;
    }
  };

  // 전체 로딩 상태
  const isLoading = authLoading || (!!user && participantLoading);

  // Participant 조회 상태
  const participantStatus: ParticipantStatus = participantError
    ? 'error'
    : participantLoading
    ? 'loading'
    : participant
    ? 'ready'
    : user
    ? 'missing'
    : 'idle';

  // 데이터센터 접근 권한
  const isAdministrator = participant?.isAdministrator === true || participant?.isSuperAdmin === true;

  return (
    <AuthContext.Provider
      value={{
        user,
        participant: participant ?? null,
        participantStatus,
        isAdministrator,
        isLoading,
        logout,
        retryParticipantFetch,
        allUserParticipants,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// 외부에서 사용하는 Provider
export function AuthProvider({ children }: { children: ReactNode }) {
  return <FirebaseAuthProvider>{children}</FirebaseAuthProvider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
