import { NextRequest, NextResponse } from 'next/server';
import { requireWebAppAdmin } from '@/lib/api-auth';
import { getAdminDb } from '@/lib/firebase/admin';
import { COLLECTIONS, NoticeTemplateCategory } from '@/types/database';
import { logger } from '@/lib/logger';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * POST /api/datacntr/notices/:noticeId/to-template
 * 기존 공지를 템플릿으로 저장
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ noticeId: string }> }
) {
  try {
    // Firebase Auth 검증
    const auth = await requireWebAppAdmin(request);
    if (auth.error) {
      return auth.error;
    }

    const { noticeId } = await params;
    const body = await request.json();
    const { templateId, category, title, order } = body;

    // 필수 필드 검증
    if (!templateId || !category || !title || order === undefined) {
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다 (templateId, category, title, order)' },
        { status: 400 }
      );
    }

    // 카테고리 검증
    const validCategories: NoticeTemplateCategory[] = [
      'onboarding',
      'guide',
      'milestone',
      'event',
    ];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: '유효하지 않은 카테고리입니다' },
        { status: 400 }
      );
    }

    const db = getAdminDb();

    // 공지 조회
    const noticeDoc = await db.collection(COLLECTIONS.NOTICES).doc(noticeId).get();

    if (!noticeDoc.exists) {
      return NextResponse.json(
        { error: '공지를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    const noticeData = noticeDoc.data();
    const now = Timestamp.now();

    // 템플릿으로 저장
    await db.collection(COLLECTIONS.NOTICE_TEMPLATES).doc(templateId).set({
      category,
      title,
      content: noticeData?.content,
      imageUrl: noticeData?.imageUrl || null,
      order,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({
      success: true,
      templateId,
      message: '공지가 템플릿으로 저장되었습니다',
    });
  } catch (error) {

    return NextResponse.json(
      { error: '템플릿 저장 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
