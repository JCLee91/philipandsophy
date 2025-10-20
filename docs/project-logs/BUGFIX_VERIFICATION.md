# Mobile Race Condition Bug Fix - Verification Guide

**Date**: 2025-10-12
**Bug**: Participant list shows on desktop but NOT on mobile browser
**Root Cause**: `notifyOnChangeProps: ['data', 'error']` prevented re-render when data loaded
**Files Changed**:
- `src/hooks/use-participants.ts` (line 79-80)
- `src/components/admin/ParticipantAssignmentTable.tsx` (line 20)

---

## Root Cause Analysis

### The Race Condition Flow

**Mobile (Slow Network - 500ms)**:
```
1. Page loads → useEffect runs synchronously
   ├─ confirmedResult loaded from localStorage ✅
   ├─ matchingState = 'confirmed' ✅
   └─ useMemo runs → cohortParticipants = [] ❌ (React Query not started yet)
       └─ assignmentRows = [] ❌

2. 500ms later → useParticipantsByCohort completes
   ├─ cohortParticipants = [...participants] ✅
   └─ notifyOnChangeProps: ['data', 'error'] 🔴
       └─ Component doesn't re-render! ❌
           └─ useMemo never recalculates ❌
               └─ Table shows empty! ❌
```

**Desktop (Fast Network - 10ms)**:
```
1. Page loads → useEffect runs synchronously
   ├─ confirmedResult loaded from localStorage ✅
   └─ matchingState = 'confirmed' ✅

2. 10ms later → useParticipantsByCohort completes BEFORE first render
   ├─ cohortParticipants = [...participants] ✅
   └─ useMemo runs → assignmentRows calculated ✅
       └─ Table shows data! ✅
```

### The Bug

**File**: `src/hooks/use-participants.ts` (line 80)

```typescript
// ❌ BEFORE (Buggy)
notifyOnChangeProps: ['data', 'error'],  // Prevents isLoading updates
```

This optimization told React Query to **only trigger re-renders when `data` or `error` change**, but NOT when `isLoading` changes. This created a timing issue:

1. First render: `cohortParticipants = []`, `isLoading = true`
2. Data loads: `cohortParticipants = [...]`, `isLoading = false`
3. React Query: "Only `data` changed, but `notifyOnChangeProps` says don't notify!"
4. Component: Never re-renders, `useMemo` never recalculates
5. Result: Empty table forever

### The Fix

```typescript
// ✅ AFTER (Fixed)
// ✅ FIX: notifyOnChangeProps 제거하여 데이터 로드 완료 시 리렌더링 보장
// 이전 설정은 모바일에서 cohortParticipants가 로드되어도 assignmentRows useMemo가 재실행되지 않는 버그 발생
```

Now React Query triggers re-render when data arrives, ensuring `useMemo` recalculates `assignmentRows`.

---

## Verification Steps

### 1. Mobile Browser Testing (Primary)

**Device**: Real iOS/Android device or DevTools mobile emulation

**Steps**:
1. Open `/app/admin/matching?cohort=winter2025-0`
2. **Clear cache**: Hard refresh (iOS: Settings → Safari → Clear History)
3. **Throttle network**: DevTools → Network → Slow 3G
4. Observe loading sequence:
   - ✅ "프로필북 현황" card should show immediately
   - ✅ "총 0명" → then update to "총 N명" within 1-2 seconds
   - ✅ Table rows should appear with participant names
   - ✅ No infinite loading spinner

**Expected Result**: Table shows participant data even on slow network

### 2. Desktop Browser Testing (Regression Check)

**Steps**:
1. Open `/app/admin/matching?cohort=winter2025-0`
2. Hard refresh (Cmd+Shift+R)
3. Check table loads normally

**Expected Result**: No regression, still works as before

### 3. Network Throttling Test

**Chrome DevTools**:
1. F12 → Network tab
2. Set throttling to "Slow 3G"
3. Hard refresh (Cmd+Shift+R)
4. Watch for table population

**Expected Result**: Table populates after brief loading, no stuck empty state

### 4. PWA Testing

**Steps**:
1. Install PWA on mobile device
2. Open matching page
3. Check table rendering

**Expected Result**: Same behavior as mobile browser

---

## Technical Details

### useMemo Dependencies

**File**: `src/app/app/admin/matching/page.tsx` (lines 235-290)

```typescript
const assignmentRows = useMemo<AssignmentRow[]>(() => {
  const currentResult = previewResult || confirmedResult;
  if (!currentResult?.matching.assignments) return [];

  return cohortParticipants  // ✅ Depends on this array
    .filter(...)
    .map(...);
}, [previewResult, confirmedResult, cohortParticipants, participantsById]);
   // ☝️ When cohortParticipants updates, useMemo recalculates
```

**Why This Works Now**:
- React Query completes → `cohortParticipants` updates
- Component re-renders (no longer blocked by `notifyOnChangeProps`)
- `useMemo` detects `cohortParticipants` dependency changed
- Recalculates `assignmentRows` with actual data
- Table displays rows

### React Query Configuration

**File**: `src/hooks/use-participants.ts` (lines 69-82)

```typescript
export function useParticipantsByCohort(cohortId: string | undefined) {
  return useQuery({
    queryKey: PARTICIPANT_KEYS.byCohort(cohortId || ''),
    queryFn: () => (cohortId ? getParticipantsByCohort(cohortId) : []),
    enabled: !!cohortId,
    staleTime: 30 * 60 * 1000, // 30분 (still optimized)
    gcTime: 60 * 60 * 1000, // 60분 (still optimized)
    refetchOnMount: false, // Still optimized
    refetchOnWindowFocus: false, // Still optimized
    // ✅ Removed: notifyOnChangeProps (was blocking re-renders)
  });
}
```

**Performance Impact**: Minimal

- Still benefits from 30min cache
- Still avoids unnecessary refetches
- Only adds ONE re-render when data loads (acceptable cost)

---

## What Was NOT the Problem

1. ❌ **localStorage timing** - localStorage is synchronous
2. ❌ **useMemo logic** - Logic was correct
3. ❌ **React Query configuration** - Cache settings were fine
4. ❌ **Component rendering** - No conditional render issues
5. ❌ **Mobile-specific CSS** - No display issues

The ONLY issue was the optimization that prevented re-rendering.

---

## Rollback Plan (If Needed)

If this fix causes performance issues:

```typescript
// Revert to:
notifyOnChangeProps: ['data', 'error'],

// And add this workaround in page.tsx:
const [, forceUpdate] = useReducer(x => x + 1, 0);

useEffect(() => {
  if (!participantsLoading && cohortParticipants.length > 0) {
    forceUpdate(); // Force useMemo recalculation
  }
}, [participantsLoading, cohortParticipants.length]);
```

But this shouldn't be necessary - the fix is clean and correct.

---

## Success Criteria

- ✅ Mobile browser shows participant list after page load
- ✅ Desktop browser continues to work normally
- ✅ Cache clear doesn't break functionality
- ✅ PWA shows participant list
- ✅ Slow network (3G) still populates table
- ✅ No performance degradation (verify with React DevTools Profiler)

---

## Related Files

1. `/Users/jclee/Desktop/휠즈랩스/projectpns/src/hooks/use-participants.ts`
2. `/Users/jclee/Desktop/휠즈랩스/projectpns/src/app/app/admin/matching/page.tsx`
3. `/Users/jclee/Desktop/휠즈랩스/projectpns/src/components/admin/ParticipantAssignmentTable.tsx`

---

**Status**: ✅ Fixed and ready for testing
**Expected Deploy**: Immediately after verification
**Monitoring**: Watch for any performance metrics in production
