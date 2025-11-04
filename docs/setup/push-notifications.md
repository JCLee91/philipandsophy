# Push Notifications Setup Guide

**Last Updated**: 2025-11-04
**Category**: setup

**⚠️ Important**: This document covers basic FCM setup. For complete iOS PWA Web Push implementation (dual-strategy), see [Web Push Implementation Guide](./web-push-implementation.md).

## Overview

This document provides step-by-step instructions for setting up PWA push notifications using Firebase Cloud Messaging (FCM).

## Prerequisites

- Firebase project already configured
- Firebase Admin SDK service account JSON file

## Step 1: Generate VAPID Key

### Via Firebase Console (Recommended)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **philipandsophy**
3. Navigate to **Project Settings** (⚙️ icon)
4. Click on **Cloud Messaging** tab
5. Scroll to **Web Push certificates** section
6. Click **Generate key pair** button
7. Copy the generated key (starts with `B...`)

### Via Firebase CLI (Alternative)

```bash
# Install Firebase CLI if not installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Generate VAPID key
firebase projects:list
# Then use the web interface as shown above
```

## Step 2: Add VAPID Keys to Environment Variables

### Next.js (.env.local)

```env
# Firebase FCM VAPID public key (Android / Desktop)
# Get from Firebase Console → Project Settings → Cloud Messaging → Web Push certificates
NEXT_PUBLIC_FCM_VAPID_KEY=BNrl2wjTDPpeSG2d8oIHzz5sfvOkeCXSpqjlldrZz1d1AqsvbBlFezEXLKk2Ewkpfj3nq5Y8Qt6IvyoxzoOyhQg

# Standard Web Push VAPID public key (iOS PWA 포함)
# Generate with: npx web-push generate-vapid-keys
NEXT_PUBLIC_WEBPUSH_VAPID_KEY=BLuDF-xf1T6QMG0p_gZbYq1CSps7cK2zXp8KFIQ6jqg_6bJQFneMoG6CK0WDEQSkUSynUTgZJnxdhxvu67Fz2LY

# Web Push Private Key (Server-Side Only - NEVER expose to client)
WEBPUSH_VAPID_PRIVATE_KEY=tLN-WnLtCrKKj5ShI9PnJgEgtd5dX2WMNc2v2DB0hRY
```

**환경 변수 설명**:
- `NEXT_PUBLIC_FCM_VAPID_KEY`: Firebase 제공 VAPID 키 (Android/Desktop)
- `NEXT_PUBLIC_WEBPUSH_VAPID_KEY`: 표준 Web Push 공개키 (iOS Safari + All)
- `WEBPUSH_VAPID_PRIVATE_KEY`: Web Push 비공개키 (서버 전용, 절대 노출 금지)

### Firebase Functions (로컬 + 프로덕션)

`functions/.env` 파일에 동일한 키 설정:

```env
# functions/.env (local development only)
WEBPUSH_VAPID_PUBLIC_KEY=BLuDF-xf1T6QMG0p_gZbYq1CSps7cK2zXp8KFIQ6jqg_6bJQFneMoG6CK0WDEQSkUSynUTgZJnxdhxvu67Fz2LY
WEBPUSH_VAPID_PRIVATE_KEY=tLN-WnLtCrKKj5ShI9PnJgEgtd5dX2WMNc2v2DB0hRY
```

Firebase 프로덕션 배포 시 런타임 환경 변수 설정:

```bash
cd functions

# Set VAPID keys for production
firebase functions:config:set \
  webpush.vapid_public_key="BLuDF-xf1T6QMG0p_gZbYq1CSps7cK2zXp8KFIQ6jqg_6bJQFneMoG6CK0WDEQSkUSynUTgZJnxdhxvu67Fz2LY" \
  webpush.vapid_private_key="tLN-WnLtCrKKj5ShI9PnJgEgtd5dX2WMNc2v2DB0hRY"

# Verify configuration
firebase functions:config:get

# Deploy functions to apply config
firebase deploy --only functions
```

> 🔁 **중요**: Next.js와 Firebase Functions가 동일한 VAPID 키 쌍을 사용해야
> `webpush.sendNotification`와 클라이언트 구독이 정상 동작합니다.

**참고**:
- Firebase FCM VAPID 키와 표준 Web Push VAPID 키는 **다른 키**입니다
- FCM VAPID: Firebase Console에서 생성
- Web Push VAPID: `npx web-push generate-vapid-keys`로 생성

## Step 3: Verify Firebase Admin Setup

Make sure `firebase-service-account.json` exists in the project root:

```json
{
  "type": "service_account",
  "project_id": "philipandsophy",
  "private_key_id": "...",
  "private_key": "...",
  "client_email": "...",
  "client_id": "...",
  "auth_uri": "...",
  "token_uri": "...",
  "auth_provider_x509_cert_url": "...",
  "client_x509_cert_url": "..."
}
```

## Step 4: Test Push Notifications

### Development Testing

```bash
# Start dev server
npm run dev

# Open browser and check:
# 1. Service worker registered
# 2. Push permission requested
# 3. Push token saved to Firestore
```

### Browser DevTools Inspection

**Chrome DevTools:**
1. Open DevTools (F12)
2. Go to **Application** tab
3. Check **Service Workers** section
4. Check **Manifest** section
5. Check **Push Messaging** in Console

**Test Push Notification:**
```javascript
// In browser console
const messaging = firebase.messaging();
const token = await messaging.getToken({
  vapidKey: 'YOUR_VAPID_KEY'
});
console.log('Push Token:', token);
```

## Step 5: Send Test Push from Firebase Console

1. Go to **Firebase Console** > **Cloud Messaging**
2. Click **Send your first message**
3. Enter notification title and text
4. Click **Send test message**
5. Enter FCM registration token
6. Click **Test**

## Troubleshooting

### Issue: "Messaging: This browser doesn't support the API's required to use the Firebase SDK"

**Solution**: Make sure you're using HTTPS or localhost.

### Issue: "Permission denied"

**Solution**: Clear site permissions and request again.

### Issue: "Service worker registration failed"

**Solution**: Check `firebase-messaging-sw.js` is in the `public/` folder.

### Issue: "Push token not generated"

**Solution**:
1. Verify VAPID key is correct
2. Check Firebase config in `.env.local`
3. Ensure service worker is registered
4. Check browser console for errors

## Platform-Specific Notes

### Android
- ✅ Works perfectly in Chrome, Edge, Samsung Internet
- ✅ Background notifications supported
- ✅ No special setup required

### iOS (16.4+)
- ⚠️ Only works for PWA added to home screen
- ⚠️ Push subscription expires after 1-2 weeks
- ⚠️ Automatic re-subscription required
- ⚠️ Safari browser: NOT supported

### Desktop
- ✅ Chrome, Edge, Firefox: Full support
- ✅ Safari (macOS): Supported with limitations

## Security Considerations

- Never commit `firebase-service-account.json` to Git
- Keep VAPID keys in environment variables
- Use HTTPS in production
- Validate push tokens before sending notifications

## Next Steps

After completing setup:
1. Test DM notifications
2. Test notice notifications
3. Test matching result notifications
4. Monitor push delivery rate
5. Implement iOS re-subscription logic

---

*For implementation details, see the main codebase files in `src/lib/firebase/messaging.ts`*
