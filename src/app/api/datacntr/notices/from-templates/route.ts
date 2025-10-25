import { NextRequest, NextResponse } from 'next/server';
import { requireWebAppAdmin } from '@/lib/api-auth';
import { getAdminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/types/database';
import { logger } from '@/lib/logger';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * POST /api/datacntr/notices/from-templates
 * 템플릿에서 공지 생성 (배치)
 */
export async function POST(request: NextRequest) {
  try {
    // Firebase Auth 검증
    const auth = await requireWebAppAdmin(request);
    if (auth.error) {
      return auth.error;
    }

    const body = await request.json();
    const { cohortId, templateIds, author } = body;

    // 필수 필드 검증
    if (!cohortId || !templateIds || !Array.isArray(templateIds) || !author) {
      return NextResponse.json(
        {
          error:
            '필수 필드가 누락되었습니다 (cohortId, templateIds: string[], author)',
        },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const now = Timestamp.now();
    const createdIds: string[] = [];

    // 코호트 존재 확인
    const cohortDoc = await db.collection(COLLECTIONS.COHORTS).doc(cohortId).get();
    if (!cohortDoc.exists) {
      return NextResponse.json(
        { error: '코호트를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 각 템플릿에서 공지 생성
    for (const templateId of templateIds) {
      try {
        // 템플릿 조회
        const templateDoc = await db
          .collection(COLLECTIONS.NOTICE_TEMPLATES)
          .doc(templateId)
          .get();

        if (!templateDoc.exists) {
          logger.warn(`템플릿 ${templateId}를 찾을 수 없습니다. 건너뜁니다.`);
          continue;
        }

        const template = templateDoc.data();

        // 공지 데이터 생성
        const noticeData: {
          cohortId: string;
          author: string;
          content: string;
          templateId: string;
          isCustom: boolean;
          createdAt: Timestamp;
          updatedAt: Timestamp;
          imageUrl?: string;
          order?: number;
        } = {
          cohortId,
          author,
          content: template?.content || '',
          templateId: templateDoc.id,
          isCustom: false, // 템플릿 공지
          createdAt: now,
          updatedAt: now,
        };

        // 이미지 URL이 있으면 추가
        if (template?.imageUrl) {
          noticeData.imageUrl = template.imageUrl;
        }

        // 템플릿의 order가 있으면 추가
        if (typeof template?.order === 'number') {
          noticeData.order = template.order;
        }

        // 공지 생성
        const noticeRef = await db
          .collection(COLLECTIONS.NOTICES)
          .add(noticeData);

        createdIds.push(noticeRef.id);
      } catch (error) {
        logger.error(`템플릿 ${templateId}에서 공지 생성 실패`, error);
        // 하나 실패해도 계속 진행
      }
    }

    return NextResponse.json({
      success: true,
      createdCount: createdIds.length,
      noticeIds: createdIds,
    });
  } catch (error) {
    logger.error('템플릿에서 공지 생성 실패 (datacntr-notices-from-templates)', error);
    return NextResponse.json(
      { error: '공지 생성 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
