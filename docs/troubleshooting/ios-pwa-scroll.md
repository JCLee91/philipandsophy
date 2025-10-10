# iOS PWA Scroll Bug Fix

**Last Updated**: 2025-10-10
**Category**: Troubleshooting / Platform-Specific Issues

## 📱 Problem Summary

iOS WebKit has a long-standing bug where `position: fixed` overlays (like Radix UI Sheet) fail to scroll properly when:
1. The app is launched as a **PWA from the home screen** (standalone mode)
2. The `<body>` has `overflow: hidden` or fixed positioning
3. Scrollable content exists inside the fixed overlay layer

This issue **only affects iOS PWA** (Safari WebView in standalone mode). It works perfectly in:
- Safari browser (iOS)
- Android PWA
- Desktop browsers

---

## 🔍 Root Cause

### WebKit Bug Details
- **Component**: Radix UI Sheet (참가자 목록)
- **Trigger**: `position: fixed` overlay with internal scroll container
- **Platform**: iOS PWA (standalone mode only)
- **Behavior**: Touch scrolling is blocked inside the Sheet component

### Why It Happens
iOS WebKit's rendering engine has poor support for:
- Nested scrollable containers inside `position: fixed` elements
- Touch event propagation when `body` has `overflow: hidden`
- `-webkit-overflow-scrolling: touch` in standalone PWA context

---

## ✅ Solution

### Strategy: Platform-Specific Routing

Instead of fixing the Sheet component (which is a WebKit limitation), we **conditionally route** users based on their platform:

1. **iOS PWA**: Navigate to full-page route `/app/chat/participants`
2. **Other platforms**: Use existing Sheet overlay (Radix UI)

### Implementation

#### 1. iOS Standalone Detection Hook

**File**: `src/hooks/use-standalone-ios.ts`

```typescript
'use client';

import { useEffect, useState } from 'react';

/**
 * Detects if the app is running as an iOS PWA (standalone mode)
 * Checks both matchMedia and legacy navigator.standalone
 */
export function useIsIosStandalone(): boolean {
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const detect = () => {
      const userAgent = window.navigator.userAgent || '';
      const isIos = /iPad|iPhone|iPod/.test(userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const isStandaloneDisplay = window.matchMedia('(display-mode: standalone)').matches;
      const legacyStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
      setIsStandalone(isIos && (isStandaloneDisplay || legacyStandalone));
    };

    detect();

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const listener = () => detect();

    mediaQuery.addEventListener('change', listener);
    window.addEventListener('pageshow', listener);

    return () => {
      mediaQuery.removeEventListener('change', listener);
      window.removeEventListener('pageshow', listener);
    };
  }, []);

  return isStandalone;
}
```

**Detection Logic**:
- ✅ iOS device detection (iPhone/iPad/iPod)
- ✅ iPad Pro detection (MacIntel + touch)
- ✅ Modern API: `matchMedia('(display-mode: standalone)')`
- ✅ Legacy API: `navigator.standalone` (Safari < 13)
- ✅ Runtime updates via event listeners

#### 2. Conditional Routing in Chat Page

**File**: `src/app/app/chat/page.tsx` (line 78, 292-299)

```tsx
import { useIsIosStandalone } from '@/hooks/use-standalone-ios';

function ChatPageContent() {
  const isIosStandalone = useIsIosStandalone(); // Line 78

  return (
    <Header
      onParticipantsClick={() => {
        if (isIosStandalone) {
          // iOS PWA: Navigate to full-page route
          if (!cohortId) return;
          router.push(appRoutes.participants(cohortId));
          return;
        }
        // Other platforms: Open Sheet overlay
        setParticipantsOpen(true);
      }}
      // ... other props
    />
  );
}
```

**Behavior**:
- **iOS PWA**: Click 참가자 아이콘 → Navigate to `/app/chat/participants?cohort=xxx`
- **Other platforms**: Click 참가자 아이콘 → Open Radix Sheet overlay

#### 3. Dedicated Participants Page

**File**: `src/app/app/chat/participants/page.tsx`

A **full-page route** that provides the same functionality as the Sheet component:

**Features**:
- ✅ Full-screen scrollable list (no overlay issues)
- ✅ BackHeader with router.back() navigation
- ✅ Same UI/UX as Sheet component
- ✅ Supports all participant features (DM, profile, profile book)
- ✅ Current user card with action buttons
- ✅ "오늘의 서재" and "로그아웃" buttons at bottom

**Key Sections**:
```tsx
<PageTransition>
  <div className="app-shell flex flex-col overflow-hidden">
    <BackHeader onBack={() => router.back()} title="참가자 목록" />

    {/* Scrollable participant list */}
    <main className="flex-1 overflow-y-auto">
      {/* Participant rows with DM/Profile actions */}
    </main>

    {/* Bottom action buttons */}
    <div className="border-t bg-white">
      <UnifiedButton onClick={...}>오늘의 서재 보기</UnifiedButton>
      <UnifiedButton onClick={logout}>로그아웃</UnifiedButton>
    </div>
  </div>
</PageTransition>
```

#### 4. Navigation Helper

**File**: `src/lib/navigation.ts` (line 47-56)

