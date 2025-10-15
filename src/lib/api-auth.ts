import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { logger } from '@/lib/logger';
import type { Participant } from '@/types/database';

/**
 * Firebase Auth ID Token 검증 및 관리자 권한 확인
 *
 * @param request - Next.js API 요청 객체
 * @returns 성공 시 { user: Participant, error: null }, 실패 시 { user: null, error: NextResponse }
 */
export async function requireAdmin(
  request: NextRequest
): Promise<{ user: Participant; error: null } | { user: null; error: NextResponse }> {
  // 1. Authorization 헤더 추출
  const authHeader = request.headers.get('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    logger.warn('Missing or invalid Authorization header');
    return {
      user: null,
      error: NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'Missing or invalid Authorization header',
          code: 'MISSING_AUTH_HEADER'
        },
        {
          status: 401,
          headers: {
            'WWW-Authenticate': 'Bearer realm="PnS Admin API"',
          },
        }
      ),
    };
  }

  const idToken = authHeader.substring(7); // "Bearer " 제거 (7글자)

  try {
    // 2. Firebase Admin으로 ID Token 검증
    const auth = getAdminAuth();
    const decodedToken = await auth.verifyIdToken(idToken);

    logger.debug('ID Token verified successfully', {
      uid: decodedToken.uid,
      phoneNumber: decodedToken.phone_number
    });

    // 3. Firestore에서 참가자 정보 조회
    const db = getAdminDb();
    const participantSnapshot = await db
      .collection('participants')
      .where('firebaseUid', '==', decodedToken.uid)
      .limit(1)
      .get();

    if (participantSnapshot.empty) {
      logger.warn('Firebase UID와 연결된 참가자 없음', {
        uid: decodedToken.uid,
        phoneNumber: decodedToken.phone_number
      });
      return {
        user: null,
        error: NextResponse.json(
          {
            error: 'Forbidden',
            message: 'User not found',
            code: 'USER_NOT_FOUND'
          },
          { status: 403 }
        ),
      };
    }

    const participantDoc = participantSnapshot.docs[0];
    const participant = {
      id: participantDoc.id,
      ...participantDoc.data(),
    } as Participant;

    // 4. 관리자 권한 확인 (isAdmin OR isAdministrator - 필드명 호환성)
    if (!participant.isAdmin && !participant.isAdministrator) {
      logger.warn('관리자 권한 없음', {
        participantId: participant.id,
        name: participant.name,
        isAdmin: participant.isAdmin,
        isAdministrator: participant.isAdministrator,
      });
      return {
        user: null,
        error: NextResponse.json(
          {
            error: 'Forbidden',
            message: 'Admin access required',
            code: 'INSUFFICIENT_PERMISSIONS'
          },
          { status: 403 }
        ),
      };
    }

    // 5. 성공 - 관리자 인증 완료
    logger.info('관리자 인증 성공', {
      participantId: participant.id,
      name: participant.name,
    });

    return {
      user: participant,
      error: null,
    };

  } catch (error) {
    // Token 검증 실패 처리
    logger.error('ID Token 검증 실패:', error);

    // Firebase Auth 에러 타입 구분
    let errorMessage = 'Invalid or expired token';
    let errorCode = 'INVALID_TOKEN';

    if (error instanceof Error) {
      if (error.message.includes('expired')) {
        errorMessage = 'Token expired';
        errorCode = 'TOKEN_EXPIRED';
      } else if (error.message.includes('revoked')) {
        errorMessage = 'Token revoked';
        errorCode = 'TOKEN_REVOKED';
      } else if (error.message.includes('invalid')) {
        errorMessage = 'Token invalid';
        errorCode = 'TOKEN_INVALID';
      }
    }

    return {
      user: null,
      error: NextResponse.json(
        {
          error: 'Unauthorized',
          message: errorMessage,
          code: errorCode,
        },
        {
          status: 401,
          headers: {
            'WWW-Authenticate': 'Bearer realm="PnS Admin API"',
          },
        }
      ),
    };
  }
}
