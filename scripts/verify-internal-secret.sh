#!/bin/bash

# Verification script for Internal Service Secret setup
# Tests that the secret is properly configured in both Firebase and Next.js

set -e  # Exit on any error

echo "🔍 Verifying Internal Service Secret Configuration..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo -e "${RED}❌ Firebase CLI is not installed${NC}"
    echo "Install with: npm install -g firebase-tools"
    exit 1
fi

echo "✅ Firebase CLI is installed"
echo ""

# Step 1: Check Firebase Functions config
echo "📋 Step 1: Checking Firebase Functions configuration..."
echo ""

if firebase functions:config:get INTERNAL_SERVICE_SECRET &> /dev/null; then
    SECRET_VALUE=$(firebase functions:config:get INTERNAL_SERVICE_SECRET 2>&1)

    if [ -z "$SECRET_VALUE" ] || [ "$SECRET_VALUE" == "{}" ]; then
        echo -e "${RED}❌ INTERNAL_SERVICE_SECRET not set in Firebase Functions${NC}"
        echo ""
        echo "Set it with:"
        echo "  firebase functions:config:set INTERNAL_SERVICE_SECRET=\"YOUR_SECRET_HERE\""
        exit 1
    else
        echo -e "${GREEN}✅ INTERNAL_SERVICE_SECRET is set in Firebase Functions${NC}"
    fi
else
    echo -e "${RED}❌ Failed to check Firebase Functions config${NC}"
    echo "Make sure you are logged in: firebase login"
    exit 1
fi

echo ""

# Step 2: Check local .env.local
echo "📋 Step 2: Checking local .env.local..."
echo ""

if [ -f .env.local ]; then
    if grep -q "INTERNAL_SERVICE_SECRET" .env.local; then
        echo -e "${GREEN}✅ INTERNAL_SERVICE_SECRET found in .env.local${NC}"

        # Extract the value (basic extraction, not parsing)
        LOCAL_SECRET=$(grep "INTERNAL_SERVICE_SECRET" .env.local | cut -d '=' -f2 | tr -d '"' | tr -d ' ')

        if [ -z "$LOCAL_SECRET" ]; then
            echo -e "${YELLOW}⚠️  INTERNAL_SERVICE_SECRET is empty in .env.local${NC}"
        fi
    else
        echo -e "${RED}❌ INTERNAL_SERVICE_SECRET not found in .env.local${NC}"
        echo ""
        echo "Add it to .env.local:"
        echo "  INTERNAL_SERVICE_SECRET=\"YOUR_SECRET_HERE\""
        exit 1
    fi
else
    echo -e "${RED}❌ .env.local file not found${NC}"
    echo ""
    echo "Create .env.local with:"
    echo "  INTERNAL_SERVICE_SECRET=\"YOUR_SECRET_HERE\""
    exit 1
fi

echo ""

# Step 3: Check if secrets match (basic check)
echo "📋 Step 3: Verifying secret consistency..."
echo ""

# Note: This is a basic check. Firebase config:get returns JSON structure,
# so we can't directly compare values without proper JSON parsing.
echo -e "${YELLOW}⚠️  Manual verification required:${NC}"
echo ""
echo "Firebase Functions secret (partial):"
echo "$SECRET_VALUE" | head -c 50
echo "..."
echo ""
echo "Local .env.local secret (partial):"
echo "$LOCAL_SECRET" | head -c 50
echo "..."
echo ""
echo -e "${YELLOW}👉 Ensure these values match exactly${NC}"
echo ""

# Step 4: Check Vercel environment (optional, requires Vercel CLI)
echo "📋 Step 4: Checking Vercel environment (optional)..."
echo ""

if command -v vercel &> /dev/null; then
    echo "Vercel CLI detected. Checking production environment..."

    if vercel env ls 2>&1 | grep -q "INTERNAL_SERVICE_SECRET"; then
        echo -e "${GREEN}✅ INTERNAL_SERVICE_SECRET found in Vercel environment${NC}"
    else
        echo -e "${YELLOW}⚠️  INTERNAL_SERVICE_SECRET not found in Vercel${NC}"
        echo ""
        echo "Add it with:"
        echo "  vercel env add INTERNAL_SERVICE_SECRET"
    fi
else
    echo -e "${YELLOW}⚠️  Vercel CLI not installed (skipping Vercel check)${NC}"
    echo "Install with: npm i -g vercel"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Verification Complete!"
echo ""
echo "Next steps:"
echo "  1. Ensure secrets match in Firebase and Next.js"
echo "  2. Deploy Functions: cd functions && firebase deploy --only functions"
echo "  3. Deploy Next.js: vercel --prod"
echo "  4. Test the scheduled function manually"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
