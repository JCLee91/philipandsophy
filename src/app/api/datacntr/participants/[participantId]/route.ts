import { NextRequest, NextResponse } from 'next/server';
import { requireWebAppAdmin } from '@/lib/api-auth';
import { getAdminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/types/database';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';

interface RouteParams {
  params: Promise<{
    participantId: string;
  }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    // 1. Auth Check
    const auth = await requireWebAppAdmin(request);
    if (auth.error) {
      return auth.error;
    }

    const { participantId } = await params;
    if (!participantId) {
      return NextResponse.json({ error: 'Participant ID is required' }, { status: 400 });
    }

    // 2. Parse Body
    const body = await request.json();
    const { name, phoneNumber, gender, cohortId, occupation } = body;

    // 3. Update Firestore
    const db = getAdminDb();
    const participantRef = db.collection(COLLECTIONS.PARTICIPANTS).doc(participantId);

    // Check if exists
    const docSnapshot = await participantRef.get();
    if (!docSnapshot.exists) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
    }

    const updateData: Record<string, any> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (name !== undefined) updateData.name = name;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (gender !== undefined) updateData.gender = gender;
    if (cohortId !== undefined) updateData.cohortId = cohortId;
    if (occupation !== undefined) updateData.occupation = occupation;

    await participantRef.update(updateData);

    return NextResponse.json({
      success: true,
      message: 'Participant updated successfully',
      id: participantId,
      ...updateData
    });

  } catch (error) {
    logger.error('Error updating participant:', error);
    return NextResponse.json(
      { error: 'Failed to update participant' },
      { status: 500 }
    );
  }
}

