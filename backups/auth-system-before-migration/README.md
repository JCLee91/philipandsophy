# Authentication System Backup

**Created**: 2025-10-14
**Purpose**: Backup of existing custom session authentication system before Firebase Phone Auth migration

## Backed Up Files

### 1. use-session.ts
- **Path**: `src/hooks/use-session.ts`
- **Purpose**: Client-side session management hook
- **Lines**: 174 lines
- **Key Features**:
  - localStorage session token management
  - visibilitychange and popstate event listeners
  - Session validation with 5-minute grace period
  - Memory cache for sessionToken

### 2. participants.ts
- **Path**: `src/lib/firebase/participants.ts`
- **Purpose**: Firestore participant operations including session management
- **Lines**: 380 lines
- **Key Functions**:
  - `createSessionToken(participantId)` (lines 298-315)
  - `getParticipantBySessionToken(token)` (lines 323-363)
  - `clearSessionToken(participantId)` (lines 370-379)

### 3. page.tsx (App Entry)
- **Path**: `src/app/app/page.tsx`
- **Purpose**: Access code entry page with phone number login
- **Key Features**:
  - Cohort access code validation
  - Phone number input and participant lookup
  - Session token creation and storage

## Restore Instructions

If migration needs to be reverted:

```bash
# 1. Navigate to project root
cd /Users/jclee/Desktop/휠즈랩스/projectpns

# 2. Restore files
cp backups/auth-system-before-migration/use-session.ts src/hooks/
cp backups/auth-system-before-migration/participants.ts src/lib/firebase/
cp backups/auth-system-before-migration/page.tsx src/app/app/

# 3. Reinstall dependencies (if needed)
npm install

# 4. Restart dev server
npm run dev
```

## Migration Reference

For migration details, see:
- `docs/migration/phone-auth-migration.md`

## Notes

- These files represent the custom UUID-based session token system
- Session duration: 24 hours with 5-minute grace period
- Session tokens stored in localStorage with key: `pns-session`
- Firebase Auth migration will replace this with:
  - 60-day refresh tokens
  - Automatic session management via onAuthStateChanged
  - No manual token storage required

---

*This backup is for emergency rollback only. Do not use for new development.*
