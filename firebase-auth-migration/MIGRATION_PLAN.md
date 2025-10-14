# Firebase Phone Auth Migration Plan

**Status**: In Progress (Isolated Development)
**Created**: 2025-10-14
**Last Updated**: 2025-10-14

## 🎯 Migration Goal

Replace custom sessionToken authentication with Firebase Phone Authentication SDK.

## ✅ Completed Tasks

### 1. Client-Side Authentication (✅ DONE)
- [x] Firebase Phone Auth integration in PhoneAuthCard
- [x] Race condition fix in useAuth hook
- [x] RecaptchaVerifier memory leak fix
- [x] Auth constants extracted to constants/auth.ts
- [x] Session persistence (60-day auto-refresh)

### 2. Bug Fixes (✅ DONE)
- [x] Race condition in useAuth (useRef tracking)
- [x] RecaptchaVerifier cleanup (try-catch-finally)
- [x] Magic numbers → AUTH_TIMING constants
- [x] ConfirmationResult brute force prevention

## 🚧 Pending Tasks

### 3. API Route Migration (🔴 CRITICAL)
**Priority**: HIGH  
**Blocker**: Notice delete API authentication mismatch

**Issue**: 
- Server expects `sessionToken` (legacy)
- Client doesn't send any auth headers
- Result: 100% failure rate for notice deletion

**Solution**:
```typescript
// Server: /api/notices/[noticeId]/route.ts
async function verifyAdminAuth(authHeader: string | null) {
  if (!authHeader?.startsWith('Bearer ')) return { error: 'UNAUTHORIZED', status: 401 };
  
  const idToken = authHeader.split('Bearer ')[1];
  const decodedToken = await getAdminAuth().verifyIdToken(idToken);
  const firebaseUid = decodedToken.uid;
  
  // Query by firebaseUid instead of sessionToken
  const snapshot = await db
    .collection('participants')
    .where('firebaseUid', '==', firebaseUid)
    .limit(1)
    .get();
  
  // ... validate isAdministrator
}

// Client: hooks/use-notices.ts
const user = auth.currentUser;
const idToken = await user.getIdToken();

fetch(`/api/notices/${id}`, {
  headers: {
    'Authorization': `Bearer ${idToken}`
  }
});
```

**Files to Modify**:
- [ ] `/src/app/api/notices/[noticeId]/route.ts`
- [ ] `/src/hooks/use-notices.ts`

### 4. Type Cleanup (⚠️ MINOR)
**Priority**: LOW

**Remove deprecated fields from database.ts**:
```typescript
// ❌ Remove these (legacy):
sessionToken?: string;
sessionExpiry?: number;

// ✅ Keep this (new):
firebaseUid?: string;
```

### 5. Comment Updates (⚠️ MINOR)
**Priority**: LOW

**Update navigation.ts comments**:
```typescript
// Old:
// 🔒 세션 토큰 기반 인증으로 전환 (v2.3)

// New:
// 🔒 Firebase Phone Auth 기반 인증 (v3.0)
// - Firebase Auth onAuthStateChanged로 자동 세션 관리
// - 60일 자동 세션 유지 (Refresh Token)
```

### 6. Testing & Validation
- [ ] Create comprehensive test suite
- [ ] Manual testing checklist
- [ ] Load testing (race conditions)
- [ ] Security audit (token expiry, permissions)

### 7. Production Deployment Plan
**When**: After ALL testing passes

**Steps**:
1. Merge feature branch to staging branch
2. Deploy to staging environment
3. Run full test suite on staging
4. Get user acceptance testing approval
5. Schedule maintenance window
6. Merge to main branch
7. Deploy to production
8. Monitor error rates for 24 hours
9. Keep rollback plan ready

## 📊 Implementation Tracking

### Bug Status
- ✅ Race condition in useAuth: **FIXED**
- ✅ RecaptchaVerifier memory leak: **FIXED**
- 🔴 Notice delete API auth mismatch: **NOT FIXED** (critical blocker)
- ✅ Magic number constants: **FIXED**

### Architecture Status
- ✅ Client auth flow: **COMPLETE**
- 🔴 Server API authentication: **INCOMPLETE**
- ⚠️ Type definitions: **NEEDS CLEANUP**
- ⚠️ Documentation: **NEEDS UPDATE**

## 🔒 Safety Rules

**NEVER**:
- Push to main without approval
- Deploy to production prematurely
- Modify production database directly
- Skip testing phases

**ALWAYS**:
- Test in isolated environment first
- Get approval before merging
- Keep rollback plan ready
- Monitor errors after deployment

---

**Next Action**: Complete API route migration (#3) before proceeding to testing.
