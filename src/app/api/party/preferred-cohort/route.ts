/**
 * Party Preferred Cohort API
 *
 * POST /api/party/preferred-cohort - 재참여자가 보여줄 프로필북(기수) 선택
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { requireWebAppAuth } from '@/lib/api-auth';
import { COLLECTIONS } from '@/types/database';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';

/**
 * POST - 파티에서 보여줄 프로필북(기수) 설정
 *
 * Body: {
 *   participantId: string;
 *   preferredCohortId: string;
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireWebAppAuth(request);
    if ('error' in authResult && authResult.error) {
      return authResult.error;
    }

    const { user } = authResult;
    const body = await request.json();
    const { participantId, preferredCohortId } = body;

    // Validate input
    if (!participantId || !preferredCohortId) {
      return NextResponse.json(
        { error: 'Missing required fields: participantId, preferredCohortId' },
        { status: 400 }
      );
    }

    // 본인만 수정 가능
    if (participantId !== user.id) {
      return NextResponse.json(
        { error: 'You are not authorized to modify this participant.' },
        { status: 403 }
      );
    }

    const db = getAdminDb();
    const participantRef = db.collection(COLLECTIONS.PARTICIPANTS).doc(participantId);

    // Check if exists
    const participantSnap = await participantRef.get();
    if (!participantSnap.exists) {
      return NextResponse.json(
        { error: 'Participant not found' },
        { status: 404 }
      );
    }

    // Update partyPreferredCohortId
    await participantRef.update({
      partyPreferredCohortId: preferredCohortId,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message: 'Party preferred cohort updated',
      participantId,
      preferredCohortId,
    });
  } catch (error) {
    logger.error('Error updating party preferred cohort:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
