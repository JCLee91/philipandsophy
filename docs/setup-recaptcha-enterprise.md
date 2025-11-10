# 🔐 reCAPTCHA Enterprise 설정 가이드

## 📋 설정 단계

### 1. Google Cloud Console에서 Enterprise 키 생성

1. **Google Cloud Console 접속**
   ```
   https://console.cloud.google.com/security/recaptcha?project=philipandsophy
   ```

2. **Create Key 클릭**
   - **Display name**: PhilipAndSophy Web
   - **Platform type**: Website
   - **Domain list**:
     ```
     localhost
     philipandsophy.com
     *.vercel.app
     philipandsophy.firebaseapp.com
     philipandsophy.web.app
     ```

3. **생성된 Site Key 복사**
   - 예: `6LdxxxxxxxxxxxxxxxxxxxxxxxxxxxxG`

### 2. Firebase Console에 Enterprise 키 연결

1. **Firebase Console 접속**
   ```
   https://console.firebase.google.com/project/philipandsophy/authentication/settings
   ```

2. **Sign-in method → Phone 탭**

3. **reCAPTCHA Enterprise verification** 섹션
   - Site Key 입력 (위에서 복사한 키)
   - Save 클릭

### 3. 환경 변수 설정 (.env.local)

```env
# reCAPTCHA Enterprise
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=6LdxxxxxxxxxxxxxxxxxxxxxxxxxxxxG
NEXT_PUBLIC_RECAPTCHA_PROJECT_ID=philipandsophy
```

### 4. 코드 업데이트 (이미 완료됨)

✅ **CSP 헤더 수정** - `next.config.ts`
```typescript
frame-src 'self' https://www.google.com https://recaptcha.google.com;
frame-ancestors 'self' https://www.google.com;
```

✅ **개발 환경 비활성화** - `auth-enhanced.ts`
```typescript
if (process.env.NODE_ENV === 'development') {
  auth.settings.appVerificationDisabledForTesting = true;
}
```

## 🧪 테스트 방법

### 개발 환경 (localhost)
1. `npm run dev`
2. reCAPTCHA가 자동으로 비활성화됨
3. 전화번호 인증이 바로 진행됨

### 프로덕션 환경
1. Enterprise 키가 설정되어 있으면 invisible reCAPTCHA 작동
2. 사용자는 reCAPTCHA를 보지 않고 자동으로 인증됨

## 🚨 트러블슈팅

### 여전히 에러가 발생하는 경우

1. **브라우저 캐시 삭제**
   - 개발자 도구 > Application > Storage > Clear site data

2. **Firebase Auth Domain 확인**
   ```javascript
   // firebase/config.ts
   authDomain: 'philipandsophy.firebaseapp.com', // 또는 .web.app
   ```

3. **테스트 전화번호 사용**
   - Firebase Console > Authentication > Settings > Phone
   - Test phone numbers 추가:
     ```
     +82 10-1234-5678 → 123456
     ```

## 📝 체크리스트

- [ ] Google Cloud Console에서 Enterprise 키 생성
- [ ] Firebase Console에 Site Key 입력
- [ ] .env.local에 환경 변수 추가
- [ ] 브라우저 캐시 삭제
- [ ] 개발 환경에서 테스트
- [ ] 프로덕션 배포 후 확인

## 🔗 관련 링크

- [Google Cloud reCAPTCHA Console](https://console.cloud.google.com/security/recaptcha)
- [Firebase Phone Auth 문서](https://firebase.google.com/docs/auth/web/phone-auth)
- [reCAPTCHA Enterprise 문서](https://cloud.google.com/recaptcha-enterprise/docs)

---
*Last Updated: 2025-11-10*