import { NextRequest, NextResponse } from 'next/server';
import { requireWebAppAdmin } from '@/lib/api-auth';
import { getAdminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/types/database';
import { logger } from '@/lib/logger';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * PUT /api/datacntr/notice-templates/:templateId
 * 템플릿 수정
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    // Firebase Auth 검증
    const auth = await requireWebAppAdmin(request);
    if (auth.error) {
      return auth.error;
    }

    const { templateId } = await params;
    const body = await request.json();
    const { category, title, content, imageUrl, order } = body;

    const db = getAdminDb();
    const templateRef = db.collection(COLLECTIONS.NOTICE_TEMPLATES).doc(templateId);

    // 템플릿 존재 확인
    const templateDoc = await templateRef.get();
    if (!templateDoc.exists) {
      return NextResponse.json(
        { error: '템플릿을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 업데이트할 필드만 포함
    const updateData: {
      updatedAt: typeof Timestamp;
      category?: string;
      title?: string;
      content?: string;
      imageUrl?: string;
      order?: number;
    } = {
      updatedAt: Timestamp.now(),
    };

    if (category !== undefined) updateData.category = category;
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (order !== undefined) updateData.order = order;

    await templateRef.update(updateData);

    return NextResponse.json({
      success: true,
      templateId,
    });
  } catch (error) {
    logger.error('템플릿 수정 실패 (datacntr-notice-templates)', error);
    return NextResponse.json(
      { error: '템플릿 수정 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/datacntr/notice-templates/:templateId
 * 템플릿 삭제
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    // Firebase Auth 검증
    const auth = await requireWebAppAdmin(request);
    if (auth.error) {
      return auth.error;
    }

    const { templateId } = await params;
    const db = getAdminDb();
    const templateRef = db.collection(COLLECTIONS.NOTICE_TEMPLATES).doc(templateId);

    // 템플릿 존재 확인
    const templateDoc = await templateRef.get();
    if (!templateDoc.exists) {
      return NextResponse.json(
        { error: '템플릿을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    await templateRef.delete();

    return NextResponse.json({
      success: true,
      templateId,
    });
  } catch (error) {
    logger.error('템플릿 삭제 실패 (datacntr-notice-templates)', error);
    return NextResponse.json(
      { error: '템플릿 삭제 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
