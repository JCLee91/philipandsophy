'use client';

import { createContext, useContext, useEffect, useState, useRef, ReactNode, useCallback } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { initializeFirebase, getFirebaseAuth, getParticipantByFirebaseUid } from '@/lib/firebase';
import { logger } from '@/lib/logger';
import { Participant } from '@/types/database';

// Participant 조회 상태
export type ParticipantStatus = 'idle' | 'loading' | 'ready' | 'missing' | 'error';

interface AuthContextType {
  user: User | null;
  participant: Participant | null;
  participantStatus: ParticipantStatus;
  isAdministrator: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
  retryParticipantFetch: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [participantStatus, setParticipantStatus] = useState<ParticipantStatus>('idle');
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(true);
  const currentUserRef = useRef<User | null>(null);

  // Participant 조회 함수 (재사용 가능)
  const fetchParticipant = useCallback(async (firebaseUser: User): Promise<void> => {
    if (!mountedRef.current) return;

    setParticipantStatus('loading');
    let retryCount = 0;
    const MAX_RETRIES = 2;
    const RETRY_DELAY = 300;

    const fetchWithRetry = async (): Promise<void> => {
      try {
        const participantData = await getParticipantByFirebaseUid(firebaseUser.uid);

        if (!participantData) {
          throw new Error('Participant not found for Firebase UID: ' + firebaseUser.uid);
        }

        if (mountedRef.current) {
          setParticipant(participantData);
          setParticipantStatus('ready');
          logger.info('Auth state: 로그인됨', {
            uid: firebaseUser.uid,
            name: participantData.name,
            isAdministrator: participantData.isAdministrator,
          });
        }
      } catch (error) {
        logger.error(`Participant 조회 실패 (시도 ${retryCount + 1}/${MAX_RETRIES}):`, error);

        if (retryCount < MAX_RETRIES - 1) {
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          return fetchWithRetry();
        } else {
          // ✅ 최종 실패 시 상태만 업데이트 (로그아웃하지 않음)
          if (mountedRef.current) {
            setParticipant(null);
            // participant가 아예 없는 경우 vs 네트워크 오류 구분
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes('not found')) {
              setParticipantStatus('missing');
              logger.error('Participant 조회 최종 실패: 참가자 정보 없음');
            } else {
              setParticipantStatus('error');
              logger.error('Participant 조회 최종 실패: 네트워크 또는 서버 오류');
            }
          }
        }
      }
    };

    await fetchWithRetry();
  }, []);

  // 수동 재시도 함수 (외부에서 호출 가능)
  const retryParticipantFetch = useCallback(async () => {
    if (!currentUserRef.current) {
      logger.warn('재시도 불가: 로그인된 사용자 없음');
      return;
    }

    logger.info('Participant 조회 수동 재시도 시작');
    await fetchParticipant(currentUserRef.current);
  }, [fetchParticipant]);

  useEffect(() => {
    mountedRef.current = true;
    let unsubscribe: (() => void) | null = null;

    const setupAuth = async () => {
      try {
        initializeFirebase();
        const auth = getFirebaseAuth();

        if (!mountedRef.current) return;

        unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
          if (!mountedRef.current) return;

          setUser(currentUser);
          currentUserRef.current = currentUser;

          if (currentUser) {
            await fetchParticipant(currentUser);
          } else {
            setParticipant(null);
            setParticipantStatus('idle');
            logger.info('Auth state: 로그아웃됨');
          }

          if (mountedRef.current) {
            setIsLoading(false);
          }
        });
      } catch (error) {
        logger.error('Auth 초기화 실패:', error);
        if (mountedRef.current) {
          setIsLoading(false);
          setParticipantStatus('error');
        }
      }
    };

    setupAuth();

    return () => {
      mountedRef.current = false;
      unsubscribe?.();
    };
  }, [fetchParticipant]);

  const logout = async () => {
    try {
      const auth = getFirebaseAuth();
      await signOut(auth);
      setParticipant(null);
      setParticipantStatus('idle');
      currentUserRef.current = null;
      logger.info('로그아웃 성공');
    } catch (error) {
      logger.error('로그아웃 실패:', error);
      throw error;
    }
  };

  const isAdministrator = participant?.isAdministrator === true;

  return (
    <AuthContext.Provider
      value={{
        user,
        participant,
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

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
