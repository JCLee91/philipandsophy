# Firebase Admin SDK 일반적인 문제 해결

**Last Updated**: 2025-10-22
**Category**: troubleshooting

---

## 📌 개요

Firebase Admin SDK 사용 시 발생할 수 있는 일반적인 문제와 해결 방법을 정리한 문서입니다.

---

## 🚨 Critical Issues

### Issue #1: Firestore settings() 중복 호출 에러

#### 증상
```
Error: Firestore has already been initialized.
You can only call settings() once, and only before calling any other methods on a Firestore object.
```

#### 원인
```typescript
// ❌ 잘못된 코드 - 매번 settings() 호출
export function getAdminDb() {
  const app = getAdminApp();
  const db = app.firestore();
  db.settings({ ignoreUndefinedProperties: true }); // 🚨 매번 호출 시 에러!
  return db;
}
```

**문제점:**
- `firestore.settings()`는 **한 번만** 호출 가능
- `getAdminDb()`가 여러 API route에서 호출될 때마다 settings() 재실행
- 두 번째 호출부터 에러 발생

#### 해결 방법

**Solution 1: settings() 제거 (권장)**

```typescript
// ✅ 올바른 코드 - settings() 제거
export function getAdminDb() {
  const app = getAdminApp();
  if (!app) {
    throw new Error('Firebase Admin is not initialized. Check your credentials.');
  }
  return app.firestore(); // settings() 호출하지 않음
}
```

**장점:**
- 가장 간단하고 안전
- `ignoreUndefinedProperties`는 선택사항 (없어도 작동)
- undefined 값은 코드에서 검증하는 것이 더 안전

**Solution 2: 캐싱 (복잡한 경우)**

```typescript
// ⚠️ 복잡한 방법 - 캐싱 사용
let cachedDb: admin.firestore.Firestore | null = null;

export function getAdminDb() {
  const app = getAdminApp();
  if (!app) {
    throw new Error('Firebase Admin is not initialized.');
  }

  if (!cachedDb) {
    cachedDb = app.firestore();
    cachedDb.settings({ ignoreUndefinedProperties: true });
  }

  return cachedDb;
}
```

**사용 시점:** settings()가 반드시 필요한 경우만

#### 재발 방지

**1. 코드 리뷰 체크리스트:**
- [ ] `db.settings()` 호출이 있는가?
- [ ] 함수가 여러 번 호출될 수 있는가?
- [ ] 캐싱 없이 매번 새 인스턴스를 반환하는가?

**2. 커밋 전 확인:**
```bash
# Firebase Admin 관련 변경사항 검색
git diff | grep -A 5 "db.settings"
git diff | grep -A 5 "firestore().settings"
```

**3. 테스트:**
```typescript
// 두 번 호출해도 에러가 나지 않는지 확인
const db1 = getAdminDb();
const db2 = getAdminDb(); // 에러 발생하면 안 됨
```

---

## 📋 발생 사례 분석

### Case Study: 2025-10-22 매칭 API 401 에러

**상황:**
- AI 매칭 기능이 갑자기 작동하지 않음
- 401 Unauthorized 에러 발생
- 로그인은 정상, 권한도 정상

**근본 원인:**
```
Commit: 1fc8f3f (2025-10-21 18:44:42)
제목: "feat: 랜딩페이지 및 프로그램 이미지 무손실 WebP 업데이트"

부수 변경: Firebase admin 권한 체크 로직 개선
→ getAdminDb()에 db.settings() 추가
→ 여러 API route에서 호출 시 충돌
```

**교훈:**
1. **한 커밋 = 한 목적** 원칙 준수
2. 이미지 최적화 작업에 Firebase 로직 변경을 섞지 말 것
3. Firebase Admin SDK의 싱글톤 특성 이해

**타임라인:**
- 2025-10-11: 안전한 코드 (settings() 없음)
- 2025-10-21: db.settings() 추가 (문제 발생)
- 2025-10-22: settings() 제거 (해결)

