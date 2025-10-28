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
 * 내부적으로 TanStack Query (useParticipant)를 사용하여 Participant 조회
 * 외부 API는 기존과 동일하게 유지 (하위 호환성)
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// AuthContext Provider는 Firebase Auth만 제공
function FirebaseAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

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

  // useParticipant는 컴포넌트 내부에서만 사용 가능
  const {
    data: participant,
    isLoading: participantLoading,
    isError: participantError,
    refetch: retryParticipantFetch,
  } = useParticipantQuery(user?.uid);

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
