import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase/admin-init';
import { requireAuthToken } from '@/lib/api-auth';
import { APP_CONSTANTS } from '@/constants/app';

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

    // 1. 인증 및 권한 확인 (Firestore participant 기반)
    const { participant, error } = await requireAuthToken(request);
    if (error) return error;

    // 2. Firebase Admin 초기화
    const { db } = getFirebaseAdmin();

    // 3. 공지 조회
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

    // 1. 인증 및 권한 확인 (Firestore participant 기반)
    const { participant, firebaseUid, error } = await requireAuthToken(request);
    if (error) return error;

    // 2. FormData 파싱
    const formData = await request.formData();
    const cohortId = formData.get('cohortId') as string;
    const content = formData.get('content') as string;
    const status = formData.get('status') as string;
    const imageFile = formData.get('image') as File | null;
    const existingImageUrl = formData.get('existingImageUrl') as string | null;

    // 3. 필수 필드 검증
    if (!cohortId || !content) {
      return NextResponse.json(
        { error: '기수와 내용은 필수 항목입니다' },
        { status: 400 }
      );
    }

    // 4. Firebase Admin 초기화
    const { db, bucket } = getFirebaseAdmin();

    // 5. 기존 공지 조회
    const noticeDoc = await db.collection('notices').doc(noticeId).get();

    if (!noticeDoc.exists) {
      return NextResponse.json({ error: '공지를 찾을 수 없습니다' }, { status: 404 });
    }

    const oldNoticeData = noticeDoc.data();
    const oldStatus = oldNoticeData?.status || 'published';
    // ✅ status 기본값 처리 개선 (빈 문자열 ''도 'published'로 처리되는 문제 방지)
    const newStatus = status === 'draft' ? 'draft' : 'published';

    // 6. 이미지 처리
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
              uploadedBy: firebaseUid,
              cohortId,
            },
          },
        });

        // Public URL 생성
        await file.makePublic();
        imageUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
      } catch (error) {

        return NextResponse.json(
          { error: '이미지 업로드에 실패했습니다' },
          { status: 500 }
        );
      }
    }

    // 8. 공지 업데이트
    const updateData: Record<string, any> = {
      cohortId,
      author: APP_CONSTANTS.ADMIN_NAME, // 항상 "필립앤소피"로 고정
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

    // 7. draft → published로 변경된 경우 수동 푸시 알림 필요
    const shouldSendNotification = oldStatus === 'draft' && newStatus === 'published';

    if (shouldSendNotification) {

    }

    return NextResponse.json({
      success: true,
      noticeId,
      statusChanged: oldStatus !== newStatus,
      published: newStatus === 'published',
    });
  } catch (error) {

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

    // 1. 인증 및 권한 확인 (Firestore participant 기반)
    const { participant, error } = await requireAuthToken(request);
    if (error) return error;

    // 2. Firebase Admin 초기화
    const { db } = getFirebaseAdmin();

    // 3. 공지 삭제
    await db.collection('notices').doc(noticeId).delete();

    return NextResponse.json({ success: true });
  } catch (error) {

    return NextResponse.json(
      { error: '공지 삭제 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
