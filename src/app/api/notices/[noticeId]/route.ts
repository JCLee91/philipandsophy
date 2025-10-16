import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { requireWebAppAdmin } from '@/lib/api-auth';
import { COLLECTIONS } from '@/types/database';
import { logger } from '@/lib/logger';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ noticeId: string }> }
) {
  try {
    // Firebase Auth로 관리자 권한 검증
    const { user, error } = await requireWebAppAdmin(request);
    if (error) {
      return error;
    }

    const { noticeId } = await params;
    if (!noticeId) {
      return NextResponse.json({ error: 'INVALID_ID' }, { status: 400 });
    }

    const db = getAdminDb();
    await db.collection(COLLECTIONS.NOTICES).doc(noticeId).delete();

    logger.info('공지 삭제 성공', {
      noticeId,
      adminId: user.id,
      adminName: user.name
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logger.error('Failed to delete notice', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
