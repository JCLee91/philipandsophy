# Push Notifications Setup Guide

**Last Updated**: 2025-10-12
**Category**: setup

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

## Step 2: Add VAPID Key to Environment Variables

Add the following to your `.env.local` file:

```env
# FCM VAPID Key for Web Push
NEXT_PUBLIC_FCM_VAPID_KEY=YOUR_VAPID_KEY_HERE
```

**Example:**
```env
NEXT_PUBLIC_FCM_VAPID_KEY=BMxY7Zq3...rest_of_the_key
```

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
