# Push Notification Helpers Architecture

**Last Updated**: 2025-10-21
**Status**: ✅ Production Ready

## Overview

Unified push notification helper system that provides consistent status detection across all platforms (FCM + Web Push) with proper server/client separation for Next.js 15.

---

## File Structure

```
src/lib/push/
├── helpers.ts           # Server-safe helpers (no 'use client')
└── client-helpers.ts    # Client-only helpers (uses 'use client')
```

### helpers.ts (Server-Safe)

**Purpose**: Core logic that works in both server and client contexts
**Usage**: Can be imported from API routes, Server Components, and Client Components
**Key Feature**: No browser APIs, no logger (pure functions)

**Functions**:
- `hasAnyPushSubscription(data)` - Check if ANY device has push enabled
- `isPushEnabledForDevice(data, deviceId)` - Check if SPECIFIC device has push
- `getEnabledPushDevices(data)` - Get list of all enabled deviceIds
- `getPushSubscriptionStats(data)` - Get push subscription statistics
- `isPushTokenRecent(updatedAt, maxAgeDays)` - Validate token freshness

### client-helpers.ts (Client-Only)

**Purpose**: Browser-specific utilities
**Usage**: Import from Client Components and hooks ONLY
**Key Feature**: Uses localStorage, navigator, window APIs

**Functions**:
- `isPushEnabledForCurrentDevice(data)` - Check if THIS browser has push enabled
- `getCurrentDeviceId()` - Get deviceId from localStorage

---

## Data Model

### Participant Push Fields

```typescript
interface Participant {
  // Modern arrays (multi-device support)
  pushTokens?: PushTokenEntry[];              // FCM tokens
  webPushSubscriptions?: WebPushSubscriptionData[]; // Web Push subscriptions

  // Legacy fields (backward compatibility)
  pushToken?: string;                         // DEPRECATED: Single FCM token
  pushTokenUpdatedAt?: Timestamp;             // DEPRECATED

  // User preference
  pushNotificationEnabled?: boolean;          // User's ON/OFF toggle
}
```

### Priority Rules

```
1. pushTokens[] (FCM multi-device) - Check first
2. webPushSubscriptions[] (Web Push multi-device) - Check second
3. pushToken (legacy single token) - Fallback ONLY if arrays don't exist
```

**Important**: If arrays exist but are empty, do NOT fallback to `pushToken`. This indicates data migration is complete.

---

## Usage Examples

### Server Context (API Route)

```typescript
// src/app/api/datacntr/stats/overview/route.ts
import { hasAnyPushSubscription } from '@/lib/push/helpers';

export async function GET(request: NextRequest) {
  const participantsSnapshot = await db.collection('participants').get();

  const pushEnabledCount = participantsSnapshot.docs.filter((doc) => {
    const data = doc.data();
    return hasAnyPushSubscription(data);
  }).length;

  return NextResponse.json({ pushEnabledCount });
}
```

### Client Context (Component)

```typescript
// src/components/NotificationToggle.tsx
'use client';

import { getDeviceId } from '@/lib/firebase/messaging';
import { isPushEnabledForDevice } from '@/lib/push/helpers';
import { doc, getDoc } from 'firebase/firestore';
import { getDb } from '@/lib/firebase/client';

const checkNotificationStatus = async (participantId: string) => {
  const deviceId = getDeviceId(); // Client-side deviceId
  const participantRef = doc(getDb(), 'participants', participantId);
  const participantSnap = await getDoc(participantRef);

  const data = participantSnap.data();
  const isPushEnabled = isPushEnabledForDevice(data, deviceId);

  setIsEnabled(isPushEnabled);
};
```

---

## Platform Support

| Platform | Method | Array Field | deviceId Source |
|----------|--------|-------------|-----------------|
| Android Chrome | FCM | `pushTokens[]` | localStorage |
| Desktop Chrome/Edge/Firefox | FCM | `pushTokens[]` | localStorage |
| iOS Safari 16.4+ | Web Push | `webPushSubscriptions[]` | localStorage |
| Desktop Safari | Web Push | `webPushSubscriptions[]` | localStorage |

---

## Device Identification

### deviceId Format

```
{timestamp}-{hash}-{random}
Example: 1729512345678-1234567890-a1b2c3d
```

### Generation Logic

```typescript
// src/lib/firebase/messaging.ts
function generateDeviceId(): string {
  // 1. Check localStorage first
  const existingId = localStorage.getItem('device-id');
  if (existingId) return existingId;

  // 2. Create fingerprint from UA + screen + timezone + language
  const fingerprint = `${navigator.userAgent}-${screen.width}x${screen.height}x${screen.colorDepth}-${timezone}-${language}`;

  // 3. Hash and combine with timestamp + random
  const hash = /* simple hash algorithm */;
  const deviceId = `${Date.now()}-${Math.abs(hash)}-${random()}`;

  // 4. Store in localStorage
  localStorage.setItem('device-id', deviceId);

  return deviceId;
}
```

---

## Multi-Device Support

### Example Firestore Document

