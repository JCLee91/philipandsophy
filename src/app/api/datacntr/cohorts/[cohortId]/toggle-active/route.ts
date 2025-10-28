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

    // 트랜잭션으로 하나만 활성화 보장
    await db.runTransaction(async (transaction) => {
      // 1. 모든 cohort 읽기 (트랜잭션 내에서)
      const allCohortsQuery = db.collection('cohorts');
      const allCohortsSnapshot = await transaction.get(allCohortsQuery);

      // 2. 현재 cohort 존재 확인
      const targetCohort = allCohortsSnapshot.docs.find(doc => doc.id === cohortId);
      if (!targetCohort) {
        throw new Error('Cohort를 찾을 수 없습니다');
      }

      // 3. 활성화하려는 경우, 다른 모든 cohort를 비활성화
      if (isActive) {
        allCohortsSnapshot.docs.forEach((doc) => {
          if (doc.id !== cohortId) {
            transaction.update(doc.ref, {
              isActive: false,
              updatedAt: Timestamp.now(),
            });
          }
        });

      }

      // 4. 현재 cohort 상태 업데이트
      transaction.update(cohortRef, {
        isActive,
        updatedAt: Timestamp.now(),
      });
    });

    return NextResponse.json({
      success: true,
      cohortId,
      isActive,
      message: isActive ? '해당 기수가 활성화되었습니다. 다른 기수는 자동으로 비활성화되었습니다.' : '해당 기수가 비활성화되었습니다.',
    });
  } catch (error) {

    return NextResponse.json(
      { error: '기수 활성화 상태 변경에 실패했습니다' },
      { status: 500 }
    );
  }
}
