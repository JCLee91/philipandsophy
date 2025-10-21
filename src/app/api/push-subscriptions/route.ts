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

    const currentData = participantSnap.data() || {};
    const existingTokens = currentData.pushTokens || [];

    // Filter out existing tokens for this device
    const tokensForOtherDevices = existingTokens.filter(
      (entry: any) => entry.deviceId !== deviceId
    );

    // Create new token entry for Web Push
    const newTokenEntry = {
      deviceId,
      type: type || 'webpush', // Default to webpush if not specified
      token: subscription.endpoint, // Use endpoint as token for Web Push
      updatedAt: admin.firestore.Timestamp.now(),
      userAgent: request.headers.get('user-agent') || 'Unknown',
      lastUsedAt: admin.firestore.Timestamp.now(),
      // Store Web Push keys in metadata
      webPushKeys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    };

    // Update with new tokens array
    await participantRef.update({
      pushTokens: [...tokensForOtherDevices, newTokenEntry],
      pushNotificationEnabled: true,
    });

    return NextResponse.json({
      success: true,
      message: 'Web Push subscription saved',
      tokenEntry: newTokenEntry,
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
    // Make authentication optional for DELETE
    const authHeader = request.headers.get('authorization');
    let authenticatedUser = null;

    if (authHeader?.startsWith('Bearer ')) {
      // Try to authenticate if token is provided
      const authResult = await requireWebAppAuth(request);
      if (!('error' in authResult) || !authResult.error) {
        authenticatedUser = authResult.user;
      }
      // Continue even if authentication fails (optional auth)
    }

    const body = await request.json();
    const { participantId, deviceId, subscriptionEndpoint } = body;

    // Validate input
    if (!participantId || !deviceId) {
      return NextResponse.json(
        { error: 'Missing required fields: participantId, deviceId' },
        { status: 400 }
      );
    }

    // Check authorization only if authenticated
    if (authenticatedUser && participantId !== authenticatedUser.id) {
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
    const existingTokens = currentData.pushTokens || [];

    // Filter out tokens for this device
    const tokensForOtherDevices = existingTokens.filter(
      (entry: any) => entry.deviceId !== deviceId
    );

    // Check if token was removed
    if (tokensForOtherDevices.length === existingTokens.length) {
      return NextResponse.json(
        { error: 'No push token found for this device' },
        { status: 404 }
      );
    }

    // Update with remaining tokens
    const updates: any = {
      pushTokens: tokensForOtherDevices,
      pushNotificationEnabled: tokensForOtherDevices.length > 0,
    };

    // Clean up legacy fields if no tokens remain
    if (tokensForOtherDevices.length === 0) {
      updates.pushToken = admin.firestore.FieldValue.delete();
      updates.pushTokenUpdatedAt = admin.firestore.FieldValue.delete();
    }

    await participantRef.update(updates);

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
