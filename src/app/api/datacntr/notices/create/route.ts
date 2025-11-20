import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase/admin-init';
import { requireAuthToken } from '@/lib/api-auth';
import { APP_CONSTANTS } from '@/constants/app';
import * as admin from 'firebase-admin';

/**
 * POST /api/datacntr/notices/create
 * 공지사항 작성
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 인증 및 권한 확인 (Firestore participant 기반)
    const { participant, firebaseUid, error } = await requireAuthToken(request);
    if (error) return error;

    // 2. FormData 파싱
    const formData = await request.formData();
    const cohortId = formData.get('cohortId') as string;
    const title = formData.get('title') as string;
    const content = formData.get('content') as string;
    const status = formData.get('status') as 'draft' | 'published' | 'scheduled';
    const scheduledAtStr = formData.get('scheduledAt') as string;
    const imageFile = formData.get('image') as File | null;
    const templateImageUrl = formData.get('templateImageUrl') as string; // ✅ 템플릿에서 가져온 이미지 URL

    // 3. 필수 필드 검증
    if (!cohortId || !content) {
      return NextResponse.json(
        { error: '필수 항목이 누락되었습니다.' },
        { status: 400 }
      );
    }

    // 4. Firebase Admin 초기화
    const { db, bucket } = getFirebaseAdmin();

    // 5. 이미지 처리
    let imageUrl = templateImageUrl || undefined; // ✅ 템플릿에서 가져온 이미지 URL 사용

    // ✅ 새로 업로드한 이미지가 있으면 업로드 처리
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

    // 6. 공지 생성
    const noticeData: any = {
      cohortId,
      author: APP_CONSTANTS.ADMIN_NAME, // 항상 "필립앤소피"로 고정
      content: content.trim(),
      status: status || 'published',
      isCustom: true,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
      ...(imageUrl && { imageUrl }),
    };

    if (title) {
      noticeData.title = title.trim();
    }

    // 예약 발행 처리
    if (status === 'scheduled' && scheduledAtStr) {
      noticeData.scheduledAt = admin.firestore.Timestamp.fromDate(new Date(scheduledAtStr));
    }

    const noticeRef = await db.collection('notices').add(noticeData);

    return NextResponse.json({
      success: true,
      noticeId: noticeRef.id,
    });
  } catch (error) {
    console.error('Error creating notice:', error);
    return NextResponse.json(
      { error: '공지 작성 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
