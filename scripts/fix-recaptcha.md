# 📱 Firebase Phone Auth reCAPTCHA 에러 해결 가이드

## 🔍 에러 내용
- reCAPTCHA Enterprise config 초기화 실패
- sendVerificationCode API 400 에러

## 🛠️ 해결 방법

### 방법 1: Firebase Console에서 설정 확인

1. **Firebase Console 접속**
   - https://console.firebase.google.com/project/philipandsophy/authentication/settings

2. **App Check 탭 확인**
   - Authentication > Settings > App Check
   - reCAPTCHA Enterprise 키 확인

3. **Authorized Domains 확인**
   - Authentication > Settings > Authorized Domains
   - 다음 도메인이 등록되어 있는지 확인:
     - localhost
     - philipandsophy.com
     - *.vercel.app
     - *.run.app

### 방법 2: reCAPTCHA v3 Site Key 추가

1. **Google Cloud Console 접속**
   - https://console.cloud.google.com/security/recaptcha?project=philipandsophy

2. **Enterprise Key 생성** (없다면)
   - Type: Website
   - Domains:
     - localhost
     - philipandsophy.com
     - *.vercel.app

3. **.env.local에 추가**
   ```env
   NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your_site_key_here
   ```

### 방법 3: 임시 해결책 - Testing Phone Numbers 사용

1. **Firebase Console > Authentication > Sign-in method > Phone**
2. **Phone numbers for testing** 섹션
3. 테스트 번호 추가:
   ```
   +82 10-1234-5678 → 123456
   +82 10-9876-5432 → 654321
   ```

### 방법 4: reCAPTCHA 설정 수정 (코드)

`src/lib/firebase/auth-enhanced.ts` 수정:

```typescript
export function initInvisibleRecaptcha(): RecaptchaVerifier {
  const auth = getFirebaseAuth();

  // reCAPTCHA Enterprise 비활성화 옵션 추가
  return new RecaptchaVerifier(auth, 'recaptcha-container', {
    size: 'invisible',
    callback: () => {
      logger.info('reCAPTCHA solved successfully');
    },
    'expired-callback': () => {
      logger.warn('reCAPTCHA expired, need to re-render');
    },
    'error-callback': (error) => {
      logger.error('reCAPTCHA error:', error);
    },
    // Enterprise 비활성화
    'disabled-for-testing': process.env.NODE_ENV === 'development',
  });
}
```

### 방법 5: App Check 임시 비활성화

Firebase Console에서:
1. **Authentication > Settings > App Check**
2. **Enforcement** 토글 OFF

## 🚨 즉시 적용 가능한 해결책

### 1. 테스트 모드 활성화
Firebase Console에서 테스트 전화번호를 추가하면 reCAPTCHA 없이 로그인 가능:

```
전화번호: +82 10-1234-5678
인증코드: 123456
```

### 2. 브라우저 캐시 삭제
1. 개발자 도구(F12) 열기
2. Application > Storage > Clear site data
3. 페이지 새로고침

### 3. Firebase Auth 도메인 직접 사용
현재 설정:
```
authDomain: philipandsophy.firebaseapp.com
```

변경 후:
```
authDomain: philipandsophy.web.app
```

## 📝 체크리스트

- [ ] Firebase Console에서 Authorized Domains 확인
- [ ] App Check 설정 확인 (필요시 비활성화)
- [ ] 테스트 전화번호 추가
- [ ] 브라우저 캐시 삭제
- [ ] 로컬 환경에서 테스트

## 🔗 참고 링크
- [Firebase Phone Auth 문서](https://firebase.google.com/docs/auth/web/phone-auth)
- [reCAPTCHA Enterprise 설정](https://cloud.google.com/recaptcha-enterprise/docs/create-key)
- [App Check 문서](https://firebase.google.com/docs/app-check)