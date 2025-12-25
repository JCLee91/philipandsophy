import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const WEBHOOK_API_KEY = process.env.WEBHOOK_API_KEY;

interface ActivateRequest {
  phoneNumber: string;
  cohortId?: string; // 재신청자 구분용 (선택적)
}

interface ActivateResponse {
  success: boolean;
  participantId?: string;
  previousStatus?: string;
  newStatus?: string;
  error?: string;
}

/**
 * 전화번호(+cohortId)로 참가자 찾아서 status를 'active'로 변경
 * cohortId가 제공되면 해당 기수의 participant만 조회 (재신청자 지원)
 */
async function activateParticipantByPhone(
  phoneNumber: string,
  cohortId?: string
): Promise<ActivateResponse> {
  const db = getAdminDb();

  // 전화번호 정규화 (하이픈 제거)
  const normalizedPhone = phoneNumber.replace(/-/g, '');

  // 쿼리 빌드: status가 'applicant'인 참가자 찾기
  let query = db
    .collection('participants')
    .where('phoneNumber', '==', normalizedPhone)
    .where('status', '==', 'applicant');

  // cohortId가 제공되면 해당 기수만 조회
  if (cohortId) {
    query = query.where('cohortId', '==', cohortId);
  }

  const snapshot = await query.get();

  if (snapshot.empty) {
    // status가 이미 active인지 확인
    let activeQuery = db
      .collection('participants')
      .where('phoneNumber', '==', normalizedPhone)
      .where('status', '==', 'active');

    if (cohortId) {
      activeQuery = activeQuery.where('cohortId', '==', cohortId);
    }

    const activeSnapshot = await activeQuery.get();

    if (!activeSnapshot.empty) {
      return {
        success: true,
        participantId: activeSnapshot.docs[0].id,
        previousStatus: 'active',
        newStatus: 'active',
      };
    }

    return {
      success: false,
      error: 'not_found',
    };
  }

  const doc = snapshot.docs[0];
  const participantId = doc.id;

  // status 변경
  await doc.ref.update({
    status: 'active',
    updatedAt: Timestamp.now(),
  });

  logger.info('Participant activated', {
    participantId,
    phoneNumber: normalizedPhone.slice(-4),
    cohortId: cohortId || 'any',
  });

  return {
    success: true,
    participantId,
    previousStatus: 'applicant',
    newStatus: 'active',
  };
}

/**
 * POST /api/webhook/activate-participant
 *
 * Make에서 결제 완료 시 호출하여 참가자 status를 active로 변경
 */
export async function POST(request: NextRequest): Promise<NextResponse<ActivateResponse>> {
  try {
    // 1. API 키 검증
    const apiKey = request.headers.get('x-api-key');
    if (!WEBHOOK_API_KEY || apiKey !== WEBHOOK_API_KEY) {
      logger.warn('Invalid webhook API key attempt');
      return NextResponse.json(
        { success: false, error: 'unauthorized' },
        { status: 401 }
      );
    }

    // 2. 요청 데이터 파싱
    const body = await request.json() as ActivateRequest;
    const { phoneNumber, cohortId } = body;

    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, error: 'phoneNumber is required' },
        { status: 400 }
      );
    }

    // 3. 참가자 상태 변경 (cohortId가 있으면 해당 기수만 조회)
    const result = await activateParticipantByPhone(phoneNumber, cohortId);

    if (!result.success) {
      logger.warn('Participant not found for activation', {
        phoneNumber: phoneNumber.slice(-4),
        cohortId: cohortId || 'any',
      });
      return NextResponse.json(result, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    logger.error('Failed to activate participant', error);
    return NextResponse.json(
      { success: false, error: 'internal_error' },
      { status: 500 }
    );
  }
}
