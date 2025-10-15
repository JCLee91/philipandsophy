import { getAuthInstance } from '@/lib/firebase';
import { logger } from '@/lib/logger';

/**
 * Firebase ID Token을 가져옵니다.
 *
 * @returns Firebase ID Token 또는 null
 */
export async function getFirebaseIdToken(): Promise<string | null> {
  try {
    const auth = getAuthInstance();

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
