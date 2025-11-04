/**
 * GET /api/datacntr/participants/unverified?cohortId=xxx
 * 특정 코호트의 미인증 참가자 목록 조회
 * (오늘 독서 인증을 하지 않은 참가자)
 * 🔒 관리자 인증 필요
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { requireAuthToken } from '@/lib/api-auth';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  // 🔒 관리자 인증 확인
  const authResult = await requireAuthToken(request);
  if (authResult.error) {
    return authResult.error;
  }

  try {
    const { searchParams } = new URL(request.url);
    const cohortId = searchParams.get('cohortId');

    if (!cohortId) {
      return NextResponse.json(
        { error: 'cohortId is required' },
        { status: 400 }
      );
    }

    const db = await getAdminDb();

    // Get today's date string (Korea time, YYYY-MM-DD format)
    const now = new Date();
    const koreaOffset = 9 * 60 * 60 * 1000; // UTC+9
    const koreaTime = new Date(now.getTime() + koreaOffset);
    const todayDateString = koreaTime.toISOString().split('T')[0]; // YYYY-MM-DD

    // Get all participants in the cohort
    const participantsSnapshot = await db
      .collection('participants')
      .where('cohortId', '==', cohortId)
      .get();

    // 어드민, 슈퍼어드민, 고스트 제외 필터링
    const filteredParticipants = participantsSnapshot.docs.filter((doc) => {
      const data = doc.data();
      return !data.isSuperAdmin && !data.isAdministrator && !data.isGhost;
    });

    // Get all participant IDs in the cohort (excluding admins and ghosts)
    const allParticipantIds = filteredParticipants.map((doc) => doc.id);

    // Get today's submissions for these participants
    const submissionsSnapshot = await db
      .collection('reading_submissions')
      .where('submissionDate', '==', todayDateString)
      .get();

    // Create a set of participant IDs who submitted today (filter by cohort participants)
    const submittedParticipantIds = new Set(
      submissionsSnapshot.docs
        .map((doc) => doc.data().participantId)
        .filter((participantId) => allParticipantIds.includes(participantId))
    );

    // Filter participants who haven't submitted today
    const unverifiedParticipants = filteredParticipants
      .filter((doc) => !submittedParticipantIds.has(doc.id))
      .map((doc) => ({
        id: doc.id,
        name: doc.data().name || doc.id,
        role: doc.data().role || 'participant',
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({
      participants: unverifiedParticipants,
      totalParticipants: filteredParticipants.length,
      submittedToday: submittedParticipantIds.size,
      unverifiedCount: unverifiedParticipants.length,
    });
  } catch (error) {

    return NextResponse.json(
      { error: 'Failed to fetch unverified participants' },
      { status: 500 }
    );
  }
}
