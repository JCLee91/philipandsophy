'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { getParticipantBySessionToken, clearSessionToken } from '@/lib/firebase';
import { Participant } from '@/types/database';
import { logger } from '@/lib/logger';
import { SESSION_CONFIG } from '@/constants/session';

const SESSION_STORAGE_KEY = SESSION_CONFIG.STORAGE_KEY;

/**
 * 세션 관리 훅
 *
 * localStorage를 사용하여 세션 토큰 관리 (브라우저 닫아도 유지)
 * Firebase에서 참가자 정보 조회 및 세션 유효성 검증
 */
export function useSession() {
  const [currentUser, setCurrentUser] = useState<Participant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionToken, setSessionTokenState] = useState<string | null>(null);
  const router = useRouter();
  const queryClient = useQueryClient();

  // 세션 토큰 저장
  const setSessionToken = (token: string) => {
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, token);
      setSessionTokenState(token);
    } catch (error) {
      logger.error('세션 토큰 저장 실패:', error);
    }
  };

  // 세션 토큰 조회
  const getSessionToken = (): string | null => {
    try {
      const token = localStorage.getItem(SESSION_STORAGE_KEY);
      setSessionTokenState(token);
      return token;
    } catch (error) {
      logger.error('세션 토큰 조회 실패:', error);
      return null;
    }
  };

  // 세션 토큰 제거
  const removeSessionToken = () => {
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      setSessionTokenState(null);
    } catch (error) {
      logger.error('세션 토큰 제거 실패:', error);
    }
  };

  // 로그아웃
  const logout = async () => {
    // Firebase 작업은 별도 try-catch (실패해도 클라이언트는 정리)
    try {
      if (currentUser) {
        // Firebase에서 세션 토큰 제거
        await clearSessionToken(currentUser.id);
      }
    } catch (error) {
      logger.error('Firebase 세션 토큰 제거 실패:', error);
      // Firebase 실패해도 계속 진행 (클라이언트 cleanup은 필수)
    }

    // 클라이언트 정리는 항상 실행 (Firebase 실패 무관)
    try {
      // sessionStorage 초기화
      removeSessionToken();

      // React Query 캐시 초기화
      queryClient.clear();

      // 상태 초기화 및 리다이렉트
      setCurrentUser(null);
      router.replace('/app');
    } catch (error) {
      logger.error('클라이언트 세션 정리 실패:', error);
      // 최소한 페이지는 이동
      router.replace('/app');
    }
  };

  // 세션 검증 함수 (재시도 로직 포함)
  const validateSession = useCallback(async () => {
    // 1순위: 메모리 캐시된 sessionToken 사용 (localStorage보다 빠르고 안정적)
    const cachedToken = sessionToken;
    const token = cachedToken || getSessionToken();

    if (!token) {
      // localStorage도 없고 메모리 캐시도 없으면 로그아웃 처리
      setCurrentUser(null);
      setSessionTokenState(null);
      setIsLoading(false);
      return;
    }

    // Exponential backoff 재시도 로직
    const { MAX_RETRIES, INITIAL_RETRY_DELAY, BACKOFF_MULTIPLIER } = SESSION_CONFIG.RETRY_CONFIG;

    let lastError: unknown = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        // Firebase에서 세션 토큰으로 참가자 조회
        const participant = await getParticipantBySessionToken(token);

        if (participant) {
          setCurrentUser(participant);
          setSessionTokenState(token);

          // 재시도 성공 시 로그
          if (attempt > 0) {
            logger.info('세션 검증 재시도 성공', { attempt });
          }

          setIsLoading(false);
          return;
        } else {
          // 유효하지 않은 토큰 (재시도 불필요)
          removeSessionToken();
          setCurrentUser(null);
          setSessionTokenState(null);
          setIsLoading(false);
          return;
        }
      } catch (error) {
        lastError = error;

        // 마지막 시도가 아니면 재시도
        if (attempt < MAX_RETRIES) {
          const delayMs = INITIAL_RETRY_DELAY * Math.pow(BACKOFF_MULTIPLIER, attempt);

          logger.warn('세션 검증 실패, 재시도 예정', {
            attempt: attempt + 1,
            maxRetries: MAX_RETRIES + 1,
            retryIn: `${delayMs / 1000}초`,
            error: error instanceof Error ? error.message : String(error)
          });

          // Exponential backoff: 1초, 2초, 4초
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }

    // 모든 재시도 실패: 네트워크 에러로 판단
    logger.error('세션 검증 모든 재시도 실패', {
      attempts: MAX_RETRIES + 1,
      lastError: lastError instanceof Error ? lastError.message : String(lastError)
    });

    // ✅ 개선: currentUser가 이미 있으면 유지 (네트워크 에러 대응)
    // 초기 로드 시에만 로그아웃 처리
    if (!currentUser) {
      setCurrentUser(null);
      setSessionTokenState(null);
    }
    // removeSessionToken()을 호출하지 않음 → localStorage에 토큰 유지

    setIsLoading(false);
  }, [sessionToken, currentUser]);

  // 초기 세션 검증 (마운트 시)
  useEffect(() => {
    validateSession();
  }, [validateSession]);

  // 페이지 visibility 변경 시 세션 재검증 (PWA 앱 전환/탭 전환 대응)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // 페이지가 보여질 때마다 세션 재검증
        logger.debug('세션 재검증 (visibility)', { trigger: 'visibilitychange' });
        validateSession();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [validateSession]);

  // Next.js 뒤로가기 감지 (popstate 이벤트)
  useEffect(() => {
    const handlePopState = () => {
      logger.debug('세션 재검증 (뒤로가기)', { trigger: 'popstate' });
      validateSession();
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [validateSession]);

  return {
    currentUser,
    isLoading,
    isAuthenticated: !!currentUser,
    login: setSessionToken,
    logout,
    sessionToken,
  };
}
