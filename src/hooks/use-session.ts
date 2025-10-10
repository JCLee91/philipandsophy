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
 * sessionStorage를 사용하여 세션 토큰 관리 (탭 닫으면 자동 삭제)
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
      sessionStorage.setItem(SESSION_STORAGE_KEY, token);
    } catch (error) {
      logger.error('세션 토큰 저장 실패:', error);
    }
  };

  // 세션 토큰 조회
  const getSessionToken = (): string | null => {
    try {
      return sessionStorage.getItem(SESSION_STORAGE_KEY);
    } catch (error) {
      logger.error('세션 토큰 조회 실패:', error);
      return null;
    }
  };

  // 세션 토큰 제거
  const removeSessionToken = () => {
    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (error) {
      logger.error('세션 토큰 제거 실패:', error);
    }
  };

  // 로그아웃
  const logout = async () => {
    try {
      if (currentUser) {
        // Firebase에서 세션 토큰 제거
        await clearSessionToken(currentUser.id);
      }

      // sessionStorage 초기화
      removeSessionToken();

      // React Query 캐시 초기화
      queryClient.clear();

      // 로그인 페이지로 리다이렉트
      setCurrentUser(null);
      router.replace('/app');
    } catch (error) {
      logger.error('로그아웃 실패:', error);
    }
  };

  // 세션 검증 및 사용자 정보 로드
  useEffect(() => {
    const validateSession = async () => {
      const token = getSessionToken();

      if (!token) {
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
        }
      } catch (error) {
        logger.error('세션 검증 실패:', error);
        removeSessionToken();
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
    setSessionToken,
    getSessionToken,
    logout,
  };
}

/**
 * 인증 필요 페이지 보호 훅
 *
 * 세션이 없으면 로그인 페이지로 리다이렉트
 */
export function useRequireAuth() {
  const { currentUser, isLoading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !currentUser) {
      router.replace('/app');
    }
  }, [currentUser, isLoading, router]);

  return { currentUser, isLoading };
}