---

## ⚠️ 기타 일반적인 문제

### 1. Firebase Admin 초기화 실패

#### 증상
```
Error: Missing Firebase Admin credentials
```

#### 해결
```bash
# .env.local 확인
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_service_account@project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**주의사항:**
- `FIREBASE_PRIVATE_KEY`는 따옴표로 감싸기
- `\n`을 실제 줄바꿈으로 변경하지 말 것
- 환경 변수 변경 후 서버 재시작 필수

### 2. 중복 초기화 에러

#### 증상
```
Error: The default Firebase app already exists
```

#### 해결
```typescript
// ✅ 올바른 초기화 패턴
function initializeAdminApp() {
  if (admin.apps.length > 0) {
    return admin.app(); // 이미 초기화됨
  }

  return admin.initializeApp({
    credential: admin.credential.cert(config),
  });
}
```

### 3. 권한 문제

#### 증상
```
Error: Permission denied (Firestore)
```

#### 체크리스트
- [ ] Service Account에 적절한 IAM 역할이 있는가?
- [ ] Firestore Security Rules가 올바른가?
- [ ] Admin SDK는 모든 권한을 가지므로 rules 무시됨

---

## 🔧 디버깅 팁

### 로그 추가
```typescript
import { logger } from '@/lib/logger';

export function getAdminDb() {
  logger.debug('getAdminDb called');
  const app = getAdminApp();
  logger.debug('Firebase app obtained', { appName: app?.name });
  return app.firestore();
}
```

### 환경 변수 검증
```typescript
function validateAdminConfig() {
  const required = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing env vars: ${missing.join(', ')}`);
  }
}
```

---

## 📚 관련 문서

- [Firebase Admin SDK 설정](../setup/admin-sdk.md)
- [Firebase 보안 가이드](../setup/firebase-security-quickstart.md)
- [Database Schema](../database/schema.md)

---

## 🚀 베스트 프랙티스

### DO ✅

1. **단순하게 유지**
   ```typescript
   export function getAdminDb() {
     return getAdminApp().firestore();
   }
   ```

2. **에러 처리**
   ```typescript
   export function getAdminDb() {
     const app = getAdminApp();
     if (!app) {
       throw new Error('Firebase Admin not initialized');
     }
     return app.firestore();
   }
   ```

3. **초기화 체크**
   ```typescript
   if (admin.apps.length > 0) {
     return admin.app();
   }
   ```

### DON'T ❌

1. **settings() 남발하지 말기**
   ```typescript
   // ❌ 매번 settings() 호출
   export function getAdminDb() {
     const db = app.firestore();
     db.settings({ /* ... */ }); // 위험!
     return db;
   }
   ```

2. **중복 초기화**
   ```typescript
   // ❌ 매번 새로 초기화
   admin.initializeApp(config); // 에러 발생
   ```

3. **동기 초기화**
   ```typescript
   // ❌ 빌드 시점에 실행
   const db = admin.firestore(); // 모듈 레벨에서 실행 금지
   ```

---

## 📝 체크리스트

**Firebase Admin 코드 작성 시:**

- [ ] `db.settings()`를 사용하는가? → 제거 고려
- [ ] 함수가 여러 번 호출되는가? → 싱글톤 패턴 필요
- [ ] 초기화 실패를 처리하는가? → try-catch 추가
- [ ] 환경 변수가 모두 설정되었는가? → 검증 로직 추가
- [ ] 로컬/프로덕션 모두 테스트했는가?

**커밋 전:**

- [ ] Firebase 관련 변경사항만 포함되었는가?
- [ ] 부수 효과가 없는가?
- [ ] 다른 API route에 영향을 주지 않는가?
- [ ] 문서를 업데이트했는가?

---

*이 문서는 실제 발생한 문제를 바탕으로 작성되었습니다. 새로운 이슈 발견 시 계속 업데이트됩니다.*
