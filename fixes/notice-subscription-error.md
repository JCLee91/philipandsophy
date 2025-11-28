# Notice Subscription Error Fix

## Issue
When refreshing the page, especially in Admin Mode or after returning to it, users encountered "FirebaseError: Missing or insufficient permissions" logs.
- `Notice subscription error`
- `Error fetching conversations`

## Root Cause
The `useNoticesByCohort` hook had a bug where the `useEffect` responsible for setting up the real-time subscription ignored the `enabled` option passed to it.

```typescript
// Before
useEffect(() => {
  if (!cohortId) return undefined; // Ignored enabled!
  // ... subscription ...
}, [cohortId, queryClient]);
```

In `ChatClientView`, `useNoticesByCohort` is called with `enabled: !!cohortId && !!participant`.
On page refresh:
1. `cohortId` is available immediately (from URL/props).
2. `participant` is loading (from `useAuth`).
3. `enabled` is `false`.
4. But `useEffect` fired anyway because `cohortId` was present.
5. The subscription attempted to connect to Firestore before the Firebase Auth token was fully restored/ready.
6. Firestore Rules rejected the request (`request.auth` was null), causing the permission error.

## Solution
Updated `src/hooks/use-notices.ts` to respect the `enabled` option in the subscription effect.

```typescript
// After
const enabled = options?.enabled ?? !!cohortId;

useEffect(() => {
  if (!cohortId || !enabled) return undefined; // Check enabled
  // ... subscription ...
}, [cohortId, queryClient, enabled]);
```

This ensures the subscription only happens when the user is authenticated and the participant data is loaded.

