'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { getParticipantBySessionToken, clearSessionToken } from '@/lib/firebase';
import { Participant } from '@/types/database';
import { logger } from '@/lib/logger';

const SESSION_STORAGE_KEY = 'pns-session';

/**
 * 세션 관리 훅
 *
 * localStorage를 사용하여 세션 토큰 관리 (브라우저 닫아도 유지)
 * Firebase에서 참가자 정보 조회 및 세션 유효성 검증
 */
export function useSession() {
  const [currentUser, setCurrentUser] = useState<Participant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const queryClient = useQueryClient();

  // 세션 토큰 저장
  const setSessionToken = (token: string) => {
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, token);
    } catch (error) {
      logger.error('세션 토큰 저장 실패:', error);
    }
  };

  // 세션 토큰 조회
  const getSessionToken = (): string | null => {
    try {
      return localStorage.getItem(SESSION_STORAGE_KEY);
    } catch (error) {
      logger.error('세션 토큰 조회 실패:', error);
      return null;
    }
  };

  // 세션 토큰 제거
  const removeSessionToken = () => {
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
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

  // 세션 검증 및 사용자 정보 로드
  useEffect(() => {
    const validateSession = async () => {
      const token = getSessionToken();

      if (!token) {
        setCurrentUser(null);
        setIsLoading(false);
        return;
      }

      try {
        // Firebase에서 세션 토큰으로 참가자 조회
        const participant = await getParticipantBySessionToken(token);

        if (participant) {
          setCurrentUser(participant);
        } else {
          // 유효하지 않은 토큰 제거
          removeSessionToken();
          setCurrentUser(null);
        }
      } catch (error) {
        logger.error('세션 검증 실패:', error);
        removeSessionToken();
        setCurrentUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    validateSession();
  }, []);

  return {
    currentUser,
    isLoading,
    isAuthenticated: !!currentUser,
    login: setSessionToken,
    logout,
  };
}
