import { NextRequest, NextResponse } from 'next/server';
import { requireWebAppAdmin } from '@/lib/api-auth';
import { getAdminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/types/database';
import { logger } from '@/lib/logger';

/**
 * DELETE /api/datacntr/notices/[noticeId]
 * 공지사항 삭제
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ noticeId: string }> }
) {
  try {
    const { noticeId } = await context.params;

    // Firebase Auth 검증
    const auth = await requireWebAppAdmin(request);
    if (auth.error) {
      return auth.error;
    }

    const db = getAdminDb();
    const noticeRef = db.collection(COLLECTIONS.NOTICES).doc(noticeId);

    // 공지 존재 확인
    const noticeDoc = await noticeRef.get();
    if (!noticeDoc.exists) {
      return NextResponse.json(
        { error: '공지사항을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 공지 삭제
    await noticeRef.delete();

    return NextResponse.json({
      success: true,
      noticeId,
    });
  } catch (error) {
    logger.error('공지사항 삭제 실패 (datacntr-notices)', error);
    return NextResponse.json(
      { error: '공지사항 삭제 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