```typescript
export const appRoutes = {
  /**
   * Participants list page (iOS PWA fallback)
   * @param cohortId - Cohort ID
   */
  participants: (cohortId: string) => {
    const params = new URLSearchParams({
      cohort: cohortId,
    });
    return `/app/chat/participants?${params}`;
  },
  // ... other routes
} as const;
```

---

## 🎯 User Experience

### Before Fix (iOS PWA)
1. User taps 참가자 아이콘
2. Radix Sheet opens
3. **Touch scrolling is completely broken** ❌
4. Cannot see or interact with participants list
5. User frustration

### After Fix (iOS PWA)
1. User taps 참가자 아이콘
2. Full-page navigation to `/app/chat/participants`
3. **Native scrolling works perfectly** ✅
4. User can see all participants and interact normally
5. Back button returns to chat

### Other Platforms (Unchanged)
1. User taps 참가자 아이콘
2. Radix Sheet overlay opens smoothly
3. Scrolling works as expected
4. No change to existing UX

---

## 🛠️ Technical Details

### Files Changed
- ✅ `src/hooks/use-standalone-ios.ts` - iOS PWA detection hook (NEW)
- ✅ `src/app/app/chat/page.tsx` - Conditional routing logic (MODIFIED)
- ✅ `src/app/app/chat/participants/page.tsx` - Full-page participants route (NEW)
- ✅ `src/lib/navigation.ts` - appRoutes.participants() helper (MODIFIED)

### Why This Approach?

#### ✅ Pros
1. **Zero impact on non-iOS platforms** - Existing Sheet UX preserved
2. **Reliable fix** - Avoids WebKit rendering bugs entirely
3. **Maintainable** - Clean separation of concerns
4. **Future-proof** - Works even if WebKit never fixes the bug
5. **Better UX on iOS** - Full-page navigation feels native on mobile

#### ❌ Alternative Approaches Rejected

**Option 1: CSS Hacks**
- Tried: `-webkit-overflow-scrolling: touch`, `transform: translateZ(0)`, etc.
- Result: Inconsistent behavior, still breaks in certain scenarios

**Option 2: Replace Radix Sheet**
- Tried: Custom modal with different positioning strategy
- Result: Loses Radix UI's accessibility features and focus management

**Option 3: Force Desktop Mode**
- Tried: Meta tag to disable standalone mode
- Result: Breaks PWA install feature entirely

---

## 🧪 Testing Checklist

### iOS PWA (Standalone Mode)
- [ ] Install app to home screen (Safari → Share → Add to Home Screen)
- [ ] Open app from home screen icon
- [ ] Tap 참가자 아이콘in header
- [ ] Verify navigation to `/app/chat/participants`
- [ ] Scroll through participant list (should work smoothly)
- [ ] Tap back button → returns to chat
- [ ] Tap participant → profile actions work
- [ ] Tap DM (admin only) → opens DM dialog

### iOS Safari Browser
- [ ] Open app in Safari browser (not standalone)
- [ ] Tap 참가자 아이콘
- [ ] Verify Radix Sheet opens (overlay UI)
- [ ] Scroll inside Sheet (should work smoothly)
- [ ] Close Sheet → works normally

### Android PWA
- [ ] Install app to home screen
- [ ] Open from home screen
- [ ] Tap 참가자 아이콘
- [ ] Verify Radix Sheet opens (overlay UI)
- [ ] Scroll inside Sheet (should work smoothly)

### Desktop Browser
- [ ] Open in Chrome/Firefox/Safari
- [ ] Tap 참가자 아이콘
- [ ] Verify Radix Sheet opens
- [ ] Scroll and interact normally

---

## 📚 Related Issues

### iOS WebKit Bugs
- [WebKit Bug 176896](https://bugs.webkit.org/show_bug.cgi?id=176896) - position:fixed scroll issues
- [WebKit Bug 153852](https://bugs.webkit.org/show_bug.cgi?id=153852) - -webkit-overflow-scrolling: touch bugs
- [Stack Overflow Discussion](https://stackoverflow.com/questions/47563252/ios-safari-position-fixed-and-scrolling) - Community workarounds

### Radix UI
- [Radix Sheet Component](https://www.radix-ui.com/primitives/docs/components/sheet) - Official docs
- [Known iOS Issues](https://github.com/radix-ui/primitives/issues?q=is%3Aissue+ios+scroll) - GitHub issues

---

## 🔄 Future Improvements

### If WebKit Fixes the Bug
1. Remove `useIsIosStandalone` hook
2. Revert to Sheet-only implementation
3. Delete `/app/chat/participants` page
4. Simplify `Header` component logic

### Monitoring
- Check WebKit release notes for scroll fixes
- Test new iOS versions annually
- Monitor user reports from iOS PWA users

---

## 💡 Key Takeaways

1. **Platform-specific bugs require platform-specific solutions**
2. **Don't fight the browser** - Work around WebKit limitations
3. **Preserve UX for unaffected platforms** - No regressions
4. **Full-page navigation is more reliable than modals on mobile**
5. **Detection hooks allow clean separation of platform logic**

---

**Related Documentation**:
- [PWA Setup](../setup/pwa.md)
- [Navigation System](../architecture/navigation.md)
- [Performance Optimization](../optimization/performance.md)
