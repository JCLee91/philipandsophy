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

    // 모든 메시지 조회 (최신순)
    const messagesSnapshot = await db
      .collection(COLLECTIONS.MESSAGES)
      .orderBy('createdAt', 'desc')
      .limit(200) // 최대 200개
      .get();

    // 참가자 정보 맵 생성
    const participantsSnapshot = await db.collection(COLLECTIONS.PARTICIPANTS).get();
    const participantsMap = new Map();
    participantsSnapshot.docs.forEach((doc) => {
      participantsMap.set(doc.id, doc.data().name);
    });

    // 메시지에 발신자/수신자명 추가
    const messagesWithParticipant = messagesSnapshot.docs.map((doc) => {
      const messageData = doc.data();

      return {
        id: doc.id,
        ...messageData,
        senderName: participantsMap.get(messageData.senderId) || '알 수 없음',
        receiverName: participantsMap.get(messageData.receiverId) || '알 수 없음',
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
