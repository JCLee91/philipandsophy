'use client';

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { initializeFirebase, getFirebaseAuth, getParticipantByFirebaseUid } from '@/lib/firebase';
import { logger } from '@/lib/logger';
import { Participant } from '@/types/database';

interface AuthContextType {
  user: User | null;
  participant: Participant | null;
  isAdministrator: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    let unsubscribe: (() => void) | null = null;

    const setupAuth = async () => {
      try {
        // Firebase 초기화 완료 대기
        initializeFirebase();
        // 통합된 Auth 인스턴스 사용
        const auth = getFirebaseAuth();

        // 컴포넌트가 언마운트되었으면 중단
        if (!mountedRef.current) return;

        // Auth 리스너 등록
        unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
          if (!mountedRef.current) return;

          setUser(currentUser);

          // ✅ 로그인된 경우 participant 정보 가져오기 (개선된 재시도 로직)
          if (currentUser) {
            let retryCount = 0;
            const MAX_RETRIES = 2; // ✅ 3 → 2 (재시도 횟수 감소)
            const RETRY_DELAY = 300; // ✅ 1000ms → 300ms (지연 시간 단축)

            const fetchParticipantWithRetry = async (): Promise<void> => {
              try {
                const participantData = await getParticipantByFirebaseUid(currentUser.uid);

                // null 체크: participant가 없으면 에러로 처리
                if (!participantData) {
                  throw new Error('Participant not found for Firebase UID: ' + currentUser.uid);
                }

                if (mountedRef.current) {
                  setParticipant(participantData);
                  logger.info('Auth state: 로그인됨', {
                    uid: currentUser.uid,
                    name: participantData.name,
                    isAdministrator: participantData.isAdministrator,
                  });
                }
              } catch (error) {
                logger.error(`Participant 조회 실패 (시도 ${retryCount + 1}/${MAX_RETRIES}):`, error);

                if (retryCount < MAX_RETRIES - 1) {
                  retryCount++;
                  // ✅ 고정 300ms 지연 (Exponential Backoff 제거로 예측 가능한 지연)
                  await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                  return fetchParticipantWithRetry();
                } else {
                  // ✅ 최종 실패 시 명시적 로그아웃으로 user 상태 정리
                  logger.error('Participant 조회 최종 실패, 로그아웃 처리');
                  if (mountedRef.current) {
                    setParticipant(null);
                    // ✅ Firebase 로그아웃으로 user 상태 정리 (Data Center 로그인 화면 복구)
                    try {
                      await auth.signOut();
                      logger.info('Participant 조회 실패로 인한 자동 로그아웃 완료');
                    } catch (logoutError) {
                      logger.error('자동 로그아웃 실패:', logoutError);
                    }
                  }
                }
              }
            };

            await fetchParticipantWithRetry();
          } else {
            setParticipant(null);
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
        }
      }
    };

    setupAuth();

    return () => {
      mountedRef.current = false;
      unsubscribe?.();
    };
  }, []);

  const logout = async () => {
    try {
      const auth = getFirebaseAuth();
      await signOut(auth);
      setParticipant(null);
      logger.info('로그아웃 성공');
    } catch (error) {
      logger.error('로그아웃 실패:', error);
      throw error;
    }
  };

  const isAdministrator = participant?.isAdministrator === true;

  return (
    <AuthContext.Provider value={{ user, participant, isAdministrator, isLoading, logout }}>
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
