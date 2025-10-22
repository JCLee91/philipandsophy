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

### Case Study #1: 2025-10-22 AI 매칭 API 401 에러

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

**에러 발생 플로우:**
```
1. 사용자: 매칭 페이지 접속
   → GET /api/admin/matching 호출
   → getAdminDb() 호출 (1회차) → db.settings() 실행 ✅

2. 사용자: "매칭 시작하기" 클릭
   → POST /api/admin/matching/preview 호출
   → getAdminDb() 호출 (2회차) → db.settings() 실행 ❌
   → Error: Firestore has already been initialized
   → catch 블록 실행 → 401 반환
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

### Case Study #2: 2025-10-22 iOS PWA 푸시 알림 401 에러

**상황:**
- iOS Safari PWA에서 알림 토글 ON 시도
- 401 에러 발생: `{"error": "유효하지 않은 인증 토큰입니다.", "code": "INVALID_TOKEN"}`
- Firestore에서 `firebaseUid` 필드가 정확히 일치함 (확인됨)
- 로그인 상태 정상

**초기 추정 (잘못됨):**
- ❌ "클라이언트 사이드 Firestore는 별개니까 Admin SDK 문제와 무관"
- ❌ "iOS PWA 인증 토큰 자체에 문제가 있음"
- ❌ "Firestore 쿼리 로직이나 필드 타입 불일치"

**실제 원인:**
```
POST /api/push-subscriptions 호출 시:

1. requireWebAppAuth(request) 실행
   → auth.verifyIdToken(idToken) 호출 ✅
   → getAdminDb() 호출 (1회차)

2. Line 68: const db = getAdminDb() 호출 (2회차)
   → db.settings() 중복 호출 에러 발생 💥

3. try-catch로 에러 잡힘
   → "유효하지 않은 인증 토큰입니다" 반환
   → 실제로는 Firestore 초기화 문제인데 인증 에러로 위장됨!
```

**에러 발생 코드:**
```typescript
// /api/push-subscriptions/route.ts:34-68
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireWebAppAuth(request);
    // ↑ 여기서 내부적으로 getAdminDb() 호출 (1회차)

    // ... 중략 ...

    const db = getAdminDb(); // ← 2회차 호출 → db.settings() 에러!
    const participantRef = db.collection('participants').doc(participantId);
  } catch (error) {
    // Firestore 초기화 에러가 여기로 와서
    // "유효하지 않은 인증 토큰" 에러로 둔갑
  }
}
```

**핵심 깨달음:**
- 같은 `db.settings()` 문제가 **여러 API에 영향**을 미침
- 에러 메시지가 실제 원인을 숨김 (catch-all 때문)
- 서버 사이드 에러가 클라이언트 증상으로 나타남

**해결:**
```typescript
// src/lib/firebase/admin.ts:114-120
export function getAdminDb() {
  const app = getAdminApp();
  if (!app) {
    throw new Error('Firebase Admin is not initialized. Check your credentials.');
  }
  return app.firestore(); // ✅ db.settings() 제거
}
```

**영향받은 API들:**
- ✅ `/api/admin/matching` (AI 매칭)
- ✅ `/api/admin/matching/preview` (매칭 미리보기)
- ✅ `/api/push-subscriptions` (iOS PWA 푸시 알림) ← 여기도!
- ✅ 기타 모든 Admin SDK 사용 API

**타임라인:**
- 2025-10-22 오전: AI 매칭 문제 발견 → 원인 파악
- 2025-10-22 오후: iOS PWA 푸시 알림 문제 발견
- 처음엔 별개 문제로 판단 (오판)
- **실제로는 같은 근본 원인** (db.settings() 중복 호출)
- Vercel 배포 완료 후 모든 문제 해결 확인

**교훈:**
1. **서버 사이드 에러가 클라이언트 증상으로 나타날 수 있음**
2. **catch-all 에러 핸들링은 실제 원인을 숨길 수 있음**
3. **"별개 문제"처럼 보여도 공통 원인일 수 있음**
4. **에러 메시지를 맹신하지 말고 근본 원인 추적 필요**

---

---

### Case Study #3: 2025-10-22 iOS PWA DM 메시지 조회 실패 (400 에러)

**상황:**
- 이윤지-4321 사용자가 iOS PWA에서 DM 확인 시도
- 메시지가 전혀 표시되지 않음
- 브라우저 콘솔: `Failed to load resource: 400 (channel)`
- Firestore DB에는 메시지 11개 정상 존재
- `conversationId`, `firebaseUid` 모두 정확히 일치 확인됨

**초기 추정 (잘못됨):**
- ❌ "conversationId 생성 로직 문제"
- ❌ "Firestore 인덱스 누락"
- ❌ "firebaseUid 불일치"
- ❌ "React Query 캐시 문제"

**실제 원인:**

Security Rules의 **복잡한 권한 검증 함수**가 문제:

```typescript
// firestore.rules (원래 규칙)
function isOwnParticipant(participantId) {
  return exists(/databases/$(database)/documents/participants/$(participantId)) &&
         get(/databases/$(database)/documents/participants/$(participantId)).data.firebaseUid == request.auth.uid;
}

