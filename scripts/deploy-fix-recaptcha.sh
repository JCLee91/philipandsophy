#!/bin/bash

echo "🚀 프로덕션 reCAPTCHA 문제 해결 배포"
echo "====================================="

# 1. Git 커밋
echo "📝 코드 변경사항 커밋..."
git add -A
git commit -m "fix: App Check with reCAPTCHA Enterprise 설정

- App Check 초기화 추가
- reCAPTCHA Enterprise provider 설정
- CSP 헤더에 Google 도메인 허용
- Phone Auth 간소화"

# 2. 배포
echo "🚀 Vercel 배포 시작..."
vercel --prod

echo ""
echo "✅ 배포 완료!"
echo ""
echo "📱 프로덕션 테스트:"
echo "1. https://philipandsophy.vercel.app 접속"
echo "2. 로그인 페이지에서 전화번호 입력"
echo "3. reCAPTCHA 에러 없이 SMS 전송 확인"
echo ""
echo "⚠️  추가 설정 필요:"
echo "Vercel Dashboard에서 환경 변수 추가:"
echo "- NEXT_PUBLIC_RECAPTCHA_SITE_KEY=6Lf5vQcsAAAAAP4vRkf38AJGwZO-ToNDpgAi0KzM"
echo "- NEXT_PUBLIC_RECAPTCHA_PROJECT_ID=philipandsophy"