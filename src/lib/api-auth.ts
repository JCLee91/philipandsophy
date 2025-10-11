import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { logger } from '@/lib/logger';
import type { Participant } from '@/types/database';

/**
 * API 요청에서 세션 토큰 추출
 */
function getSessionTokenFromRequest(request: NextRequest): string | null {
  // 1. Authorization 헤더 확인
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // 2. Cookie 확인
  const cookieToken = request.cookies.get('pns-session')?.value;
  if (cookieToken) {
    return cookieToken;
  }

  // 3. 쿼리 파라미터 확인 (비추천, 호환성용)
  const url = new URL(request.url);
  const queryToken = url.searchParams.get('token');
  if (queryToken) {
    return queryToken;
  }

  return null;
}

/**
 * 서버 측에서 세션 토큰으로 참가자 조회 (Admin SDK 사용)
 */
async function getParticipantBySessionTokenServer(
  sessionToken: string
): Promise<Participant | null> {
  try {
    const db = getAdminDb();
    const querySnapshot = await db
      .collection('participants')
      .where('sessionToken', '==', sessionToken)
      .limit(1)
      .get();

    if (querySnapshot.empty) {
      return null;
    }

    const doc = querySnapshot.docs[0];
    const participant = {
      id: doc.id,
      ...doc.data(),
    } as Participant;

    // 세션 만료 확인
    if (participant.sessionExpiry && participant.sessionExpiry < Date.now()) {
      // 만료된 세션 토큰 제거
      await db.collection('participants').doc(participant.id).update({
        sessionToken: null,
        sessionExpiry: null,
      });
      return null;
    }

    return participant;
  } catch (error) {
    logger.error('세션 토큰 조회 실패:', error);
    throw error;
  }
}

/**
 * API 요청의 세션 검증 및 사용자 정보 반환
 */
export async function validateSession(
  request: NextRequest
): Promise<{ user: Participant | null; error: NextResponse | null }> {
  const token = getSessionTokenFromRequest(request);

  if (!token) {
    return {
      user: null,
      error: NextResponse.json(
        { error: '인증 토큰이 필요합니다.' },
        { status: 401 }
      ),
    };
  }

  try {
    const user = await getParticipantBySessionTokenServer(token);

    if (!user) {
      return {
        user: null,
        error: NextResponse.json(
          { error: '유효하지 않은 세션입니다.' },
          { status: 401 }
        ),
      };
    }

    return { user, error: null };
  } catch (error) {
    logger.error('세션 검증 실패:', error);
    return {
      user: null,
      error: NextResponse.json(
        { error: '세션 검증 중 오류가 발생했습니다.' },
        { status: 500 }
      ),
    };
  }
}

/**
 * 관리자 권한 검증
 */
export async function requireAdmin(
  request: NextRequest
): Promise<{ user: Participant; error: null } | { user: null; error: NextResponse }> {
  const { user, error } = await validateSession(request);

  if (error) {
    return { user: null, error };
  }

  if (!user?.isAdmin) {
    return {
      user: null,
      error: NextResponse.json(
        { error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      ),
    };
  }

  return { user, error: null };
}
