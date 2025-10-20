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
    const { participantId, subscription, deviceId } = body;

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

    const currentData = participantSnap.data() || {};
    const existingSubscriptions: WebPushSubscriptionData[] =
      currentData.webPushSubscriptions || [];

    // Check if subscription already exists for this device
    const existingSubscription = existingSubscriptions.find(
      (sub) => sub.deviceId === deviceId
    );

    // Create new subscription entry
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

    // Remove old subscription if exists
    if (existingSubscription) {
      await participantRef.update({
        webPushSubscriptions: admin.firestore.FieldValue.arrayRemove(existingSubscription),
      });
    }

    // Add new subscription
    await participantRef.update({
      webPushSubscriptions: admin.firestore.FieldValue.arrayUnion(newSubscription),
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

    const currentData = participantSnap.data() || {};
    const existingSubscriptions: WebPushSubscriptionData[] =
      currentData.webPushSubscriptions || [];

    // Find subscription to remove
    let subscriptionToRemove = existingSubscriptions.find(
      (sub) => sub.deviceId === deviceId
    );

    if (!subscriptionToRemove && subscriptionEndpoint) {
      subscriptionToRemove = existingSubscriptions.find(
        (sub) => sub.endpoint === subscriptionEndpoint
      );
    }

    if (!subscriptionToRemove) {
      return NextResponse.json(
        { error: 'Subscription not found for this device' },
        { status: 404 }
      );
    }

    // Remove subscription
    await participantRef.update({
      webPushSubscriptions: admin.firestore.FieldValue.arrayRemove(subscriptionToRemove),
    });

    // Check if any subscriptions remain
    const refreshedSnap = await participantRef.get();
    const refreshedData = refreshedSnap.data() || {};
    const remainingSubscriptions: WebPushSubscriptionData[] =
      refreshedData.webPushSubscriptions || [];
    const remainingTokens: any[] = refreshedData.pushTokens || [];

    // If no subscriptions remain, disable push notifications
    if (remainingSubscriptions.length === 0) {
      if (remainingTokens.length === 0) {
        await participantRef.update({
          pushNotificationEnabled: false,
          pushToken: admin.firestore.FieldValue.delete(),
          pushTokenUpdatedAt: admin.firestore.FieldValue.delete(),
        });
      }
    }

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
