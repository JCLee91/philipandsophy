import { NextRequest, NextResponse } from 'next/server';
import { verifyWelcomeToken } from '@/lib/firebase/welcome';
import { WelcomeVerifyResponse } from '@/types/welcome';
import { logger } from '@/lib/logger';

/**
 * GET /api/welcome/verify?token=xxx
 * 환영 토큰을 검증하고 참가자 정보를 반환합니다.
 */
export async function GET(request: NextRequest): Promise<NextResponse<WelcomeVerifyResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: '토큰이 필요합니다.',
          code: 'INVALID_TOKEN',
        },
        { status: 400 }
      );
    }

    const result = await verifyWelcomeToken(token);

    if (!result.success) {
      const statusCode = result.code === 'EXPIRED_TOKEN' ? 410 : 404;
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          code: result.code,
        },
        { status: statusCode }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    logger.error('Error in welcome token verification API', error);
    return NextResponse.json(
      {
        success: false,
        error: '서버 오류가 발생했습니다.',
        code: 'INVALID_TOKEN',
      },
      { status: 500 }
    );
  }
}