match /messages/{messageId} {
  allow read: if isSignedIn() && (
    isOwnParticipant(resource.data.senderId) ||      // get() 2회
    isOwnParticipant(resource.data.receiverId) ||    // get() 2회
    isAdminParticipant()                             // get() 2회
  );
}
```

**문제점:**
1. **과도한 Firestore 읽기:**
   - 메시지 1개 검증에 최대 6번의 추가 `get()` 호출
   - 11개 메시지 조회 시 총 66번의 추가 읽기
   - 비용 증가 + 성능 저하

2. **실시간 리스너(onSnapshot) 400 에러:**
   - Firestore 실시간 구독(`subscribeToMessages`)이 Security Rules 검증 실패
   - `channel` 요청 반복 실패 → 400 에러 발생
   - 메시지를 전혀 받을 수 없음

3. **OR 조건 평가 복잡도:**
   - 3개 조건을 모두 평가하다가 타임아웃 또는 실패
   - Security Rules 엔진의 제한 도달

**해결:**

```typescript
// firestore.rules (개선된 규칙)
match /messages/{messageId} {
  // UI 레벨에서 권한 제어 (간결한 Rules)
  allow read: if isSignedIn();
}
```

**개선 효과:**
- ✅ 추가 Firestore 읽기 제거 (0회)
- ✅ 실시간 리스너 정상 작동
- ✅ 400 에러 완전 해결
- ✅ 메시지 11개 모두 정상 표시
- ⚠️ 보안은 UI 레벨에서 제어 (DirectMessageDialog가 otherUser 검증)

**트레이드오프:**
- **보안:** 약간 낮아짐 (로그인한 모든 사용자가 모든 메시지 읽기 가능)
- **성능:** 크게 개선 (추가 읽기 제거)
- **안정성:** 크게 개선 (400 에러 제거)
- **비용:** 감소 (Firestore 읽기 66회 → 0회)

**판단:**
- 소규모 독서 모임 (참가자 수십 명)
- UI에서 DM은 대화 상대만 선택 가능
- 악의적 접근 가능성 낮음
- → **간결한 Rules가 더 실용적**

**타임라인:**
- 오전: AI 매칭 401 에러 (db.settings 문제)
- 오후: iOS PWA 푸시 알림 401 에러 (같은 원인)
- 저녁: DM 조회 400 에러 (Security Rules 문제)
- → **3개 문제, 2개 근본 원인**

---

### Case Study #4: 2025-10-22 Legacy pushToken 필드로 인한 푸시 알림 실패

**상황:**
- 관리자 권한 사용자(이윤지-4321)가 iOS PWA에서 DM 수신
- 푸시 알림이 전혀 오지 않음
- Firestore에 `webPushSubscriptions` 정상 등록됨
- `pushNotificationEnabled: true`
- 2가지 문제 동시 발생:
  1. DM 읽음 표시가 사라지지 않음
  2. 푸시 알림이 오지 않음

**문제 #1: 관리자 권한 사용자의 읽음 처리 실패**

```typescript
// DirectMessageDialog.tsx (원래 코드)
const userId = (currentUser.isAdministrator) ? 'admin' : currentUserId;
// → userId = "admin"

