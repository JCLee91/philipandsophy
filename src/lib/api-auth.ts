import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { logger } from '@/lib/logger';
import type { Participant } from '@/types/database';
import { COLLECTIONS } from '@/types/database';

/**
 * Firebase Auth ID Token 검증 (Data Center용)
 *
 * @param idToken - Firebase Auth ID Token
 * @returns 검증된 사용자 정보 또는 null
 */
export async function verifyAuthIdToken(idToken: string): Promise<{ email: string; uid: string } | null> {
  try {
    const { getAdminAuth } = await import('@/lib/firebase/admin');
    const auth = getAdminAuth();

    const decodedToken = await auth.verifyIdToken(idToken);

    // 이메일이 없으면 검증 실패 (Data Center는 이메일 필수)
    if (!decodedToken.email) {
      logger.warn('ID Token에 이메일 없음', {
        uid: decodedToken.uid,
        provider: decodedToken.firebase.sign_in_provider,
      });
      return null;
    }

    return {
      email: decodedToken.email,
      uid: decodedToken.uid,
    };
  } catch (error) {
    logger.error('ID Token 검증 실패:', error);
    return null;
  }
}

/**
 * Data Center API 요청 인증 검증
 *
 * Firebase Auth ID Token을 검증하고 이메일 도메인을 체크합니다
 */
export async function requireAuthToken(
  request: NextRequest
): Promise<{ email: string; uid: string; error: null } | { email: null; uid: null; error: NextResponse }> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return {
      email: null,
      uid: null,
      error: NextResponse.json(
        { error: '인증 토큰이 필요합니다' },
        { status: 401 }
      ),
    };
  }

  const idToken = authHeader.substring(7);
  const user = await verifyAuthIdToken(idToken);

  if (!user) {
    return {
      email: null,
      uid: null,
      error: NextResponse.json(
        { error: '유효하지 않은 인증 토큰입니다' },
        { status: 401 }
      ),
    };
  }

  // 이메일 도메인 검증 (보안 강화)
  const { validateEmailDomain, ALLOWED_DOMAINS_TEXT } = await import('@/constants/auth');

  if (!validateEmailDomain(user.email)) {
    const emailDomain = user.email.split('@')[1];

    logger.warn('API 접근 차단 - 허용되지 않은 도메인', {
      email: user.email,
      domain: emailDomain,
      uid: user.uid,
    });

    return {
      email: null,
      uid: null,
      error: NextResponse.json(
        {
          error: `${emailDomain} 도메인은 접근이 허용되지 않습니다`,
          allowedDomains: ALLOWED_DOMAINS_TEXT,
        },
        { status: 403 }
      ),
    };
  }

  return { ...user, error: null };
}

/**
 * 웹앱 API 요청 인증 검증 (Firebase Phone Auth)
 *
 * Authorization: Bearer {idToken} 헤더에서 Firebase ID Token을 추출하고 검증합니다.
 * 검증 성공 시 Firebase UID로 Firestore participants를 조회하여 반환합니다.
 *
 * @param request - NextRequest
 * @returns 인증된 Participant 또는 에러
 */
export async function requireWebAppAuth(
  request: NextRequest
): Promise<{ user: Participant; error: null } | { user: null; error: NextResponse }> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return {
      user: null,
      error: NextResponse.json(
        { error: '인증 토큰이 필요합니다.' },
        { status: 401 }
      ),
    };
  }

  const idToken = authHeader.substring(7);

  try {
    // Firebase Admin SDK로 ID Token 검증
    const { getAdminAuth } = await import('@/lib/firebase/admin');
    const auth = getAdminAuth();
    const decodedToken = await auth.verifyIdToken(idToken);

    logger.debug('ID Token 검증 완료 (웹앱)', { uid: decodedToken.uid });

    // UID로 Firestore participants 조회
    const db = getAdminDb();
    const snapshot = await db
      .collection(COLLECTIONS.PARTICIPANTS)
      .where('firebaseUid', '==', decodedToken.uid)
      .limit(1)
      .get();

    if (snapshot.empty) {
      logger.warn('Firebase UID와 연결된 Participant 없음', {
        uid: decodedToken.uid,
        phoneNumber: decodedToken.phone_number,
      });
      return {
        user: null,
        error: NextResponse.json(
          {
            error: '등록되지 않은 사용자입니다.',
            code: 'PARTICIPANT_NOT_FOUND',
          },
          { status: 404 }
        ),
      };
    }

    const participant = {
      id: snapshot.docs[0].id,
      ...snapshot.docs[0].data(),
    } as Participant;

    logger.debug('Participant 조회 완료', { participantId: participant.id });
    return { user: participant, error: null };
  } catch (error: any) {
    logger.error('Firebase ID Token 검증 실패 (웹앱):', error);

    // ID Token 만료 여부 체크
    if (error.code === 'auth/id-token-expired') {
      return {
        user: null,
        error: NextResponse.json(
          {
            error: 'ID Token이 만료되었습니다.',
            code: 'TOKEN_EXPIRED',
            message: '다시 로그인해주세요.',
          },
          {
            status: 401,
            headers: {
              'WWW-Authenticate': 'Bearer realm="PnS Member Portal"',
              'X-Token-Status': 'expired',
            },
          }
        ),
      };
    }

    return {
      user: null,
      error: NextResponse.json(
        {
          error: '유효하지 않은 인증 토큰입니다.',
          code: 'INVALID_TOKEN',
        },
        { status: 401 }
      ),
    };
  }
}

/**
 * 웹앱 관리자 권한 검증
 *
 * requireWebAppAuth()로 인증 확인 후 관리자 권한을 추가로 체크합니다.
 *
 * @param request - NextRequest
 * @returns 인증된 관리자 Participant 또는 에러
 */
export async function requireWebAppAdmin(
  request: NextRequest
): Promise<{ user: Participant; error: null } | { user: null; error: NextResponse }> {
  const { user, error } = await requireWebAppAuth(request);

  if (error) {
    return { user: null, error };
  }

  // 관리자 권한 체크
  if (!user?.isAdministrator) {
    logger.warn('관리자 권한 없음', { participantId: user?.id, name: user?.name });
    return {
      user: null,
      error: NextResponse.json(
        { error: '관리자 권한이 필요합니다.', code: 'FORBIDDEN' },
        { status: 403 }
      ),
    };
  }

  logger.debug('관리자 권한 확인 완료', { participantId: user.id });
  return { user, error: null };
}

/**
 * 관리자 권한 검증 (Admin API용 - 별칭)
 *
 * requireWebAppAdmin과 동일한 함수입니다.
 * Admin API 라우트에서 사용하기 위한 별칭입니다.
 *
 * @param request - NextRequest
 * @returns 인증된 관리자 Participant 또는 에러
 */
export async function requireAdmin(
  request: NextRequest
): Promise<{ user: Participant; error: null } | { user: null; error: NextResponse }> {
  return requireWebAppAdmin(request);
}
