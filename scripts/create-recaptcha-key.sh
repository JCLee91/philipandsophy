#!/bin/bash

# reCAPTCHA Enterprise Key 생성 스크립트

PROJECT_ID="philipandsophy"
KEY_NAME="philipandsophy-web"
DISPLAY_NAME="PhilipAndSophy Web"

echo "🔐 Creating reCAPTCHA Enterprise key..."

# gcloud 경로 설정
GCLOUD_PATH="$HOME/google-cloud-sdk/bin/gcloud"

# 도메인 리스트
DOMAINS=(
  "localhost"
  "philipandsophy.com"
  "philipandsophy.vercel.app"
  "philipandsophy.firebaseapp.com"
  "philipandsophy.web.app"
)

# 도메인을 쉼표로 구분된 문자열로 변환
DOMAIN_LIST=$(IFS=,; echo "${DOMAINS[*]}")

# API를 통해 직접 생성
echo "Creating key via API..."

# Firebase CLI를 사용해서 인증 토큰 가져오기
ACCESS_TOKEN=$(${GCLOUD_PATH} auth print-access-token 2>/dev/null)

if [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ Failed to get access token. Please run: gcloud auth login"
  exit 1
fi

# reCAPTCHA Enterprise key 생성
RESPONSE=$(curl -s -X POST \
  "https://recaptchaenterprise.googleapis.com/v1/projects/${PROJECT_ID}/keys" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "'"${DISPLAY_NAME}"'",
    "webSettings": {
      "integrationType": "CHECKBOX",
      "allowedDomains": ["localhost", "philipandsophy.com", "philipandsophy.vercel.app", "philipandsophy.firebaseapp.com", "philipandsophy.web.app"],
      "allowAmpTraffic": false,
      "challengeSecurityPreference": "USABILITY"
    }
  }')

echo "API Response:"
echo "$RESPONSE" | python3 -m json.tool

# Site Key 추출
SITE_KEY=$(echo "$RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('name', '').split('/')[-1] if 'name' in data else '')")

if [ -z "$SITE_KEY" ]; then
  echo "❌ Failed to create key"
  echo "Response: $RESPONSE"
  exit 1
fi

echo ""
echo "✅ reCAPTCHA Enterprise key created successfully!"
echo ""
echo "📝 Site Key: ${SITE_KEY}"
echo ""
echo "🔗 Next Steps:"
echo "1. Add to .env.local:"
echo "   NEXT_PUBLIC_RECAPTCHA_SITE_KEY=${SITE_KEY}"
echo ""
echo "2. Go to Firebase Console:"
echo "   https://console.firebase.google.com/project/philipandsophy/authentication/settings"
echo "   - Sign-in method → Phone"
echo "   - Add this Site Key: ${SITE_KEY}"
echo ""
echo "3. Restart your development server"