import { NextRequest, NextResponse } from 'next/server';
import {
  generateWelcomeToken,
  updateParticipantWelcomeMessage,
} from '@/lib/firebase/welcome';
import { generateWelcomeMessage } from '@/lib/ai/welcome-message';
import { WelcomeTokenResponse } from '@/types/welcome';
import { logger } from '@/lib/logger';

const WELCOME_API_SECRET = process.env.WELCOME_API_SECRET;

/**
 * POST /api/welcome/token
 * 외부 CRM에서 호출하여 환영 토큰을 생성합니다.
 */
export async function POST(request: NextRequest): Promise<NextResponse<WelcomeTokenResponse>> {
  try {
    const body = await request.json();
    const { phoneNumber, secretKey, callSummary } = body;

    // Secret key 검증
    if (!WELCOME_API_SECRET || secretKey !== WELCOME_API_SECRET) {
      logger.warn('Invalid secret key attempt for welcome token generation');
      return NextResponse.json(
        {
          success: false,
          error: '인증에 실패했습니다.',
          code: 'INVALID_SECRET',
        },
        { status: 401 }
      );
    }

    // 전화번호 필수 체크
    if (!phoneNumber) {
      return NextResponse.json(
        {
          success: false,
          error: '전화번호가 필요합니다.',
          code: 'MISSING_PHONE_NUMBER',
        },
        { status: 400 }
      );
    }

    // 전화번호 정규화 (하이픈 제거)
    const normalizedPhone = phoneNumber.replace(/-/g, '');

    // 토큰 생성
    const result = await generateWelcomeToken(normalizedPhone);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          code: result.code as WelcomeTokenResponse['code'],
        },
        { status: 404 }
      );
    }

    // 환영 페이지 URL 생성
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://philipandsophy.com';
    const welcomePageUrl = `${baseUrl}/welcome?token=${result.token}`;

    // AI 맞춤 환영 메시지 생성 (callSummary가 있고 50자 이상인 경우)
    let welcomeMessageGenerated = false;
    if (callSummary && callSummary.trim().length > 50 && result.participantId) {
      try {
        const aiResult = await generateWelcomeMessage({
          memberName: result.participantName || '멤버',
          callSummary: callSummary.trim(),
        });

        if (aiResult.success && aiResult.message) {
          await updateParticipantWelcomeMessage(
            result.participantId,
            aiResult.message,
            callSummary.trim()
          );
          welcomeMessageGenerated = true;
          logger.info(`AI welcome message generated for participant: ${result.participantId}`);
        } else {
          logger.warn('AI welcome message generation failed', {
            participantId: result.participantId,
            error: aiResult.error,
          });
        }
      } catch (aiError) {
        // AI 생성 실패해도 토큰 생성은 정상 진행
        logger.error('AI welcome message generation error (non-blocking)', aiError);
      }
    }

    logger.info(`Welcome token generated successfully for phone: ${normalizedPhone}`);

    return NextResponse.json({
      success: true,
      token: result.token,
      welcomePageUrl,
      participantName: result.participantName,
      expiresAt: result.expiresAt?.toISOString(),
      welcomeMessageGenerated,
    });
  } catch (error) {
    logger.error('Error in welcome token generation API', error);
    return NextResponse.json(
      {
        success: false,
        error: '서버 오류가 발생했습니다.',
        code: 'SERVER_ERROR',
      },
      { status: 500 }
    );
  }
}