```json
{
  "id": "user123",
  "name": "John Doe",
  "pushNotificationEnabled": true,

  // Device 1: Desktop Chrome (FCM)
  "pushTokens": [
    {
      "deviceId": "1729512345678-1234567890-a1b2c3d",
      "token": "fcm_token_desktop_...",
      "updatedAt": "2025-10-21T10:00:00Z",
      "userAgent": "Mozilla/5.0 (Windows NT 10.0) Chrome/120.0"
    }
  ],

  // Device 2: iPhone (Web Push)
  "webPushSubscriptions": [
    {
      "deviceId": "1729523456789-9876543210-d4e5f6g",
      "endpoint": "https://web.push.apple.com/...",
      "keys": {
        "p256dh": "...",
        "auth": "..."
      },
      "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari/604.1",
      "createdAt": "2025-10-21T11:00:00Z"
    }
  ]
}
```

### How It Works

1. **Device 1 enables push** → FCM token added to `pushTokens[]` with deviceId A
2. **Device 2 enables push** → Web Push subscription added to `webPushSubscriptions[]` with deviceId B
3. **Device 1 disables push** → Entry with deviceId A removed from `pushTokens[]`
4. **Device 2 still receives push** → Web Push subscription with deviceId B remains active

---

## Testing Checklist

### Server-Side Tests

- [ ] Import `hasAnyPushSubscription` from API route (no build error)
- [ ] Import `isPushEnabledForDevice` from Server Component (no build error)
- [ ] Verify statistics count includes both FCM and Web Push users

### Client-Side Tests

- [ ] iOS Safari: Web Push ON → `isPushEnabledForDevice` returns `true`
- [ ] Android Chrome: FCM ON → `isPushEnabledForDevice` returns `true`
- [ ] Multi-device: Both devices ON → Both deviceIds in Firestore
- [ ] Single device OFF → Only that deviceId removed
- [ ] Legacy migration: User with old `pushToken` → Detected correctly

---

## Migration Path

### From Legacy to Modern

**Before** (Old code):
```typescript
// ❌ Duplicated logic in multiple files
function hasToken(data: any): boolean {
  return !!data.pushToken;
}
```

**After** (New code):
```typescript
// ✅ Single source of truth
import { hasAnyPushSubscription } from '@/lib/push/helpers';

const enabled = hasAnyPushSubscription(data);
```

### Files Updated

1. `src/app/api/datacntr/stats/overview/route.ts` - Removed duplicate function
2. `src/components/NotificationToggle.tsx` - Uses `isPushEnabledForDevice`
3. Future: `src/hooks/use-push-notifications.ts` - Can use helpers

---

## Troubleshooting

### Build Error: "use client" in Server Component

**Symptom**: Next.js error when importing from API route

**Solution**: Make sure you're importing from `helpers.ts` (server-safe), NOT `client-helpers.ts`

```typescript
// ✅ Correct
import { hasAnyPushSubscription } from '@/lib/push/helpers';

// ❌ Wrong
import { isPushEnabledForCurrentDevice } from '@/lib/push/client-helpers';
```

### localStorage Not Available

**Symptom**: `localStorage.getItem()` throws error

**Solution**: Use `getDeviceId()` from `@/lib/firebase/messaging` (has try-catch)

```typescript
// ✅ Safe
import { getDeviceId } from '@/lib/firebase/messaging';
const deviceId = getDeviceId();

// ❌ Unsafe
const deviceId = localStorage.getItem('device-id');
```

### Push Enabled But Notification Not Received

**Symptom**: Firestore shows token but no notification arrives

**Checklist**:
1. Check `pushNotificationEnabled` flag
2. Verify token `updatedAt` is recent (< 30 days)
3. Check if `deviceId` matches current browser
4. Test both FCM and Web Push channels

---

## Performance Considerations

### Firestore Read Optimization

**Problem**: Checking push status requires Firestore read

**Solution**: Cache participant data in React Query

```typescript
// src/hooks/use-participant.ts
export function useParticipant(participantId: string) {
  return useQuery({
    queryKey: ['participant', participantId],
    queryFn: () => getParticipantById(participantId),
    staleTime: 60000, // 1 minute
    cacheTime: 300000, // 5 minutes
  });
}
```

### Array Iteration Cost

**Problem**: `hasAnyPushSubscription` iterates over arrays

**Analysis**:
- Typical user: 1-3 devices
- Array length: 1-3 items
- Cost: Negligible (< 1ms)

**Optimization**: Not needed unless users have > 10 devices

---

## Security Considerations

### deviceId Stability

**Concern**: deviceId can be regenerated (localStorage clear)

**Impact**: User may need to re-enable push on that device

**Mitigation**:
- Store deviceId on first visit
- Prompt re-enable if `isPushEnabledForDevice` returns `false`

### Token Expiration

**FCM**: Tokens can expire after ~70 days of inactivity
**Web Push**: iOS tokens expire after 7-14 days

**Solution**: Implemented in `autoRefreshPushToken` (7-day check)

---

## Future Enhancements

1. **Admin Dashboard**: Show push-enabled device count per user
2. **Device Management**: Allow users to view/remove registered devices
3. **Push Analytics**: Track delivery rates by platform (FCM vs Web Push)
4. **Stale Token Cleanup**: Background job to remove expired tokens

---

## References

- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Web Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Next.js Server/Client Components](https://nextjs.org/docs/app/building-your-application/rendering/composition-patterns)

---

*Last Updated: 2025-10-21*
*Maintained by: Development Team*
