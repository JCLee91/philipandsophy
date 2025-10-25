import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';

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

    // 인증 확인
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const auth = getAdminAuth();
    const decodedToken = await auth.verifyIdToken(idToken);

    if (!decodedToken) {
      return NextResponse.json({ error: '유효하지 않은 토큰입니다' }, { status: 401 });
    }

    // 관리자 권한 확인
    if (!decodedToken.admin && !(decodedToken as any).isAdministrator) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 });
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

    await cohortRef.update({
      isActive,
      updatedAt: Timestamp.now(),
    });

    return NextResponse.json({
      success: true,
      cohortId,
      isActive,
    });
  } catch (error) {
    console.error('기수 활성화 상태 변경 실패:', error);
    return NextResponse.json(
      { error: '기수 활성화 상태 변경에 실패했습니다' },
      { status: 500 }
    );
  }
}
