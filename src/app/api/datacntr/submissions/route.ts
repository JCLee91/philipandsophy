import { NextRequest, NextResponse } from 'next/server';
import { requireWebAppAdmin } from '@/lib/api-auth';
import { getAdminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/types/database';
import { logger } from '@/lib/logger';
import { filterDatacntrParticipant } from '@/lib/datacntr/participant-filter';

export async function GET(request: NextRequest) {
  try {
    // Firebase Auth 검증
    const auth = await requireWebAppAdmin(request);
    if (auth.error) {
      return auth.error;
    }

    const db = getAdminDb();

    // URL에서 cohortId 파라미터 추출
    const { searchParams } = new URL(request.url);
    const cohortId = searchParams.get('cohortId');

    // 1. 참가자 정보 조회 (cohortId 필터링)
    let participantsQuery: any = db.collection(COLLECTIONS.PARTICIPANTS);
    if (cohortId) {
      participantsQuery = participantsQuery.where('cohortId', '==', cohortId);
    }
    const participantsSnapshot = await participantsQuery.get();

    const participantsMap = new Map();
    const targetParticipantIds: string[] = [];

    participantsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      participantsMap.set(doc.id, {
        name: data.name,
        cohortId: data.cohortId,
      });

      // 어드민, 슈퍼어드민, 고스트 + status 필터링
      if (!filterDatacntrParticipant(data)) return;
      targetParticipantIds.push(doc.id);
    });

    // 2. 독서 인증 조회 (participantId IN 쿼리로 필터링)
    const submissions: any[] = [];
    if (targetParticipantIds.length > 0) {
      // Firestore IN 제약: 최대 10개씩 분할 쿼리
      const chunkSize = 10;
      for (let i = 0; i < targetParticipantIds.length; i += chunkSize) {
        const chunk = targetParticipantIds.slice(i, i + chunkSize);
        const chunkSnapshot = await db
          .collection(COLLECTIONS.READING_SUBMISSIONS)
          .where('participantId', 'in', chunk)
          .orderBy('submittedAt', 'desc')
          // limit 제거: 프로그램 확장 시 오래된 기록이 잘릴 수 있음
          .get();
        submissions.push(...chunkSnapshot.docs);
      }
    }

    // 최신순 정렬
    submissions.sort((a, b) => {
      const aTime = a.data().submittedAt?.toMillis() || 0;
      const bTime = b.data().submittedAt?.toMillis() || 0;
      return bTime - aTime;
    });

    // 3. 코호트 정보 맵 생성
    const cohortsSnapshot = await db.collection(COLLECTIONS.COHORTS).get();
    const cohortsMap = new Map();
    cohortsSnapshot.docs.forEach((doc) => {
      cohortsMap.set(doc.id, doc.data().name);
    });

    // 4. 인증 데이터에 참가자명 및 코호트명 추가 (draft 제외)
    const submissionsWithParticipant = submissions
      .filter((doc) => doc.data().status !== 'draft') // draft 제외
      .map((doc) => {
        const submissionData = doc.data();
        const participant = participantsMap.get(submissionData.participantId);

        return {
          id: doc.id,
          ...submissionData,
          participantName: participant?.name || '알 수 없음',
          cohortName: cohortsMap.get(participant?.cohortId) || '알 수 없음',
        };
      });

    return NextResponse.json(submissionsWithParticipant);
  } catch (error) {

    return NextResponse.json(
      { error: '독서 인증 조회 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
