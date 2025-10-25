import { NextRequest, NextResponse } from 'next/server';
import { requireWebAppAdmin } from '@/lib/api-auth';
import { getAdminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';

/**
 * POST /api/datacntr/cohorts/[cohortId]/toggle-active
 * 기수 활성화 상태 토글
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ cohortId: string }> }
) {
  try {
    const { cohortId } = await context.params;

    // Firebase Auth 검증 (통일된 관리자 권한 확인)
    const auth = await requireWebAppAdmin(request);
    if (auth.error) {
      return auth.error;
    }

    // 요청 본문 파싱
    const body = await request.json();
    const { isActive } = body;

    if (typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'isActive 값이 필요합니다' }, { status: 400 });
    }

    // Firestore 업데이트
    const db = getAdminDb();
    const cohortRef = db.collection('cohorts').doc(cohortId);

    await cohortRef.update({
      isActive,
      updatedAt: Timestamp.now(),
    });

    return NextResponse.json({
      success: true,
      cohortId,
      isActive,
    });
  } catch (error) {
    logger.error('기수 활성화 상태 변경 실패', error);
    return NextResponse.json(
      { error: '기수 활성화 상태 변경에 실패했습니다' },
      { status: 500 }
    );
  }
}
