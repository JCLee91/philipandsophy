# Internal Service Secret Setup

**Last Updated**: 2025-10-20
**Purpose**: Secure authentication between Firebase Functions (Cron) and Next.js API routes

---

## Overview

The Internal Service Secret provides secure communication between:
- **Firebase Cloud Functions** (scheduled jobs, cron tasks)
- **Next.js API Routes** (admin endpoints)

This prevents unauthorized access to admin APIs while allowing automated internal services to operate.

---

## Architecture

```
Firebase Functions (Cron)
    ↓ HTTP POST
    ↓ Header: X-Internal-Secret: [secret]
    ↓
Next.js API Route (/api/admin/matching/preview)
    ↓ Validate secret
    ↓ If valid → bypass admin auth
    ↓ If invalid → require admin token
```

---

## Setup Instructions

### 1. Generate a Strong Secret

Generate a random secret (32+ characters):

```bash
# Using OpenSSL (recommended)
openssl rand -base64 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Example output:
# vDnfEPFeaqqqn5PhTYTgpSPTsqGlRrss9p0XJ+VPET8=
```

**Save this value** - you'll need it for both Firebase and Vercel.

---

### 2. Configure Firebase Functions

#### Set Runtime Configuration

Firebase Functions uses `firebase functions:config:set` to store runtime configuration.

```bash
# Set the secret in Firebase Functions config
cd /Users/jclee/Desktop/휠즈랩스/projectpns
firebase functions:config:set INTERNAL_SERVICE_SECRET="YOUR_SECRET_HERE"

# Example:
firebase functions:config:set INTERNAL_SERVICE_SECRET="vDnfEPFeaqqqn5PhTYTgpSPTsqGlRrss9p0XJ+VPET8="

# Verify it was set correctly
firebase functions:config:get
```

**Expected output**:
```json
{
  "internal_service_secret": "vDnfEPFeaqqqn5PhTYTgpSPTsqGlRrss9p0XJ+VPET8="
}
```

#### Local Development (.env file)

For local emulator testing, add the secret to `functions/.env`:

```bash
# Navigate to functions directory
cd functions

# Edit .env file
nano .env

# Add this line:
INTERNAL_SERVICE_SECRET=vDnfEPFeaqqqn5PhTYTgpSPTsqGlRrss9p0XJ+VPET8=

# Save and exit (Ctrl+X, then Y, then Enter)
```

**Important**: The `.env` file is already in `.gitignore` and won't be committed to Git.

#### Deploy Functions

After setting the secret, deploy functions:

```bash
cd functions
npm run build
firebase deploy --only functions
```

**Expected output**:
```
✔  functions[asia-northeast3-scheduledMatchingPreview] Successful update operation.
✔  Deploy complete!
```

---

### 3. Configure Next.js (Vercel)

#### Local Development (.env.local)

Create or update `.env.local` in the project root:

```bash
# Navigate to project root
cd /Users/jclee/Desktop/휠즈랩스/projectpns

# Edit .env.local
nano .env.local

# Add this line (must match Firebase secret):
INTERNAL_SERVICE_SECRET=vDnfEPFeaqqqn5PhTYTgpSPTsqGlRrss9p0XJ+VPET8=
```

**Important**: Add `.env.local` to `.gitignore` (already done in this project)

#### Vercel Production

```bash
# Option A: Using Vercel CLI
vercel env add INTERNAL_SERVICE_SECRET

# When prompted:
# ? What's the value of INTERNAL_SERVICE_SECRET?
# [Paste: vDnfEPFeaqqqn5PhTYTgpSPTsqGlRrss9p0XJ+VPET8=]
#
# ? Add INTERNAL_SERVICE_SECRET to which Environments?
# [Select: Production, Preview, Development - all]

# Option B: Using Vercel Dashboard
# 1. Go to https://vercel.com/jclees-projects-c1bb6dfd/pslanding/settings/environment-variables
# 2. Click "Add New"
# 3. Name: INTERNAL_SERVICE_SECRET
# 4. Value: vDnfEPFeaqqqn5PhTYTgpSPTsqGlRrss9p0XJ+VPET8=
# 5. Environments: Select all (Production, Preview, Development)
# 6. Click "Save"
```

#### Redeploy Next.js

After setting the environment variable:

```bash
# Trigger redeploy (if using Vercel CLI)
vercel --prod

# Or push to GitHub to trigger auto-deploy
git add .
git commit -m "feat: configure internal service secret"
git push origin main
```

---

## Verification

### Test Local Setup

1. **Check Firebase Functions runtime config**:
   ```bash
   firebase functions:config:get
   ```

   Should show:
   ```json
   {
     "internal_service_secret": "YOUR_SECRET_HERE"
   }
   ```

2. **Check Functions local .env file** (for emulator):
   ```bash
   cat functions/.env | grep INTERNAL_SERVICE_SECRET
   ```

   Should show:
   ```
   INTERNAL_SERVICE_SECRET=YOUR_SECRET_HERE
   ```

