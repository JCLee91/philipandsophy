import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { z } from 'zod';
import { getTodayString } from '@/lib/date-utils';
import { requireWebAppAdmin } from '@/lib/api-auth';
import { MatchingSchema } from '@/types/schemas';
import { logger } from '@/lib/logger';
import { getAdminDb } from '@/lib/firebase/admin';

/**
 * POST /api/admin/matching/confirm
 * AI 매칭 결과를 최종 확인하고 Firebase에 저장
 */
export async function POST(request: NextRequest) {
  // 내부 호출 인증 확인 (Firebase Functions에서 호출 시)
  const internalSecret = request.headers.get('x-internal-secret');
  const expectedSecret = process.env.INTERNAL_SERVICE_SECRET;
  const isInternalCall = internalSecret && expectedSecret && internalSecret === expectedSecret;

  let adminUser: { id: string; name: string } | null = null;

  // 내부 호출이 아니면 관리자 권한 검증
  if (!isInternalCall) {
    const { user, error } = await requireWebAppAdmin(request);
    if (error) {
      return error;
    }
    adminUser = user;
  } else {
    logger.info('Internal call detected, skipping admin auth');
    adminUser = { id: 'system', name: 'Scheduled Function' };
  }

  try {
    const { cohortId, matching, date } = await request.json();

    if (!cohortId) {
      return NextResponse.json(
        { error: 'cohortId가 필요합니다.' },
        { status: 400 }
      );
    }

    if (!matching) {
      return NextResponse.json(
        { error: 'matching 데이터가 필요합니다.' },
        { status: 400 }
      );
    }

    // Validate matching data structure with Zod
    try {
      MatchingSchema.parse(matching);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        logger.error('매칭 데이터 형식 오류', {
          errors: validationError.errors,
          matching,
        });
        return NextResponse.json(
          {
            error: 'matching 데이터 형식이 올바르지 않습니다.',
            issues: validationError.errors.map(e => ({
              path: e.path.join('.'),
              message: e.message,
            })),
          },
          { status: 400 }
        );
      }
      throw validationError;
    }

    const matchingDate = date || getTodayString(); // 매칭 날짜 (Firebase 키로 사용)

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(matchingDate)) {
      return NextResponse.json(
        {
          error: 'date 파라미터 형식이 올바르지 않습니다.',
          message: 'YYYY-MM-DD 형식이어야 합니다. (예: 2025-10-12)',
        },
        { status: 400 }
      );
    }

    // Firebase Admin 초기화 및 DB 가져오기
    const db = getAdminDb();

    // Cohort 문서에 매칭 결과 저장 (Transaction으로 race condition 방지)
    const cohortRef = db.collection('cohorts').doc(cohortId);

    try {
      await db.runTransaction(async (transaction) => {
        const cohortDoc = await transaction.get(cohortRef);

        if (!cohortDoc.exists) {
          throw new Error('Cohort를 찾을 수 없습니다.');
        }

        const cohortData = cohortDoc.data();
        const dailyFeaturedParticipants = cohortData?.dailyFeaturedParticipants || {};

        // Race condition 방지: 이미 해당 날짜의 매칭이 존재하는지 확인
        if (dailyFeaturedParticipants[matchingDate]?.assignments) {
          throw new Error('이미 해당 날짜의 매칭 결과가 존재합니다. 다시 매칭하려면 기존 결과를 먼저 삭제하세요.');
        }

        // 매칭 결과 저장 (matchingDate를 키로 사용)
        dailyFeaturedParticipants[matchingDate] = matching;

        transaction.update(cohortRef, {
          dailyFeaturedParticipants,
          updatedAt: admin.firestore.Timestamp.now(),
        });

        logger.info('매칭 결과 저장 완료', {
          cohortId,
          date: matchingDate,
          adminId: adminUser!.id,
          adminName: adminUser!.name,
          participantCount: Object.keys(matching.assignments || {}).length,
        });
      });
    } catch (transactionError) {
      if (transactionError instanceof Error) {
        if (transactionError.message === 'Cohort를 찾을 수 없습니다.') {
          return NextResponse.json(
            { error: 'Cohort를 찾을 수 없습니다.' },
            { status: 404 }
          );
        }
        if (transactionError.message.includes('이미 해당 날짜의 매칭 결과가 존재합니다')) {
          return NextResponse.json(
            { error: transactionError.message },
            { status: 409 }
          );
        }
      }
      throw transactionError;
    }

    return NextResponse.json({
      success: true,
      confirmed: true,
      date: matchingDate,
      message: '매칭 결과가 성공적으로 저장되었습니다.',
    });

  } catch (error) {
    logger.error('매칭 확인 및 저장 실패', error);
    return NextResponse.json(
      {
        error: '매칭 저장 중 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}
