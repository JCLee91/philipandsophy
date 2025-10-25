import { NextRequest, NextResponse } from 'next/server';
import { requireWebAppAdmin } from '@/lib/api-auth';
import { getAdminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/types/database';
import { logger } from '@/lib/logger';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * POST /api/datacntr/notices/reorder
 * 공지사항 순서 재정렬
 */
export async function POST(request: NextRequest) {
  try {
    // Firebase Auth 검증
    const auth = await requireWebAppAdmin(request);
    if (auth.error) {
      return auth.error;
    }

    const body = await request.json();
    const { noticeOrders } = body;

    // noticeOrders: [{ noticeId: string, order: number }, ...]
    if (!Array.isArray(noticeOrders)) {
      return NextResponse.json(
        { error: 'noticeOrders 배열이 필요합니다' },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const batch = db.batch();
    const now = Timestamp.now();

    // 각 공지의 order 업데이트
    for (const { noticeId, order } of noticeOrders) {
      const noticeRef = db.collection(COLLECTIONS.NOTICES).doc(noticeId);
      batch.update(noticeRef, {
        order,
        updatedAt: now,
      });
    }

    await batch.commit();

    return NextResponse.json({
      success: true,
      updatedCount: noticeOrders.length,
    });
  } catch (error) {
    logger.error('공지사항 순서 변경 실패 (datacntr-notices-reorder)', error);
    return NextResponse.json(
      { error: '순서 변경 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
