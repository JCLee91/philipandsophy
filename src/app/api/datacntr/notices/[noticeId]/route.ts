import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase/admin-init';
import { auth } from 'firebase-admin';
import { logger } from '@/lib/logger';

/**
 * GET /api/datacntr/notices/[noticeId]
 * 공지 상세 조회
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ noticeId: string }> }
) {
  try {
    const { noticeId } = await params;

    // 1. 인증 확인
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    let decodedToken: auth.DecodedIdToken;

    try {
      decodedToken = await auth().verifyIdToken(idToken);
    } catch (error) {
      logger.error('ID 토큰 검증 실패 (notices-get-api)', error);
      return NextResponse.json({ error: '유효하지 않은 인증 토큰' }, { status: 401 });
    }

    // 2. 관리자 권한 확인
    if (!decodedToken.isAdministrator) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 });
    }

    // 3. Firebase Admin 초기화
    const { db } = getFirebaseAdmin();

    // 4. 공지 조회
    const noticeDoc = await db.collection('notices').doc(noticeId).get();

    if (!noticeDoc.exists) {
      return NextResponse.json({ error: '공지를 찾을 수 없습니다' }, { status: 404 });
    }

    const noticeData = {
      id: noticeDoc.id,
      ...noticeDoc.data(),
    };

    return NextResponse.json(noticeData);
  } catch (error) {
    logger.error('공지 조회 API 오류', error);
    return NextResponse.json(
      { error: '공지 조회 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/datacntr/notices/[noticeId]
 * 공지 수정
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ noticeId: string }> }
) {
  try {
    const { noticeId } = await params;

    // 1. 인증 확인
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    let decodedToken: auth.DecodedIdToken;

    try {
      decodedToken = await auth().verifyIdToken(idToken);
    } catch (error) {
      logger.error('ID 토큰 검증 실패 (notices-update-api)', error);
      return NextResponse.json({ error: '유효하지 않은 인증 토큰' }, { status: 401 });
    }

    // 2. 관리자 권한 확인
    if (!decodedToken.isAdministrator) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 });
    }

    // 3. FormData 파싱
    const formData = await request.formData();
    const cohortId = formData.get('cohortId') as string;
    const content = formData.get('content') as string;
    const status = formData.get('status') as string;
    const imageFile = formData.get('image') as File | null;
    const existingImageUrl = formData.get('existingImageUrl') as string | null;

    // 4. 필수 필드 검증
    if (!cohortId || !content) {
      return NextResponse.json(
        { error: '기수와 내용은 필수 항목입니다' },
        { status: 400 }
      );
    }

    // 5. Firebase Admin 초기화
    const { db, bucket } = getFirebaseAdmin();

    // 6. 기존 공지 조회
    const noticeDoc = await db.collection('notices').doc(noticeId).get();

    if (!noticeDoc.exists) {
      return NextResponse.json({ error: '공지를 찾을 수 없습니다' }, { status: 404 });
    }

    const oldNoticeData = noticeDoc.data();
    const oldStatus = oldNoticeData?.status || 'published';
    const newStatus = status || 'published';

    // 7. 이미지 처리
    let imageUrl: string | undefined = existingImageUrl || undefined;

    if (imageFile) {
      try {
        const timestamp = Date.now();
        const fileName = `notices/${cohortId}/${timestamp}_${imageFile.name}`;
        const file = bucket.file(fileName);

        const buffer = Buffer.from(await imageFile.arrayBuffer());
        await file.save(buffer, {
          contentType: imageFile.type,
          metadata: {
            metadata: {
              uploadedBy: decodedToken.uid,
              cohortId,
            },
          },
        });

        // Public URL 생성
        await file.makePublic();
        imageUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
      } catch (error) {
        logger.error('이미지 업로드 실패 (notices-update-api)', error);
        return NextResponse.json(
          { error: '이미지 업로드에 실패했습니다' },
          { status: 500 }
        );
      }
    }

    // 8. 공지 업데이트
    const updateData: Record<string, any> = {
      cohortId,
      content: content.trim(),
      status: newStatus,
      updatedAt: new Date(),
    };

    if (imageUrl) {
      updateData.imageUrl = imageUrl;
    } else if (!existingImageUrl) {
      // 이미지를 제거한 경우
      updateData.imageUrl = null;
    }

    await db.collection('notices').doc(noticeId).update(updateData);

    // 9. draft → published로 변경된 경우 수동 푸시 알림 필요
    const shouldSendNotification = oldStatus === 'draft' && newStatus === 'published';

    if (shouldSendNotification) {
      logger.info('임시저장 공지 발행: 수동 푸시 알림 전송이 필요합니다', {
        noticeId,
        cohortId,
        message: '임시저장된 공지를 발행할 때는 onNoticeCreated가 트리거되지 않으므로, 별도 푸시 알림 로직이 필요합니다',
      });
    }

    logger.info('공지 수정 완료', {
      noticeId,
      cohortId,
      oldStatus,
      newStatus,
      statusChanged: oldStatus !== newStatus,
      hasImage: !!imageUrl,
    });

    return NextResponse.json({
      success: true,
      noticeId,
      statusChanged: oldStatus !== newStatus,
      published: newStatus === 'published',
    });
  } catch (error) {
    logger.error('공지 수정 API 오류', error);
    return NextResponse.json(
      { error: '공지 수정 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/datacntr/notices/[noticeId]
 * 공지 삭제
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ noticeId: string }> }
) {
  try {
    const { noticeId } = await params;

    // 1. 인증 확인
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    let decodedToken: auth.DecodedIdToken;

    try {
      decodedToken = await auth().verifyIdToken(idToken);
    } catch (error) {
      logger.error('ID 토큰 검증 실패 (notices-delete-api)', error);
      return NextResponse.json({ error: '유효하지 않은 인증 토큰' }, { status: 401 });
    }

    // 2. 관리자 권한 확인
    if (!decodedToken.isAdministrator) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 });
    }

    // 3. Firebase Admin 초기화
    const { db } = getFirebaseAdmin();

    // 4. 공지 삭제
    await db.collection('notices').doc(noticeId).delete();

    logger.info('공지 삭제 완료', {
      noticeId,
      deletedBy: decodedToken.uid,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('공지 삭제 API 오류', error);
    return NextResponse.json(
      { error: '공지 삭제 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
