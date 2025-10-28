/**
 * Custom Push Notification API
 * Data Center에서 관리자가 직접 보내는 커스텀 알림
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/admin/notifications/custom
 *
 * 관리자가 특정 참가자들에게 커스텀 푸시 알림 전송
 *
 * Request Body:
 * {
 *   "cohortId": "1",  // 대상 코호트 ID (optional - participantIds와 함께 사용 안함)
 *   "participantIds": ["admin", "user1"],  // 대상 참가자 ID 배열 (optional)
 *   "title": "커스텀 알림 제목",
 *   "body": "커스텀 알림 내용",
 *   "route": "/app/chat",  // 클릭 시 이동 경로
 *   "type": "custom"  // 알림 타입
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // 🔒 환경변수 검증 (배포 시 필수)
    if (!process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_URL) {

      return NextResponse.json(
        {
          error: 'Server configuration error',
          message: 'Firebase Functions URL is not configured. Please contact administrator.',
          code: 'MISSING_FUNCTIONS_URL',
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { cohortId, participantIds, title, body: notificationBody, route, type, includeAdmins = true } = body;

    // Validate required fields
    if (!title || !notificationBody || !route || !type) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          message: 'title, body, route, and type are required',
        },
        { status: 400 }
      );
    }

    // Must provide either cohortId or participantIds
    if (!cohortId && (!participantIds || participantIds.length === 0)) {
      return NextResponse.json(
        {
          error: 'Missing recipients',
          message: 'Either cohortId or participantIds must be provided',
        },
        { status: 400 }
      );
    }

    // Get Firebase ID token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'Authorization header with Bearer token is required',
        },
        { status: 401 }
      );
    }

    // Call Firebase Functions endpoint
    const functionsUrl = `${process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_URL}/sendCustomNotification`;

    const response = await fetch(functionsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader, // Forward Firebase ID token
      },
      body: JSON.stringify({
        cohortId,
        participantIds,
        title,
        body: notificationBody,
        route,
        type,
        includeAdmins,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        {
          error: 'Failed to send custom notifications',
          message: errorData.message || 'Unknown error',
        },
        { status: response.status }
      );
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      totalRecipients: result.totalRecipients,
      totalFCM: result.totalFCM,
      totalWebPush: result.totalWebPush,
      notificationsSent: result.notificationsSent,
      title,
      type,
    });
  } catch (error) {

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
