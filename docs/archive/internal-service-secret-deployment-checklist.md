# 🚀 Internal Service Secret - Deployment Checklist (Archive)

이 문서는 과거 배포 시점의 체크리스트 기록입니다. 현재 기준 문서는 `docs/setup/internal-service-secret.md`를 참고하세요.

**Last Updated**: 2025-11-04
**Status**: ✅ Production Deployed and Verified

---

## ✅ Completed Setup

### Local Development Environment

- ✅ **Secret Generated**: `vDnfEPFeaqqqn5PhTYTgpSPTsqGlRrss9p0XJ+VPET8=`
- ✅ **Functions .env**: `/functions/.env` updated with `INTERNAL_SERVICE_SECRET` (for local emulator)
- ✅ **Next.js .env.local**: `/.env.local` updated with `INTERNAL_SERVICE_SECRET`
- ✅ **Functions Build**: Successfully compiled TypeScript
- ✅ **Documentation**: Complete setup guide created

### Production Environment

- ✅ **Firebase Functions Config**: `firebase functions:config:set INTERNAL_SERVICE_SECRET="..."` completed
- ✅ **Vercel Environment**: `INTERNAL_SERVICE_SECRET` set in Vercel dashboard
- ✅ **Functions Deployed**: Successfully deployed to `us-central1` region
- ✅ **Next.js Deployed**: Production deployment on Vercel verified
- ✅ **Scheduled Function**: `scheduledMatchingPreview` running daily at 5 AM KST

### Code Implementation

- ✅ **Functions Code**: `functions/src/index.ts` line 53-56 (parameter definition with `default: ""`)
- ✅ **Functions Code**: `functions/src/index.ts` line 865-869 (early return validation)
- ✅ **Functions Code**: `functions/src/index.ts` line 874-880 (header injection)
- ✅ **API Route Code**: `src/app/api/admin/matching/preview/route.ts` line 17-35 (validation)

---

## 📋 Production Deployment Steps

### Step 1: Set Firebase Functions Runtime Config

```bash
# Navigate to project root
cd /Users/jclee/Desktop/휠즈랩스/projectpns

# Set the secret in Firebase Functions runtime config
firebase functions:config:set INTERNAL_SERVICE_SECRET="YOUR_GENERATED_SECRET"

# Verify it was set correctly
firebase functions:config:get
```

**Expected Output**:
```json
{
  "internal_service_secret": "YOUR_GENERATED_SECRET"
}
```

**Important Notes**:
- This is the **primary** method for production Functions
- Firebase converts the key to lowercase with underscores: `INTERNAL_SERVICE_SECRET` → `internal_service_secret`
- The code reads it correctly using `defineString("INTERNAL_SERVICE_SECRET")`
- Config changes require redeployment to take effect

### Step 2: Set Vercel Environment Variable

```bash
# Option A: Using Vercel CLI
vercel env add INTERNAL_SERVICE_SECRET

# When prompted, paste:
YOUR_GENERATED_SECRET

# Select environments: Production, Preview, Development (all)
```

**Option B: Using Vercel Dashboard**

1. Go to: https://vercel.com/jclees-projects-c1bb6dfd/pslanding/settings/environment-variables
2. Click **Add New**
3. **Name**: `INTERNAL_SERVICE_SECRET`
4. **Value**: `YOUR_GENERATED_SECRET`
5. **Environments**: Select all (Production, Preview, Development)
6. Click **Save**

### Step 3: Deploy Firebase Functions

```bash
# Navigate to functions directory
cd /Users/jclee/Desktop/휠즈랩스/projectpns/functions

# Verify build
npm run build

# Deploy to Firebase
firebase deploy --only functions

# Wait for deployment to complete (2-5 minutes)
```

**Expected Output**:
```
✔  functions[asia-northeast3-scheduledMatchingPreview] Successful update operation.
✔  Deploy complete!
```

**Important**: Functions deployment is required to load the new runtime config value.

### Step 4: Deploy Next.js to Vercel

