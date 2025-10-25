import { NextRequest, NextResponse } from 'next/server';
import { requireWebAppAdmin } from '@/lib/api-auth';
import { getAdminDb } from '@/lib/firebase/admin';
import { COLLECTIONS, NoticeTemplateCategory } from '@/types/database';
import { logger } from '@/lib/logger';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * GET /api/datacntr/notice-templates
 * 모든 공지 템플릿 조회
 */
export async function GET(request: NextRequest) {
  try {
    // Firebase Auth 검증
    const auth = await requireWebAppAdmin(request);
    if (auth.error) {
      return auth.error;
    }

    const db = getAdminDb();

    // 모든 템플릿 조회 (카테고리, order순 정렬)
    const templatesSnapshot = await db
      .collection(COLLECTIONS.NOTICE_TEMPLATES)
      .orderBy('category', 'asc')
      .orderBy('order', 'asc')
      .get();

    const templates = templatesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ templates });
  } catch (error) {
    logger.error('템플릿 조회 실패 (datacntr-notice-templates)', error);
    return NextResponse.json(
      { error: '템플릿 조회 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/datacntr/notice-templates
 * 새 공지 템플릿 생성 (슈퍼 관리자만)
 */
export async function POST(request: NextRequest) {
  try {
    // Firebase Auth 검증
    const auth = await requireWebAppAdmin(request);
    if (auth.error) {
      return auth.error;
    }

    const body = await request.json();
    const { id, category, title, content, imageUrl, order } = body;

    // 필수 필드 검증
    if (!id || !category || !title || !content || order === undefined) {
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다 (id, category, title, content, order)' },
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
    const now = Timestamp.now();

    // 템플릿 생성
    await db.collection(COLLECTIONS.NOTICE_TEMPLATES).doc(id).set({
      category,
      title,
      content,
      imageUrl: imageUrl || null,
      order,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({
      success: true,
      templateId: id,
    });
  } catch (error) {
    logger.error('템플릿 생성 실패 (datacntr-notice-templates)', error);
    return NextResponse.json(
      { error: '템플릿 생성 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
