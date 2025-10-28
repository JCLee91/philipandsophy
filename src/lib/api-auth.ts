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
export async function verifyAuthIdToken(idToken: string): Promise<{ email: string | null; uid: string } | null> {
  try {
    const { getAdminAuth } = await import('@/lib/firebase/admin');
    const auth = getAdminAuth();

    const decodedToken = await auth.verifyIdToken(idToken);

    return {
      email: decodedToken.email ?? null,
      uid: decodedToken.uid,
    };
  } catch (error) {

    return null;
  }
}

/**
 * Data Center API 요청 인증 검증
 *
 * Firebase Auth ID Token을 검증하고 이메일 도메인을 체크합니다
 */
type RequireAuthTokenSuccess = {
  participant: Participant;
  firebaseUid: string;
  email: string | null;
  error: null;
};

type RequireAuthTokenFailure = {
  participant: null;
  firebaseUid: null;
  email: null;
  error: NextResponse;
};

export async function requireAuthToken(
  request: NextRequest
): Promise<RequireAuthTokenSuccess | RequireAuthTokenFailure> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return {
      participant: null,
      firebaseUid: null,
      email: null,
      error: NextResponse.json(
        { error: '인증 토큰이 필요합니다' },
        { status: 401 }
      ),
    };
  }

  const idToken = authHeader.substring(7);
  const decoded = await verifyAuthIdToken(idToken);

  if (!decoded) {
    return {
      participant: null,
      firebaseUid: null,
      email: null,
      error: NextResponse.json(
        { error: '유효하지 않은 인증 토큰입니다' },
        { status: 401 }
      ),
    };
  }

  try {
    const db = getAdminDb();
    const snapshot = await db
      .collection(COLLECTIONS.PARTICIPANTS)
      .where('firebaseUid', '==', decoded.uid)
      .limit(1)
      .get();

    if (snapshot.empty) {

      return {
        participant: null,
        firebaseUid: null,
        email: null,
        error: NextResponse.json(
          {
            error: '등록되지 않은 사용자입니다.',
            code: 'PARTICIPANT_NOT_FOUND',
          },
          { status: 403 }
        ),
      };
    }

    const participantDoc = snapshot.docs[0];
    const participant = {
      id: participantDoc.id,
      ...participantDoc.data(),
    } as Participant;

    if (participant.isSuperAdmin !== true && participant.isAdministrator !== true) {

      return {
        participant: null,
        firebaseUid: null,
        email: null,
        error: NextResponse.json(
          {
            error: '데이터센터 접근 권한이 없습니다.',
            code: 'INSUFFICIENT_PRIVILEGES',
          },
          { status: 403 }
        ),
      };
    }

    return {
      participant,
      firebaseUid: decoded.uid,
      email: decoded.email,
      error: null,
    };
  } catch (error) {

    return {
      participant: null,
      firebaseUid: null,
      email: null,
      error: NextResponse.json(
        { error: '인증 정보를 확인하는 중 오류가 발생했습니다.' },
        { status: 500 }
      ),
    };
  }
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

    // UID로 Firestore participants 조회
    const db = getAdminDb();
    const snapshot = await db
      .collection(COLLECTIONS.PARTICIPANTS)
      .where('firebaseUid', '==', decodedToken.uid)
      .limit(1)
      .get();

    if (snapshot.empty) {

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

    return { user: participant, error: null };
  } catch (error: any) {

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
  const hasAdminPrivileges = user?.isAdministrator === true || user?.isSuperAdmin === true;

  if (!hasAdminPrivileges) {

    return {
      user: null,
      error: NextResponse.json(
        { error: '관리자 권한이 필요합니다.', code: 'FORBIDDEN' },
        { status: 403 }
      ),
    };
  }

  return { user, error: null };
}