3. **Check Next.js local environment**:
   ```bash
   cat .env.local | grep INTERNAL_SERVICE_SECRET
   ```

   Should show:
   ```
   INTERNAL_SERVICE_SECRET=YOUR_SECRET_HERE
   ```

4. **Verify secrets match**:
   - Firebase config value
   - Functions .env value
   - Next.js .env.local value
   - Vercel environment variable

   **All four must be identical!**

### Test Production Setup

1. **Check Vercel environment variable**:
   ```bash
   # Using Vercel CLI
   vercel env pull .env.vercel.local
   cat .env.vercel.local | grep INTERNAL_SERVICE_SECRET

   # Or check Dashboard:
   # https://vercel.com/jclees-projects-c1bb6dfd/pslanding/settings/environment-variables
   ```

2. **Trigger scheduled function manually**:
   ```bash
   # Using Firebase Console
   # Go to: https://console.firebase.google.com/project/philipandsophy/functions
   # Find: scheduledMatchingPreview
   # Click: Test function
   ```

3. **Check logs**:
   ```bash
   # Firebase Functions logs
   firebase functions:log --only scheduledMatchingPreview --limit 10

   # Look for:
   # ✅ "Calling preview API for cohort: 1"
   # ✅ Response status 200
   # ❌ "INTERNAL_SERVICE_SECRET is not set" (if missing)
   ```

4. **Verify Firestore**:
   - Go to Firebase Console → Firestore
   - Check `matching_previews` collection
   - Should see new document with `status: "pending"`

---

## Security Best Practices

### 🔒 Secret Management

1. **Never commit secrets to Git**
   - ✅ `.env.local` is in `.gitignore`
   - ✅ `functions/.env` is in `.gitignore`
   - ✅ Use `firebase functions:config:set` for production
   - ✅ Use Vercel environment variables

2. **Rotate secrets regularly**
   - Recommended: Every 90 days
   - After team member departure
   - If secret is compromised

3. **Use strong secrets**
   - Minimum 32 characters
   - Random alphanumeric + special chars
   - Generated by cryptographic tools (openssl, crypto)

### 🛡️ Access Control

**This secret grants admin-level access**:
- Only store in secure environments
- Never log or expose in error messages
- Limit access to deployment personnel
- Use environment variables only

### 📋 Secret Rotation Process

When you need to rotate the secret:

```bash
# 1. Generate new secret
NEW_SECRET=$(openssl rand -base64 32)
echo "New secret: $NEW_SECRET"

# 2. Update Firebase Functions config
firebase functions:config:set INTERNAL_SERVICE_SECRET="$NEW_SECRET"

# 3. Update local .env files
# Edit functions/.env and .env.local with new secret

# 4. Update Vercel
vercel env add INTERNAL_SERVICE_SECRET
# (Enter new secret when prompted, replace existing)

# 5. Deploy Functions
cd functions
npm run build
firebase deploy --only functions

# 6. Redeploy Next.js
vercel --prod

# 7. Verify deployment
firebase functions:log --only scheduledMatchingPreview --limit 10
```

---

## Troubleshooting

### Error: "INTERNAL_SERVICE_SECRET is not set"

**Symptoms**:
```
[Functions log] ❌ INTERNAL_SERVICE_SECRET is not set; aborting scheduled preview
```

**Solutions**:
1. Verify Firebase config is set:
   ```bash
   firebase functions:config:get INTERNAL_SERVICE_SECRET
   ```

2. If empty, set it:
   ```bash
   firebase functions:config:set INTERNAL_SERVICE_SECRET="YOUR_SECRET"
   firebase deploy --only functions
   ```

3. For local emulator, check `functions/.env`:
   ```bash
   cat functions/.env | grep INTERNAL_SERVICE_SECRET
   ```

### Error: "Authentication failed" (401)

**Symptoms**:
```
POST /api/admin/matching/preview → 401 Unauthorized
```

**Solutions**:
1. Verify secrets match across all environments:
   ```bash
   # Firebase
   firebase functions:config:get INTERNAL_SERVICE_SECRET

   # Vercel
   vercel env pull .env.vercel.local
   cat .env.vercel.local | grep INTERNAL_SERVICE_SECRET
   ```

2. Check header name is correct:
   - Functions: `"X-Internal-Secret"` (exact case)
   - API Route: `request.headers.get('x-internal-secret')` (lowercase)

3. Ensure secret contains no extra whitespace or quotes

### Error: "Preview API failed: 500"

**Possible causes**:
- Secret mismatch between Firebase and Next.js
- Environment variable not loaded in Vercel
- Typo in header name
- Secret value has trailing newline or whitespace

