import { NextRequest, NextResponse } from 'next/server';
import { getWelcomeConfig, updateWelcomeConfig } from '@/lib/firebase/welcome';
import { logger } from '@/lib/logger';

/**
 * GET /api/datacntr/welcome
 * 환영 페이지 설정(계좌 정보) 조회
 */
export async function GET() {
  try {
    const config = await getWelcomeConfig();
    return NextResponse.json({ success: true, config });
  } catch (error) {
    logger.error('Failed to fetch welcome config', error);
    return NextResponse.json(
      { success: false, error: '설정을 불러오는데 실패했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/datacntr/welcome
 * 환영 페이지 설정(계좌 정보) 수정
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { bankName, accountNumber, accountHolder, amountDescription, note, userEmail } = body;

    await updateWelcomeConfig(
      {
        bankName,
        accountNumber,
        accountHolder,
        amountDescription,
        note,
      },
      userEmail
    );

    return NextResponse.json({ success: true, message: '설정이 저장되었습니다.' });
  } catch (error) {
    logger.error('Failed to update welcome config', error);
    return NextResponse.json(
      { success: false, error: '설정 저장에 실패했습니다.' },
      { status: 500 }
    );
  }
}