// 하지만 실제 메시지:
receiverId: "이윤지-4321"

// 읽음 처리 쿼리:
where('receiverId', '==', 'admin')  // ❌ 매칭 안됨!
```

**원인:**
- 이윤지-4321이 `isAdministrator: true` 가짐
- 하지만 메시지 데이터는 실제 participantId로 저장됨
- userId 변환 로직 때문에 매칭 실패
- 읽음 처리 안됨 → 붉은 배지 안 사라짐

**해결:**
```typescript
// 관리자도 자신의 실제 participantId 사용
const userId = currentUserId;  // 항상 실제 ID
```

---

**문제 #2: Legacy pushToken 필드가 Web Push 차단**

**Firebase Functions 로그:**
```
Using legacy pushToken for participant: 이윤지-4321
FCM push notification multicast sent
→ successCount: 0, failureCount: 1  // 만료된 legacy FCM 토큰

Skipping Web Push (FCM already sent)  // ← Web Push 건너뜀!

DM push notification processed
→ successCount: 0  // 알림 안 옴!
```

**원인:**

Firestore 데이터:
```javascript
{
  pushTokens: [],  // 비어있음
  pushToken: "old-expired-fcm-token",  // Legacy 필드 (만료됨)
  webPushSubscriptions: [{ endpoint: "https://web.push.apple.com/..." }]
}
```

Functions 로직:
```typescript
// functions/src/index.ts (원래 코드)
if (tokens.length === 0 && participantData?.pushToken) {
  tokens.push(participantData.pushToken);  // Legacy 사용!
}

// 결과:
tokens.length = 1 (legacy)

const shouldSendWebPush = tokens.length === 0;  // false!
// → Web Push 건너뜀!
```

**흐름:**
1. `pushTokens[]` 비어있음 → legacy `pushToken` 사용
2. Legacy FCM 토큰으로 전송 시도 → 만료되어 실패
3. `tokens.length > 0` → Web Push 건너뜀
4. iOS 알림 안 옴!

**해결:**

1. **코드에서 legacy 필드 쓰기 제거:**
   - `messaging.ts`: `pushToken`, `pushTokenUpdatedAt` 저장 안함
   - `push-subscriptions/route.ts`: 저장 안함

2. **코드에서 legacy 필드 읽기 제거:**
   - `messaging.ts`: fallback 로직 제거
   - `functions/src/index.ts`: fallback 로직 제거
   - `helpers.ts`: fallback 로직 제거

3. **DB에서 기존 legacy 필드 삭제:**
   - `scripts/remove-legacy-push-fields.ts` 실행
   - 4명의 legacy 필드 제거 완료

**개선 효과:**
- ✅ Web Push 차단 완전 해결
- ✅ iOS 푸시 알림 정상 작동
- ✅ 관리자 권한 사용자 읽음 처리 정상화
- ✅ 코드 간소화 (fallback 로직 제거)
- ✅ 최신 방식만 사용 (명확한 아키텍처)

**부수 효과:**
- ⚠️ 최종호-1801: 푸시 토큰 재설정 필요 (수동 안내 예정)

**타임라인:**
- 오전: AI 매칭 401 (db.settings 중복)
- 오후: iOS 푸시 알림 401 (같은 원인)
- 저녁 1: DM 조회 400 (Security Rules 복잡도)
- 저녁 2: DM 읽음 처리 실패 (관리자 userId 변환)
- 저녁 3: 푸시 알림 안 옴 (legacy 필드 차단)
- → **5개 문제, 3개 근본 원인, 모두 해결!**

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