```bash
# Navigate to project root
cd /Users/jclee/Desktop/휠즈랩스/projectpns

# Option A: Using Vercel CLI
vercel --prod

# Option B: Git push (auto-deploy)
git add .
git commit -m "feat: add internal service secret authentication"
git push origin main
```

**Expected**: Vercel will auto-deploy from GitHub within 2-3 minutes.

### Step 5: Verify Deployment

#### Test Firebase Functions

```bash
# Check Functions logs
firebase functions:log --only scheduledMatchingPreview --limit 10

# Expected logs (success):
# ✅ "🤖 Scheduled matching preview started"
# ✅ "Calling preview API for cohort: 1"
# ✅ Response status 200

# Expected logs (if secret not set):
# ❌ "INTERNAL_SERVICE_SECRET is not set; aborting scheduled preview"
```

#### Test Next.js API

```bash
# Test with valid secret (should succeed)
curl -X POST https://philipandsophy.vercel.app/api/admin/matching/preview \
  -H "Content-Type: application/json" \
  -H "X-Internal-Secret: YOUR_GENERATED_SECRET" \
  -d '{"cohortId":"1"}'

# Expected response:
# {"success":true,"totalParticipants":...}
```

#### Verify Firestore

1. Go to: https://console.firebase.google.com/project/philipandsophy/firestore/data
2. Navigate to `matching_previews` collection
3. Check for new document with:
   - `status: "pending"`
   - Recent `createdAt` timestamp
   - Correct `cohortId`

---

## 🔍 Post-Deployment Validation

### Checklist

- [ ] Firebase runtime config set (`firebase functions:config:get` shows value)
- [ ] Vercel environment variable set and visible in dashboard
- [ ] Firebase Functions deployed successfully
- [ ] Next.js deployed to production
- [ ] Scheduled function runs without "INTERNAL_SERVICE_SECRET is not set" error
- [ ] API returns 200 status with internal secret
- [ ] API returns 401 without secret (security check)
- [ ] Firestore `matching_previews` receives new documents
- [ ] No errors in Functions logs
- [ ] No errors in Vercel logs

### Security Tests

```bash
# Test 1: Valid secret (should succeed)
curl -X POST https://philipandsophy.vercel.app/api/admin/matching/preview \
  -H "Content-Type: application/json" \
  -H "X-Internal-Secret: YOUR_GENERATED_SECRET" \
  -d '{"cohortId":"1"}'
# Expected: 200 OK

# Test 2: Invalid secret (should fail)
curl -X POST https://philipandsophy.vercel.app/api/admin/matching/preview \
  -H "Content-Type: application/json" \
  -H "X-Internal-Secret: wrong-secret" \
  -d '{"cohortId":"1"}'
# Expected: 401 Unauthorized

# Test 3: No secret (should fail)
curl -X POST https://philipandsophy.vercel.app/api/admin/matching/preview \
  -H "Content-Type: application/json" \
  -d '{"cohortId":"1"}'
# Expected: 401 Unauthorized
```

---

## 📊 Monitoring

### Firebase Functions Logs

```bash
# Real-time monitoring
firebase functions:log --only scheduledMatchingPreview --follow

# Check last 50 logs
firebase functions:log --only scheduledMatchingPreview --limit 50
```

### Vercel Logs

```bash
# Using Vercel CLI
vercel logs pslanding --follow

# Or via Dashboard:
https://vercel.com/jclees-projects-c1bb6dfd/pslanding/logs
```

### Expected Log Patterns

**Successful Authentication**:
```
🤖 Scheduled matching preview started
Calling preview API for cohort: 1
[Matching Preview] Internal service authenticated via secret
Preview generated successfully: 10 participants
Preview saved to Firestore: 1-2025-10-21
```

**Failed Authentication** (if secret missing):
```
🤖 Scheduled matching preview started
❌ INTERNAL_SERVICE_SECRET is not set; aborting scheduled preview
```

**Failed Authentication** (if secret wrong on API side):
```
[API Auth] Unauthorized: Missing or invalid credentials
```

---

## 🛑 Rollback Plan

If deployment causes issues:

### Rollback Functions

