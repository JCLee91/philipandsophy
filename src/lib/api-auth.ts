import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { logger } from '@/lib/logger';
import { SESSION_CONFIG } from '@/constants/session';
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

    const now = Date.now();
    const sessionExpiry = participant.sessionExpiry;

    // 세션 만료 확인
    if (sessionExpiry && sessionExpiry < now) {
      // 시계 오차 및 네트워크 지연을 고려한 유예 시간
      const graceTimeRemaining = SESSION_CONFIG.GRACE_PERIOD - (now - sessionExpiry);

      if (graceTimeRemaining <= 0) {
        // 유예 시간 초과: 세션 만료
        logger.info('세션 만료 (유예 시간 초과)', {
          participantId: participant.id,
          expiredAgo: Math.floor((now - sessionExpiry) / 1000 / 60) + '분'
        });

        // 만료된 세션 토큰 제거 (Fire-and-forget)
        db.collection('participants')
          .doc(participant.id)
          .update({
            sessionToken: null,
            sessionExpiry: null,
          })
          .catch((error) => {
            logger.warn('만료된 세션 토큰 제거 실패 (무시됨)', {
              participantId: participant.id,
              error: error.message
            });
          });

        return null;
      }

      // 유예 시간 내: 세션 유지하고 자동 연장
      logger.warn('세션 만료 임박 (유예 시간 내), 자동 연장', {
        participantId: participant.id,
        graceTimeRemaining: Math.floor(graceTimeRemaining / 1000) + '초'
      });

      // 유예 시간 내에서는 무조건 연장
      const newExpiry = now + SESSION_CONFIG.SESSION_DURATION;
      await db.collection('participants')
        .doc(participant.id)
        .update({
          sessionExpiry: newExpiry,
        });

      // 반환값의 sessionExpiry도 업데이트
      participant.sessionExpiry = newExpiry;
      return participant;
    }

    // 세션이 아직 유효한 경우: 자동 연장 임계값 체크
    if (sessionExpiry) {
      const timeUntilExpiry = sessionExpiry - now;

      // 남은 세션 시간이 12시간 미만이면 자동 연장
      if (timeUntilExpiry < SESSION_CONFIG.AUTO_EXTEND_THRESHOLD) {
        const hoursRemaining = Math.floor(timeUntilExpiry / 1000 / 60 / 60);

        logger.info('세션 자동 연장', {
          participantId: participant.id,
          hoursRemaining: hoursRemaining + '시간',
          extendedTo: '24시간'
        });

        const newExpiry = now + SESSION_CONFIG.SESSION_DURATION;
        await db.collection('participants')
          .doc(participant.id)
          .update({
            sessionExpiry: newExpiry,
          });

        // 반환값의 sessionExpiry도 업데이트
        participant.sessionExpiry = newExpiry;
      }
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
          {
            error: '세션이 만료되었거나 유효하지 않습니다.',
            code: 'SESSION_EXPIRED',
            message: '다시 로그인해주세요.',
          },
          {
            status: 401,
            headers: {
              'WWW-Authenticate': 'Bearer realm="PnS Member Portal"',
              'X-Session-Status': 'expired',
            },
          }
        ),
      };
    }

    return { user, error: null };
  } catch (error) {
    logger.error('세션 검증 실패:', error);
    return {
      user: null,
      error: NextResponse.json(
        {
          error: '세션 검증 중 오류가 발생했습니다.',
          code: 'SESSION_VALIDATION_ERROR',
        },
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

  // 🔒 isAdmin + isAdministrator 이중 체크 (필드명 호환성)
  if (!user?.isAdmin && !user?.isAdministrator) {
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
