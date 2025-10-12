import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { requireAdmin } from '@/lib/api-auth';
import { logger } from '@/lib/logger';
import * as admin from 'firebase-admin';

/**
 * POST /api/admin/add-backdated-submission
 * 과거 날짜로 제출 데이터 추가 (관리자 전용)
 */
export async function POST(request: NextRequest) {
  // 관리자 권한 검증
  const { error: authError } = await requireAdmin(request);
  if (authError) {
    return authError;
  }

  try {
    const body = await request.json();
    const {
      participantId,
      cohortId,
      submissionDate,
      bookTitle,
      bookReview,
      dailyQuestion,
      dailyAnswer,
      imageUrl = '',
    } = body;

    // 필수 필드 검증
    if (!participantId || !cohortId || !submissionDate || !bookTitle || !dailyQuestion || !dailyAnswer) {
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다.' },
        { status: 400 }
      );
    }

    const db = getAdminDb();

    // 제출 데이터 추가
    const submissionData = {
      participantId,
      cohortId,
      submissionDate,
      bookTitle,
      bookReview: bookReview || '',
      dailyQuestion,
      dailyAnswer,
      imageUrl,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    };

    const docRef = await db.collection('reading_submissions').add(submissionData);

    logger.info('과거 제출 데이터 추가 완료', {
      docId: docRef.id,
      participantId,
      submissionDate,
    });

    return NextResponse.json({
      success: true,
      docId: docRef.id,
      message: '제출 데이터가 추가되었습니다.',
      data: submissionData,
    });

  } catch (error) {
    logger.error('과거 제출 데이터 추가 실패', error);
    return NextResponse.json(
      {
        error: '제출 데이터 추가 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
