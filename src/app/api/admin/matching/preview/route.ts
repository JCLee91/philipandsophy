import { NextRequest, NextResponse } from 'next/server';
import { requireWebAppAdmin } from '@/lib/api-auth';
import { logger } from '@/lib/logger';

/**
 * POST /api/admin/matching/preview
 * 랜덤 매칭 프리뷰 (Functions manualMatchingPreview 프록시)
 *
 * @version 2.1.0 - 2025-11-10: 프록시 패턴으로 단순화
 *
 * 이유:
 * - 매칭 로직 중복 제거 (DRY 원칙)
 * - functions/src/lib/random-matching.ts = 단일 진실의 근원
 * - Next.js는 인증만 처리하고 Functions에 위임
 */
export async function POST(request: NextRequest) {
  // 관리자 권한 검증
  const { user, error } = await requireWebAppAdmin(request);
  if (error) {
    return error;
  }

  try {
    const body = await request.json();
    const { cohortId } = body ?? {};

    if (!cohortId) {
      return NextResponse.json(
        { error: 'cohortId가 필요합니다.' },
        { status: 400 }
      );
    }

    // 환경변수 검증
    const functionsUrl = process.env.FUNCTIONS_BASE_URL;
    const internalSecret = process.env.INTERNAL_SERVICE_SECRET;

    if (!functionsUrl) {
      logger.error('FUNCTIONS_BASE_URL not configured');
      return NextResponse.json(
        {
          error: '서버 설정 오류',
          message: 'FUNCTIONS_BASE_URL 환경변수가 설정되지 않았습니다.',
        },
        { status: 500 }
      );
    }

    if (!internalSecret) {
      logger.error('INTERNAL_SERVICE_SECRET not configured');
      return NextResponse.json(
        {
          error: '서버 설정 오류',
          message: 'INTERNAL_SERVICE_SECRET 환경변수가 설정되지 않았습니다.',
        },
        { status: 500 }
      );
    }

    logger.info('Proxying to Functions manualMatchingPreview', { cohortId, functionsUrl });

    const response = await fetch(functionsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': internalSecret,
      },
      body: JSON.stringify({ cohortId }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      logger.error('Functions call failed', {
        status: response.status,
        error: errorData,
      });

      return NextResponse.json(
        {
          error: errorData.error || '매칭 실행 중 오류가 발생했습니다.',
          message: errorData.message,
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    logger.info('Functions call succeeded', {
      cohortId,
      totalParticipants: data.totalParticipants,
      matchingVersion: data.matching?.matchingVersion,
    });

    return NextResponse.json(data);

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    logger.error('Matching preview proxy failed', {
      error: message,
    });

    return NextResponse.json(
      {
        error: '매칭 프리뷰 요청 중 오류가 발생했습니다.',
        message,
      },
      { status: 500 }
    );
  }
}
