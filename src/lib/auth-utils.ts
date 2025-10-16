import { getFirebaseAuth } from '@/lib/firebase';
import { logger } from '@/lib/logger';
import { signOut } from 'firebase/auth';

/**
 * Firebase ID Token을 가져옵니다.
 *
 * @returns Firebase ID Token 또는 null
 */
export async function getFirebaseIdToken(): Promise<string | null> {
  try {
    const auth = getFirebaseAuth();

    // Firebase Auth 초기화 완료 대기 (새로고침 직후 race condition 방지)
    await auth.authStateReady();

    const currentUser = auth.currentUser;

    if (!currentUser) {
      logger.warn('getFirebaseIdToken: No authenticated user');
      return null;
    }

    // forceRefresh=true: 항상 최신 토큰 사용 (만료 직전 토큰 방지)
    const idToken = await currentUser.getIdToken(true);
    return idToken;
  } catch (error) {
    logger.error('Failed to get Firebase ID token', error);
    return null;
  }
}

/**
 * 관리자 API 호출에 필요한 헤더를 생성합니다.
 * Authorization 헤더와 Content-Type을 포함합니다.
 *
 * @param additionalHeaders - 추가할 헤더 (선택)
 * @returns HTTP 헤더 객체 또는 null (인증 실패 시)
 */
export async function getAdminHeaders(
  additionalHeaders?: Record<string, string>
): Promise<Record<string, string> | null> {
  const idToken = await getFirebaseIdToken();

  if (!idToken) {
    logger.error('Cannot create admin headers: No ID token available');
    return null;
  }

  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${idToken}`,
    ...additionalHeaders,
  };
}

/**
 * API 요청을 수행하고 토큰 만료 시 자동으로 재로그인 안내
 *
 * @param url - 요청 URL
 * @param options - fetch options
 * @returns Response 또는 null (재로그인 필요)
 */
export async function fetchWithTokenRefresh(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const headers = await getAdminHeaders(options?.headers as Record<string, string>);

  if (!headers) {
    // 토큰이 없으면 로그인 페이지로 이동
    if (typeof window !== 'undefined') {
      window.location.href = '/datacntr/login';
    }
    throw new Error('인증이 필요합니다.');
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // 토큰 만료 체크
  if (response.status === 401) {
    const data = await response.json();

    if (data.code === 'TOKEN_EXPIRED') {
      logger.warn('Token expired, signing out and redirecting to login');

      // 로그아웃하고 로그인 페이지로 이동
      try {
        const auth = getFirebaseAuth();
        await signOut(auth);
      } catch (error) {
        logger.error('Sign out failed:', error);
      }

      if (typeof window !== 'undefined') {
        alert('세션이 만료되었습니다. 다시 로그인해주세요.');
        window.location.href = '/datacntr/login';
      }

      throw new Error('세션이 만료되었습니다.');
    }
  }

  return response;
}
