'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User } from 'firebase/auth';
import { useAuth } from '@/contexts/AuthContext';
import { useDatacntrStore } from '@/stores/datacntr-store';

interface UseDatacntrAuthOptions {
  /** 기수 선택 필수 여부 (기본: true) */
  requiresCohort?: boolean;
  /** 미인증 시 리다이렉트할 경로 (기본: /datacntr/login) */
  redirectTo?: string;
}

interface UseDatacntrAuthReturn {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** 기수가 선택되어야 하는데 안 된 경우 true */
  needsCohortSelection: boolean;
  selectedCohortId: string | null;
}

/**
 * 데이터센터 페이지용 인증 훅
 * - 미인증 시 자동 리다이렉트
 * - 기수 선택 상태 통합
 */
export function useDatacntrAuth(options: UseDatacntrAuthOptions = {}): UseDatacntrAuthReturn {
  const { requiresCohort = true, redirectTo = '/datacntr/login' } = options;
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { selectedCohortId } = useDatacntrStore();

  // 미인증 시 로그인 페이지로 리다이렉트
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace(redirectTo);
    }
  }, [authLoading, user, router, redirectTo]);

  return {
    user,
    isAuthenticated: !!user,
    isLoading: authLoading,
    needsCohortSelection: requiresCohort && !selectedCohortId,
    selectedCohortId,
  };
}