**Debug steps**:
```bash
# 1. Check Next.js logs
vercel logs pslanding --follow

# 2. Look for:
# ❌ "expectedSecret is undefined" → Environment variable not set in Vercel
# ✅ "Internal service authenticated" → Secret is working
# ❌ "Unauthorized" → Secret mismatch

# 3. Test manually with curl
curl -X POST https://philipandsophy.vercel.app/api/admin/matching/preview \
  -H "Content-Type: application/json" \
  -H "X-Internal-Secret: YOUR_SECRET_HERE" \
  -d '{"cohortId":"1"}' \
  -v
```

### Secret Not Loading in Functions

**Issue**: Function returns early with "INTERNAL_SERVICE_SECRET is not set"

**Solution**:
```bash
# 1. Verify config is set
firebase functions:config:get

# 2. If not set, configure it
firebase functions:config:set INTERNAL_SERVICE_SECRET="YOUR_SECRET"

# 3. Redeploy (config changes require redeployment)
cd functions
npm run build
firebase deploy --only functions

# 4. Verify logs
firebase functions:log --only scheduledMatchingPreview --follow
```

### Local Emulator Not Using Secret

**Issue**: Local emulator doesn't pick up `firebase functions:config:set` values

**Solution**: Use `.env` file for local development:
```bash
cd functions
echo 'INTERNAL_SERVICE_SECRET=YOUR_SECRET_HERE' >> .env
npm run serve
```

---

## Implementation Details

### Firebase Functions (Sender)

```typescript
// functions/src/index.ts

// 1. Define parameter with default value (prevents crashes)
const internalSecretParam = defineString("INTERNAL_SERVICE_SECRET", {
  description: "Internal secret for Cron ↔ Next.js API authentication",
  default: "", // ← Prevents function from crashing if not set
});

// 2. In scheduled function
export const scheduledMatchingPreview = onSchedule(
  {
    schedule: "0 5 * * *", // Daily at 5 AM KST
    timeZone: "Asia/Seoul",
  },
  async (event) => {
    const internalSecret = internalSecretParam.value();

    // 3. Early return if not configured (safe failure)
    if (!internalSecret) {
      logger.error("INTERNAL_SERVICE_SECRET is not set; aborting scheduled preview");
      return; // ← Function exits gracefully, no crash
    }

    // 4. Use secret in API call
    const response = await fetch(`${apiBaseUrl}/api/admin/matching/preview`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret": internalSecret, // ← Secret sent here
      },
      body: JSON.stringify({ cohortId }),
    });
  }
);
```

### Next.js API Route (Receiver)

```typescript
// src/app/api/admin/matching/preview/route.ts

export async function POST(request: NextRequest) {
  // 1. Extract secret from header
  const internalSecret = request.headers.get('x-internal-secret');
  const expectedSecret = process.env.INTERNAL_SERVICE_SECRET;

  // 2. Validate secret
  let isInternalCall = false;
  if (internalSecret && expectedSecret && internalSecret === expectedSecret) {
    isInternalCall = true; // ← Auth bypass
    logger.info('[Matching Preview] Internal service authenticated via secret');
  }

  // 3. Fallback to admin auth if not internal call
  if (!isInternalCall) {
    const { user, error } = await requireWebAppAdmin(request);
    if (error) {
      return error; // 401 Unauthorized
    }
  }

  // 4. Proceed with matching logic
  // ...
}
```

---

## Configuration Summary

### Required Environment Variables

| Environment | Variable Name | How to Set | Used By |
|------------|---------------|------------|---------|
| **Firebase Production** | `INTERNAL_SERVICE_SECRET` | `firebase functions:config:set` | Deployed Functions |
| **Firebase Local** | `INTERNAL_SERVICE_SECRET` | `functions/.env` file | Local emulator |
| **Next.js Local** | `INTERNAL_SERVICE_SECRET` | `.env.local` file | Local dev server |
| **Vercel Production** | `INTERNAL_SERVICE_SECRET` | Vercel Dashboard/CLI | Deployed Next.js app |

### Value Consistency

**CRITICAL**: All four environments must use **identical** secret values.

```bash
# Example: Same secret everywhere
Firebase config:   vDnfEPFeaqqqn5PhTYTgpSPTsqGlRrss9p0XJ+VPET8=
functions/.env:    vDnfEPFeaqqqn5PhTYTgpSPTsqGlRrss9p0XJ+VPET8=
.env.local:        vDnfEPFeaqqqn5PhTYTgpSPTsqGlRrss9p0XJ+VPET8=
Vercel env:        vDnfEPFeaqqqn5PhTYTgpSPTsqGlRrss9p0XJ+VPET8=
```

---

## Related Documentation

- [Deployment Checklist](./DEPLOYMENT-CHECKLIST.md) - Production deployment steps
- [Firebase Functions Configuration](https://firebase.google.com/docs/functions/config-env)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)

---

**Last Updated**: 2025-10-20
**Maintainer**: Development Team
