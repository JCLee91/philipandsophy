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
      targetParticipantIds.push(doc.id);
    });

    // 2. 메시지 조회 (senderId/receiverId IN 쿼리로 필터링)
    let messages: any[] = [];
    if (cohortId && targetParticipantIds.length > 0) {
      // Firestore IN 제약: 최대 10개씩 분할 쿼리 (senderId 기준)
      const chunkSize = 10;
      const senderMessages = new Set<string>(); // 중복 방지

      for (let i = 0; i < targetParticipantIds.length; i += chunkSize) {
        const chunk = targetParticipantIds.slice(i, i + chunkSize);

        // senderId가 해당 참가자인 메시지
        const senderChunk = await db
          .collection(COLLECTIONS.MESSAGES)
          .where('senderId', 'in', chunk)
          .orderBy('createdAt', 'desc')
          .limit(200)
          .get();

        senderChunk.docs.forEach((doc) => {
          if (!senderMessages.has(doc.id)) {
            senderMessages.add(doc.id);
            messages.push(doc);
          }
        });

        // receiverId가 해당 참가자인 메시지
        const receiverChunk = await db
          .collection(COLLECTIONS.MESSAGES)
          .where('receiverId', 'in', chunk)
          .orderBy('createdAt', 'desc')
          .limit(200)
          .get();

        receiverChunk.docs.forEach((doc) => {
          if (!senderMessages.has(doc.id)) {
            senderMessages.add(doc.id);
            messages.push(doc);
          }
        });
      }

      // 최신순 정렬
      messages.sort((a, b) => {
        const aTime = a.data().createdAt?.toMillis() || 0;
        const bTime = b.data().createdAt?.toMillis() || 0;
        return bTime - aTime;
      });
    } else {
      // cohortId 없으면 전체 조회
      const messagesSnapshot = await db
        .collection(COLLECTIONS.MESSAGES)
        .orderBy('createdAt', 'desc')
        .limit(200)
        .get();
      messages = messagesSnapshot.docs;
    }

    // 3. 메시지에 발신자/수신자명 추가
    const messagesWithParticipant = messages.map((doc) => {
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

    return NextResponse.json(
      { error: '메시지 조회 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
