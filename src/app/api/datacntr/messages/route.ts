import { NextRequest, NextResponse } from 'next/server';
import { requireWebAppAdmin } from '@/lib/api-auth';
import { getAdminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/types/database';
import { logger } from '@/lib/logger';

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

    // 모든 메시지 조회 (최신순)
    const messagesSnapshot = await db
      .collection(COLLECTIONS.MESSAGES)
      .orderBy('createdAt', 'desc')
      .limit(200) // 최대 200개
      .get();

    // 참가자 정보 맵 생성 (name + cohortId)
    const participantsSnapshot = await db.collection(COLLECTIONS.PARTICIPANTS).get();
    const participantsMap = new Map();
    participantsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      participantsMap.set(doc.id, {
        name: data.name,
        cohortId: data.cohortId,
      });
    });

    // 메시지에 발신자/수신자명 추가 + cohortId 필터링
    const messagesWithParticipant = messagesSnapshot.docs
      .filter((doc) => {
        if (!cohortId) return true; // 필터링 없으면 전체

        const messageData = doc.data();
        const sender = participantsMap.get(messageData.senderId);
        const receiver = participantsMap.get(messageData.receiverId);

        // 발신자 또는 수신자 중 하나라도 해당 기수면 포함
        return sender?.cohortId === cohortId || receiver?.cohortId === cohortId;
      })
      .map((doc) => {
        const messageData = doc.data();
        const sender = participantsMap.get(messageData.senderId);
        const receiver = participantsMap.get(messageData.receiverId);

        return {
          id: doc.id,
          ...messageData,
          senderName: sender?.name || '알 수 없음',
          receiverName: receiver?.name || '알 수 없음',
        };
      });

    return NextResponse.json(messagesWithParticipant);
  } catch (error) {
    logger.error('메시지 조회 실패 (datacntr-messages)', error);
    return NextResponse.json(
      { error: '메시지 조회 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