```bash
# List recent deployments
firebase functions:list

# Rollback to previous version (if needed)
# Note: Firebase doesn't support direct rollback
# Instead, redeploy previous code version
git checkout <previous-commit>
cd functions
npm run build
firebase deploy --only functions
```

### Rollback Vercel

```bash
# List deployments
vercel ls

# Promote previous deployment to production
vercel promote <deployment-url>
```

### Emergency Disable

If you need to immediately disable the internal auth:

1. **Remove runtime config from Firebase**:
   ```bash
   firebase functions:config:unset INTERNAL_SERVICE_SECRET
   firebase deploy --only functions
   ```
   - Function will log "INTERNAL_SERVICE_SECRET is not set" and return early (safe failure)
   - No crashes, just skips execution

2. **Remove environment variable from Vercel**:
   - Go to Vercel Dashboard → Environment Variables
   - Delete `INTERNAL_SERVICE_SECRET`
   - Redeploy Next.js (will fallback to admin auth only)

3. **Result**:
   - Scheduled function will fail authentication safely
   - API only accepts admin token authentication
   - No data corruption or errors

---

## 📝 Post-Deployment Actions

### Update Team

- [ ] Notify team of deployment
- [ ] Share monitoring dashboard links
- [ ] Document any issues encountered

### Backup Secret

- [ ] Save secret to secure password manager (1Password, LastPass, etc.)
- [ ] Document secret rotation schedule (90 days recommended)
- [ ] Add calendar reminder for next rotation date (2026-01-18)

### Schedule Monitoring

- [ ] Set up alert for Functions failures (Firebase Console → Functions → Alerts)
- [ ] Monitor first 24 hours of scheduled runs
- [ ] Check Firestore for preview documents after first run
- [ ] Verify no unexpected errors in logs

---

## 🔄 Next Scheduled Run

The `scheduledMatchingPreview` function runs daily at:
- **Time**: 5:00 AM KST (UTC+9)
- **Timezone**: Asia/Seoul
- **Frequency**: Every day
- **Cron**: `0 5 * * *`

**Next expected run**: Tomorrow at 5:00 AM KST

Monitor logs around this time to verify successful execution:
```bash
firebase functions:log --only scheduledMatchingPreview --follow
```

---

## 🔐 Configuration Summary

### Environment Variables Required

| Environment | Variable | How to Set | Value |
|------------|----------|------------|-------|
| **Firebase Production** | `INTERNAL_SERVICE_SECRET` | `firebase functions:config:set` | `YOUR_GENERATED_SECRET` |
| **Firebase Local** | `INTERNAL_SERVICE_SECRET` | `functions/.env` file | `YOUR_GENERATED_SECRET` |
| **Next.js Local** | `INTERNAL_SERVICE_SECRET` | `.env.local` file | `YOUR_GENERATED_SECRET` |
| **Vercel Production** | `INTERNAL_SERVICE_SECRET` | Vercel Dashboard/CLI | `YOUR_GENERATED_SECRET` |

### Value Consistency Check

All four environments **MUST** have identical values:
```bash
# Check Firebase
firebase functions:config:get INTERNAL_SERVICE_SECRET

# Check Functions local
cat functions/.env | grep INTERNAL_SERVICE_SECRET

# Check Next.js local
cat .env.local | grep INTERNAL_SERVICE_SECRET

# Check Vercel
vercel env pull .env.vercel.local
cat .env.vercel.local | grep INTERNAL_SERVICE_SECRET
```

---

## ✅ Deployment Complete

Once all checklist items are complete:

```bash
# Mark as complete
echo "✅ Internal Service Secret deployed successfully" >> deployment-log.txt
echo "Date: $(date)" >> deployment-log.txt
echo "Functions runtime config: set" >> deployment-log.txt
echo "Vercel env: set" >> deployment-log.txt
echo "Functions deployed: ✅" >> deployment-log.txt
echo "Next.js deployed: ✅" >> deployment-log.txt
```

---

**Deployed By**: Development Team
**Date**: 2025-10-20
**Version**: v1.1.0
**Status**: ✅ Ready for Production
**Configuration Method**: `firebase functions:config:set` (primary) + `.env` (local fallback)
