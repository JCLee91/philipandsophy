/**
 * Web Push Subscriptions API
 *
 * POST   /api/push-subscriptions - Save Web Push subscription
 * DELETE /api/push-subscriptions - Remove Web Push subscription
 */

import { NextRequest, NextResponse } from 'next/server';
import { admin, getAdminDb } from '@/lib/firebase/admin';
import { requireWebAppAuth } from '@/lib/api-auth';

// Admin SDK용 WebPushSubscriptionData 타입 (서버 전용)
interface WebPushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  deviceId: string;
  userAgent: string;
  createdAt: FirebaseFirestore.Timestamp;
  lastUsedAt?: FirebaseFirestore.Timestamp;
}

/**
 * POST - Save Web Push subscription
 *
 * Body: {
 *   participantId: string;
 *   subscription: PushSubscription (toJSON() format);
 *   deviceId: string;
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireWebAppAuth(request);
    if ('error' in authResult && authResult.error) {
      return authResult.error;
    }

    const { user } = authResult;
    const body = await request.json();
    const { participantId, subscription, deviceId, type } = body;

    // Validate input
    if (!participantId || !subscription || !deviceId) {
      return NextResponse.json(
        { error: 'Missing required fields: participantId, subscription, deviceId' },
        { status: 400 }
      );
    }

    if (participantId !== user.id) {
      return NextResponse.json(
        { error: 'You are not authorized to modify this participant.' },
        { status: 403 }
      );
    }

    // Validate subscription format
    if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return NextResponse.json(
        { error: 'Invalid subscription format' },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const participantRef = db.collection('participants').doc(participantId);

    // Get current participant data
    const participantSnap = await participantRef.get();
    if (!participantSnap.exists) {
      return NextResponse.json(
        { error: 'Participant not found' },
        { status: 404 }
      );
    }

    // ✅ 단순화: 기존 구독 전부 삭제, 현재 구독만 저장
    const newSubscription: WebPushSubscriptionData = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      deviceId,
      userAgent: request.headers.get('user-agent') || 'Unknown',
      createdAt: admin.firestore.Timestamp.now(),
      lastUsedAt: admin.firestore.Timestamp.now(),
    };

    // ✅ 배열에 1개만 (기존 전부 대체)
    await participantRef.update({
      webPushSubscriptions: [newSubscription],
      pushNotificationEnabled: true,
    });

    return NextResponse.json({
      success: true,
      message: 'Web Push subscription saved',
      subscription: newSubscription,
    });
  } catch (error) {
    console.error('[API] Error saving Web Push subscription:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Remove Web Push subscription
 *
 * Body: {
 *   participantId: string;
 *   deviceId: string;
 *   subscriptionEndpoint?: string;
 * }
 */
export async function DELETE(request: NextRequest) {
  try {
    // CRITICAL: Authentication is REQUIRED (prevent unauthorized deletion)
    const authResult = await requireWebAppAuth(request);
    if ('error' in authResult && authResult.error) {
      return authResult.error;
    }

    const { user } = authResult;
    const body = await request.json();
    const { participantId, deviceId, subscriptionEndpoint } = body;

    // Validate input
    if (!participantId || !deviceId) {
      return NextResponse.json(
        { error: 'Missing required fields: participantId, deviceId' },
        { status: 400 }
      );
    }

    // Check authorization (must be same user)
    if (participantId !== user.id) {
      return NextResponse.json(
        { error: 'You are not authorized to modify this participant.' },
        { status: 403 }
      );
    }

    const db = getAdminDb();
    const participantRef = db.collection('participants').doc(participantId);

    // Get current participant data
    const participantSnap = await participantRef.get();
    if (!participantSnap.exists) {
      return NextResponse.json(
        { error: 'Participant not found' },
        { status: 404 }
      );
    }

    // ✅ 단순화: 모든 토큰/구독 완전 삭제
    await participantRef.update({
      pushTokens: [],
      webPushSubscriptions: [],
      pushNotificationEnabled: false,
      pushToken: admin.firestore.FieldValue.delete(),
      pushTokenUpdatedAt: admin.firestore.FieldValue.delete(),
    });

    return NextResponse.json({
      success: true,
      message: 'Web Push subscription removed',
    });
  } catch (error) {
    console.error('[API] Error removing Web Push subscription:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
