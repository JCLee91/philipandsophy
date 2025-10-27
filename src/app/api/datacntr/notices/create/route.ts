import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin, getAdminAuth } from '@/lib/firebase/admin-init';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { logger } from '@/lib/logger';

/**
 * POST /api/datacntr/notices/create
 * 공지사항 작성
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 인증 확인
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    let decodedToken: DecodedIdToken;

    try {
      // ✅ getAdminAuth()를 사용하여 Admin 자동 초기화
      const adminAuth = getAdminAuth();
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (error) {
      logger.error('ID 토큰 검증 실패 (notices-create-api)', error);
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

    // 4. 필수 필드 검증
    if (!cohortId || !content) {
      return NextResponse.json(
        { error: '기수와 내용은 필수 항목입니다' },
        { status: 400 }
      );
    }

    // 5. Firebase Admin 초기화
    const { db, bucket } = getFirebaseAdmin();

    // 6. 작성자 정보 조회
    const participantsSnapshot = await db
      .collection('participants')
      .where('firebaseUid', '==', decodedToken.uid)
      .limit(1)
      .get();

    if (participantsSnapshot.empty) {
      return NextResponse.json(
        { error: '참여자 정보를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    const authorName = participantsSnapshot.docs[0].data().name || '운영자';

    // 7. 이미지 업로드 (있는 경우)
    let imageUrl: string | undefined;

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
        logger.error('이미지 업로드 실패 (notices-create-api)', error);
        return NextResponse.json(
          { error: '이미지 업로드에 실패했습니다' },
          { status: 500 }
        );
      }
    }

    // 8. 공지 생성
    const finalStatus = status || 'published';
    const noticeData = {
      cohortId,
      author: authorName,
      content: content.trim(),
      status: finalStatus, // draft or published
      isCustom: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...(imageUrl && { imageUrl }),
    };

    const noticeRef = await db.collection('notices').add(noticeData);

    logger.info('공지 작성 완료', {
      noticeId: noticeRef.id,
      cohortId,
      author: authorName,
      status: finalStatus,
      isDraft: finalStatus === 'draft',
      hasImage: !!imageUrl,
      willTriggerPush: finalStatus !== 'draft',
    });

    return NextResponse.json({
      success: true,
      noticeId: noticeRef.id,
    });
  } catch (error) {
    logger.error('공지 작성 API 오류', error);
    return NextResponse.json(
      { error: '공지 작성 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
