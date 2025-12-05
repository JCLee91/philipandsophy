'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchWithTokenRefresh } from '@/lib/auth-utils';
import { logger } from '@/lib/logger';

interface UseFetchWithAuthOptions<T> {
  /** API URL */
  url: string;
  /** fetch 활성화 여부 (기본: true) */
  enabled?: boolean;
  /** 성공 콜백 - useCallback으로 래핑 권장 */
  onSuccess?: (data: T) => void;
  /** 에러 콜백 - useCallback으로 래핑 권장 */
  onError?: (error: Error) => void;
  /** 초기 데이터 */
  initialData?: T;
  /**
   * 의존성 배열 - 변경 시 자동 refetch
   * ⚠️ 주의: 원시값(string, number, boolean)만 사용 권장
   * 객체/배열은 매번 새로운 참조가 생성되어 무한 refetch 가능
   */
  deps?: unknown[];
}

interface UseFetchWithAuthReturn<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * 데이터센터용 인증 API fetch 훅
 * - Firebase ID Token 자동 처리
 * - 토큰 만료 시 자동 리다이렉트
 */
export function useFetchWithAuth<T>({
  url,
  enabled = true,
  onSuccess,
  onError,
  initialData,
  deps = [],
}: UseFetchWithAuthOptions<T>): UseFetchWithAuthReturn<T> {
  const { user } = useAuth();
  const [data, setData] = useState<T | null>(initialData ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const fetchedRef = useRef(false);

  const fetchData = useCallback(async () => {
    if (!user || !enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchWithTokenRefresh(url);

      if (!response.ok) {
        throw new Error(`API 요청 실패: ${response.status}`);
      }

      const result = await response.json();
      setData(result);
      onSuccess?.(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('알 수 없는 에러');
      logger.error(`[useFetchWithAuth] ${url}`, error);
      setError(error);
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [user, url, enabled, onSuccess, onError]);

  // 초기 fetch 및 deps 변경 시 refetch
  // ⚠️ deps는 호출자가 안정적인 원시값만 전달해야 함
  useEffect(() => {
    if (!enabled || !user) {
      fetchedRef.current = false;
      return;
    }

    fetchData();
    fetchedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, enabled, url, fetchData, ...deps]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
  };
}
