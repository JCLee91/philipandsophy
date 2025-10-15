# Firebase Phone Auth 구현 가이드 (최종 버전)

**작성일**: 2025-10-15
**기반**: Firebase 공식 문서 + 기존 마이그레이션 코드 분석
**상태**: 구현 준비 완료

---

## 📚 학습한 Firebase 공식 문서 내용

### 1. Firebase Phone Authentication Web 공식 문서

**출처**: https://firebase.google.com/docs/auth/web/phone-auth

#### 핵심 내용:

**1-1. 설정 요구사항**
- Firebase Console → Authentication → Sign-in method → Phone 활성화 필요
- **reCAPTCHA 필수**: 봇 공격 방지를 위해 인증 요청이 허용된 도메인에서 오는지 확인
- ⚠️ **localhost는 허용되지 않음** → 테스트용 전화번호 사용 필요

**1-2. reCAPTCHA 검증 (RecaptchaVerifier)**
```typescript
// Invisible reCAPTCHA (권장)
const recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
  size: 'invisible',
  callback: (response) => {
    // reCAPTCHA 해결됨
  },
  'expired-callback': () => {
    // reCAPTCHA 만료됨
  }
});
```

**1-3. SMS 전송 프로세스**
```typescript
// 1. 전화번호로 SMS 전송
const confirmationResult = await signInWithPhoneNumber(
  auth,
  phoneNumber, // E.164 형식: +821012345678
  recaptchaVerifier
);

// 2. 사용자가 SMS 코드 입력

// 3. 코드 확인
const result = await confirmationResult.confirm(code);
const user = result.user; // Firebase User 객체
```

**1-4. 테스트 전화번호 설정**
- Firebase Console → Authentication → Settings → Phone numbers for testing
- 최대 10개까지 설정 가능
- 형식: `+82 10-1234-5678` → 인증 코드: `123456` (고정 코드)

**1-5. 주의사항**
- **전화번호 형식**: 반드시 E.164 형식 (국가 코드 포함)
- **SMS 비용**: Firebase Blaze 플랜 필요 (종량제)
- **재전송 제한**: 동일 전화번호로 1분당 1회 제한
- **reCAPTCHA cleanup**: 컴포넌트 언마운트 시 `verifier.clear()` 호출 필수

---

### 2. Firebase Admin SDK ID Token 검증

**출처**: https://firebase.google.com/docs/auth/admin/verify-id-tokens

#### 핵심 내용:

**2-1. ID Token 검증 메서드**
```typescript
import { getAuth } from 'firebase-admin/auth';

const decodedToken = await getAuth().verifyIdToken(idToken);
const uid = decodedToken.uid; // Firebase UID
const email = decodedToken.email; // 이메일 (옵션)
const phoneNumber = decodedToken.phone_number; // 전화번호 (옵션)
```

**2-2. ID Token 구조**
- **Header**: 알고리즘 (RS256), 키 ID
- **Payload**:
  - `sub` (subject): Firebase UID
  - `exp` (expiration): 만료 시간 (발급 후 60분)
  - `iat` (issued at): 발급 시간
  - `phone_number`: 전화번호 (Phone Auth 사용 시)
- **Signature**: Firebase Private Key로 서명

**2-3. 보안 고려사항**
- ID Token은 **60분 후 자동 만료** (클라이언트에서 자동 갱신)
- `verifyIdToken()`은 만료 여부, 서명 유효성, 발급자 검증을 모두 수행
- **Revocation Check는 기본적으로 하지 않음** (필요 시 `checkRevoked: true` 옵션)

**2-4. 에러 처리**
```typescript
try {
  const decodedToken = await getAuth().verifyIdToken(idToken);
} catch (error) {
  if (error.code === 'auth/id-token-expired') {
    // ID Token 만료 (클라이언트에서 재갱신 필요)
  } else if (error.code === 'auth/argument-error') {
    // 잘못된 토큰 형식
  } else {
    // 기타 검증 실패
  }
}
```

---

### 3. Next.js + Firebase Auth 모범 사례

**출처**: LogRocket, Medium, GitHub (next-firebase-auth)

#### 핵심 패턴:

**3-1. AuthContext 패턴 (권장)**
```typescript
// 1. AuthContext 생성
const AuthContext = createContext<AuthContextValue>(null);

// 2. onAuthStateChanged로 자동 상태 동기화
useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    setUser(user);
  });
  return () => unsubscribe();
}, []);

// 3. 전역에서 useAuth() 훅 사용
export function useAuth() {
  return useContext(AuthContext);
}
```

**3-2. Server-Side Rendering (SSR) 고려사항**
- Firebase Auth는 기본적으로 **클라이언트 전용**
- Server Component에서 인증 체크: **쿠키 + ID Token 검증**
- Middleware에서 인증 체크: **불가능** (Firebase Admin SDK 사용 불가)

**3-3. 환경 변수 설정**
```env
# 클라이언트에서 접근 가능 (NEXT_PUBLIC_ 접두사)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
```

**3-4. Token Refresh 전략**
- Firebase SDK가 자동으로 ID Token 갱신 (60분마다)
- `user.getIdToken(true)` → 강제 갱신
- API 호출 시 항상 `await user.getIdToken()` 사용 (최신 토큰)

---

## ✅ 이미 완료된 작업 (firebase-auth-migration 폴더)

### 1. 클라이언트 인증 UI ✅

**파일**: `firebase-auth-migration/auth/components/PhoneAuthCard.tsx`

**주요 기능**:
- ✅ 전화번호 입력 → 포맷팅 (010-1234-5678)
- ✅ reCAPTCHA 초기화 (invisible, Strict Mode 대응)
- ✅ SMS 전송 (signInWithPhoneNumber)
- ✅ 인증 코드 입력 (6자리)
- ✅ 인증 코드 확인 (confirmationResult.confirm)
- ✅ Firestore participants 조회 및 firebaseUid 연결
- ✅ 채팅 페이지 리다이렉트
- ✅ 에러 처리 (Firebase 에러 코드 → 한국어 메시지)
- ✅ Race condition 방지 (useRef)
- ✅ RecaptchaVerifier cleanup (메모리 누수 방지)
- ✅ 마지막 로그인 전화번호 저장 (localStorage)

### 2. Auth 상태 관리 훅 ✅

**파일**: `firebase-auth-migration/use-auth.ts`

**주요 기능**:
- ✅ onAuthStateChanged 구독 (자동 세션 감지)
- ✅ Firebase User → Firestore Participant 조회
- ✅ 60일 자동 세션 유지 (Firebase Refresh Token)
- ✅ Race condition 방지 (currentFirebaseUserRef)
- ✅ 로그아웃 함수 (firebaseSignOut + 페이지 리다이렉트)

### 3. Auth 상수 정의 ✅

**파일**: `firebase-auth-migration/auth.ts`

**주요 내용**:
- ✅ 전화번호 검증 규칙
- ✅ 인증 에러 메시지 (한국어)
- ✅ Firebase 에러 코드 매핑
- ✅ reCAPTCHA 설정
- ✅ 로컬스토리지 키
- ✅ 타이밍 상수

---

## 🚧 추가 구현 필요 사항

### Phase 1: Firebase 유틸리티 함수 추가 (1일)

**목표**: Phone Auth 관련 함수를 `src/lib/firebase/index.ts`에 추가

#### 1-1. RecaptchaVerifier 초기화

**추가 위치**: `src/lib/firebase/index.ts`

```typescript
import { RecaptchaVerifier } from 'firebase/auth';
import { RECAPTCHA_CONFIG } from '@/constants/auth';

/**
 * reCAPTCHA Verifier 초기화
 *
 * @param containerId - reCAPTCHA 컨테이너 DOM 요소 ID
 * @param size - 'invisible' | 'normal'
 * @returns RecaptchaVerifier 인스턴스
 */
export function initRecaptcha(
  containerId: string = RECAPTCHA_CONFIG.CONTAINER_ID,
  size: 'invisible' | 'normal' = RECAPTCHA_CONFIG.DEFAULT_SIZE
): RecaptchaVerifier {
  const { auth } = initializeFirebase();

  return new RecaptchaVerifier(auth, containerId, {
    size,
    callback: (response: string) => {
      logger.debug('reCAPTCHA 검증 완료', { response });
    },
    'expired-callback': () => {
      logger.warn('reCAPTCHA 만료됨');
    },
  });
}
```

#### 1-2. SMS 전송

```typescript
import { signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { PHONE_VALIDATION, FIREBASE_ERROR_CODE_MAP, AUTH_ERROR_MESSAGES } from '@/constants/auth';

/**
 * SMS 인증 코드 전송
 *
 * @param phoneNumber - 11자리 전화번호 (하이픈 제외)
 * @param recaptchaVerifier - RecaptchaVerifier 인스턴스
 * @returns ConfirmationResult (인증 코드 확인용)
 */
export async function sendSmsVerification(
  phoneNumber: string,
  recaptchaVerifier: RecaptchaVerifier
): Promise<ConfirmationResult> {
  try {
    const { auth } = initializeFirebase();

    // E.164 형식으로 변환: 010-1234-5678 → +821012345678
    const formattedPhone = `${PHONE_VALIDATION.COUNTRY_CODE}${phoneNumber.substring(1)}`;

    logger.info('SMS 전송 시작', { phoneNumber: formattedPhone });

    const confirmationResult = await signInWithPhoneNumber(
      auth,
      formattedPhone,
      recaptchaVerifier
    );

    logger.info('SMS 전송 성공');
    return confirmationResult;

  } catch (error: any) {
    const errorCode = error.code;
    const errorMessage = FIREBASE_ERROR_CODE_MAP[errorCode] || AUTH_ERROR_MESSAGES.SMS_SEND_FAILED;

    logger.error('SMS 전송 실패', { errorCode, errorMessage });
    throw new Error(errorMessage);
  }
}
```

#### 1-3. 인증 코드 확인

```typescript
import { UserCredential } from 'firebase/auth';

/**
 * SMS 인증 코드 확인
 *
 * @param confirmationResult - sendSmsVerification()의 반환값
 * @param verificationCode - 6자리 인증 코드
 * @returns UserCredential (Firebase User 정보)
 */
export async function confirmSmsCode(
  confirmationResult: ConfirmationResult,
  verificationCode: string
): Promise<UserCredential> {
  try {
    logger.info('인증 코드 확인 시작');

    const userCredential = await confirmationResult.confirm(verificationCode);

    logger.info('Firebase 로그인 성공', { uid: userCredential.user.uid });
    return userCredential;

  } catch (error: any) {
    const errorCode = error.code;
    const errorMessage = FIREBASE_ERROR_CODE_MAP[errorCode] || AUTH_ERROR_MESSAGES.INVALID_CODE;

    logger.error('인증 코드 확인 실패', { errorCode, errorMessage });
    throw new Error(errorMessage);
  }
}
```

#### 1-4. Firestore 연동 함수

```typescript
/**
 * Firebase UID로 Participant 조회
 *
 * @param firebaseUid - Firebase Auth UID
 * @returns Participant 또는 null
 */
export async function getParticipantByFirebaseUid(
  firebaseUid: string
): Promise<Participant | null> {
  const db = getDb();
  const q = query(
    collection(db, COLLECTIONS.PARTICIPANTS),
    where('firebaseUid', '==', firebaseUid),
    limit(1)
  );

  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    return null;
  }

  const doc = querySnapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
  } as Participant;
}

/**
 * Participant에 Firebase UID 연결
 *
 * @param participantId - Participant 문서 ID
 * @param firebaseUid - Firebase Auth UID
 */
export async function linkFirebaseUid(
  participantId: string,
  firebaseUid: string
): Promise<void> {
  const db = getDb();
  const docRef = doc(db, COLLECTIONS.PARTICIPANTS, participantId);

  await updateDoc(docRef, {
    firebaseUid,
    updatedAt: Timestamp.now(),
  });

  logger.info('Firebase UID 연결 완료', { participantId, firebaseUid });
}

/**
 * Auth 인스턴스 가져오기
 *
 * @returns Firebase Auth 인스턴스
 */
export function getAuthInstance() {
  const { auth } = initializeFirebase();
  return auth;
}

/**
 * 로그아웃
 */
export async function signOut() {
  const { auth } = initializeFirebase();
  await auth.signOut();
  logger.info('로그아웃 완료');
}
```

---

### Phase 2: Auth 상수 통합 (0.5일)

**목표**: `firebase-auth-migration/auth.ts` → `src/constants/auth.ts`로 이동

**작업**:
```bash
# 1. 파일 이동
mv firebase-auth-migration/auth.ts src/constants/auth.ts

# 2. 기존 auth.ts와 병합
# - ALLOWED_EMAIL_DOMAINS는 유지 (데이터센터용)
# - PHONE_VALIDATION, AUTH_ERROR_MESSAGES 추가
# - validateEmailDomain() 함수 유지
```

**최종 구조**:
```typescript
// src/constants/auth.ts

// 이메일 도메인 검증 (데이터센터)
export const ALLOWED_EMAIL_DOMAINS = ['wheelslabs.kr'] as const;
export function validateEmailDomain(email: string): boolean { ... }

// 전화번호 검증 (웹앱)
export const PHONE_VALIDATION = { ... };
export const AUTH_ERROR_MESSAGES = { ... };
export const FIREBASE_ERROR_CODE_MAP = { ... };
export const RECAPTCHA_CONFIG = { ... };
export const STORAGE_KEYS = { ... };
export const AUTH_TIMING = { ... };
```

---

### Phase 3: 서버 API 마이그레이션 (2일)

#### 3-1. requireWebAppAuth 구현

**추가 위치**: `src/lib/api-auth.ts`

```typescript
/**
 * 웹앱 API 요청 인증 검증 (Firebase Phone Auth)
 *
 * Authorization: Bearer {idToken} 헤더에서 ID Token 추출 및 검증
 *
 * @param request - NextRequest
 * @returns 인증된 Participant 또는 에러
 */
export async function requireWebAppAuth(
  request: NextRequest
): Promise<{ user: Participant; error: null } | { user: null; error: NextResponse }> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return {
      user: null,
      error: NextResponse.json(
        { error: '인증 토큰이 필요합니다.' },
        { status: 401 }
      ),
    };
  }

  const idToken = authHeader.substring(7);

  try {
    // Firebase Admin SDK로 ID Token 검증
    const { getAdminAuth } = await import('@/lib/firebase/admin');
    const auth = getAdminAuth();
    const decodedToken = await auth.verifyIdToken(idToken);

    logger.debug('ID Token 검증 완료', { uid: decodedToken.uid });

    // UID로 Firestore participants 조회
    const db = getAdminDb();
    const snapshot = await db
      .collection(COLLECTIONS.PARTICIPANTS)
      .where('firebaseUid', '==', decodedToken.uid)
      .limit(1)
      .get();

    if (snapshot.empty) {
      logger.warn('Firebase UID와 연결된 Participant 없음', { uid: decodedToken.uid });
      return {
        user: null,
        error: NextResponse.json(
          { error: '등록되지 않은 사용자입니다.' },
          { status: 404 }
        ),
      };
    }

    const participant = {
      id: snapshot.docs[0].id,
      ...snapshot.docs[0].data(),
    } as Participant;

    logger.debug('Participant 조회 완료', { participantId: participant.id });
    return { user: participant, error: null };

  } catch (error: any) {
    logger.error('Firebase ID Token 검증 실패:', error);

    // ID Token 만료 여부 체크
    if (error.code === 'auth/id-token-expired') {
      return {
        user: null,
        error: NextResponse.json(
          {
            error: 'ID Token이 만료되었습니다.',
            code: 'TOKEN_EXPIRED',
          },
          {
            status: 401,
            headers: {
              'WWW-Authenticate': 'Bearer realm="PnS Member Portal"',
              'X-Token-Status': 'expired',
            },
          }
        ),
      };
    }

    return {
      user: null,
      error: NextResponse.json(
        { error: '유효하지 않은 인증 토큰입니다.' },
        { status: 401 }
      ),
    };
  }
}

/**
 * 웹앱 관리자 권한 검증
 */
export async function requireWebAppAdmin(
  request: NextRequest
): Promise<{ user: Participant; error: null } | { user: null; error: NextResponse }> {
  const { user, error } = await requireWebAppAuth(request);

  if (error) {
    return { user: null, error };
  }

  // 관리자 권한 체크
  if (!user?.isAdmin && !user?.isAdministrator) {
    logger.warn('관리자 권한 없음', { participantId: user?.id });
    return {
      user: null,
      error: NextResponse.json(
        { error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      ),
    };
  }

  return { user, error: null };
}
```

#### 3-2. API 라우트 수정

**수정 대상 파일** (7개):
1. `src/app/api/admin/matching/route.ts`
2. `src/app/api/admin/matching/confirm/route.ts`
3. `src/app/api/admin/matching/preview/route.ts`
4. `src/app/api/admin/matching/status/route.ts`
5. `src/app/api/admin/add-backdated-submission/route.ts`
6. `src/app/api/notices/[noticeId]/route.ts`
7. 기타 인증 필요 API

**변경 패턴**:
```typescript
// Before (레거시 sessionToken)
import { requireAdmin } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  const { user, error } = await requireAdmin(request);
  if (error) return error;

  // ... 비즈니스 로직
}

// After (Firebase Phone Auth)
import { requireWebAppAdmin } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  const { user, error } = await requireWebAppAdmin(request);
  if (error) return error;

  // ... 비즈니스 로직 (동일)
}
```

#### 3-3. API 클라이언트 수정

**수정 대상**: hooks/use-notices.ts, hooks/use-messages.ts 등

```typescript
// Before (레거시 sessionToken)
const sessionToken = localStorage.getItem('pns-session');
fetch('/api/notices/' + id, {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${sessionToken}`, // sessionToken
  },
});

// After (Firebase ID Token)
import { getAuthInstance } from '@/lib/firebase';

const auth = getAuthInstance();
const user = auth.currentUser;
const idToken = await user.getIdToken(); // Firebase ID Token

fetch('/api/notices/' + id, {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${idToken}`, // ID Token
  },
});
```

---

### Phase 4: 앱 통합 (1일)

#### 4-1. PhoneAuthCard 컴포넌트 이동

```bash
# 기존 CodeInputCard 백업
mv src/features/auth/components/CodeInputCard.tsx \
   src/features/auth/components/CodeInputCard.tsx.backup

# 새 PhoneAuthCard 이동
cp firebase-auth-migration/auth/components/PhoneAuthCard.tsx \
   src/features/auth/components/PhoneAuthCard.tsx
```

#### 4-2. use-auth 훅 이동

```bash
# 기존 use-session 백업
mv src/hooks/use-session.ts \
   src/hooks/use-session.ts.backup

# 새 use-auth 이동
cp firebase-auth-migration/use-auth.ts \
   src/hooks/use-auth.ts
```

#### 4-3. 로그인 페이지 수정

**파일**: `src/app/app/page.tsx`

```typescript
// Before
import CodeInputCard from '@/features/auth/components/CodeInputCard';

// After
import PhoneAuthCard from '@/features/auth/components/PhoneAuthCard';

export default function AppLoginPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <PhoneAuthCard />
    </div>
  );
}
```

#### 4-4. AuthContext 추가 (옵션)

**파일**: `src/contexts/WebAppAuthContext.tsx`

```typescript
'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useAuth } from '@/hooks/use-auth';

const WebAppAuthContext = createContext(null);

export function WebAppAuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();

  return (
    <WebAppAuthContext.Provider value={auth}>
      {children}
    </WebAppAuthContext.Provider>
  );
}

export function useWebAppAuth() {
  const context = useContext(WebAppAuthContext);
  if (!context) {
    throw new Error('useWebAppAuth must be used within WebAppAuthProvider');
  }
  return context;
}
```

**적용**: `src/app/app/layout.tsx`

```typescript
import { WebAppAuthProvider } from '@/contexts/WebAppAuthContext';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <WebAppAuthProvider>
      {children}
    </WebAppAuthProvider>
  );
}
```

---

### Phase 5: 데이터 마이그레이션 (1일)

#### 5-1. Firebase Auth에 기존 사용자 등록

**스크립트**: `src/scripts/migrate-users-to-firebase-phone-auth.ts`

```typescript
#!/usr/bin/env tsx

import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { logger } from '@/lib/logger';

/**
 * Firestore participants를 Firebase Phone Auth에 등록
 *
 * 주의사항:
 * 1. 실제 전화번호는 SMS가 전송되므로 테스트 환경에서만 실행
 * 2. Firebase Console에서 테스트 전화번호 설정 필요
 * 3. 프로덕션에서는 사용자가 직접 로그인하여 등록하도록 유도
 */
async function migrateUsersToFirebasePhoneAuth() {
  const auth = getAdminAuth();
  const db = getAdminDb();

  logger.info('🚀 Firebase Phone Auth 마이그레이션 시작');

  // 모든 participants 조회 (관리자 제외)
  const participantsSnapshot = await db
    .collection('participants')
    .where('isAdmin', '!=', true)
    .get();

  logger.info(`총 ${participantsSnapshot.size}명의 참가자 발견`);

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const doc of participantsSnapshot.docs) {
    const participant = doc.data();
    const phoneNumber = participant.phoneNumber;

    if (!phoneNumber) {
      logger.warn(`⏭️  ${doc.id}: 전화번호 없음 (건너뜀)`);
      skipCount++;
      continue;
    }

    // E.164 형식 변환: 01012345678 → +821012345678
    const formattedPhone = `+82${phoneNumber.substring(1)}`;

    try {
      // Firebase Auth에 사용자 생성 (전화번호)
      const userRecord = await auth.createUser({
        phoneNumber: formattedPhone,
        displayName: participant.name,
      });

      // Firestore에 firebaseUid 저장
      await db.collection('participants').doc(doc.id).update({
        firebaseUid: userRecord.uid,
      });

      logger.info(`✅ ${participant.name} (${phoneNumber}) → ${userRecord.uid}`);
      successCount++;

    } catch (error: any) {
      if (error.code === 'auth/phone-number-already-exists') {
        // 이미 Firebase Auth에 등록된 전화번호
        logger.warn(`⚠️  ${phoneNumber}: 이미 Firebase Auth에 존재`);

        try {
          // 기존 사용자 조회
          const existingUser = await auth.getUserByPhoneNumber(formattedPhone);

          // Firestore에 firebaseUid 저장 (연결)
          await db.collection('participants').doc(doc.id).update({
            firebaseUid: existingUser.uid,
          });

          logger.info(`✅ ${participant.name} → 기존 사용자 연결: ${existingUser.uid}`);
          successCount++;

        } catch (linkError) {
          logger.error(`❌ ${participant.name}: 기존 사용자 연결 실패`, linkError);
          errorCount++;
        }

      } else {
        logger.error(`❌ ${participant.name}: Firebase Auth 등록 실패`, error);
        errorCount++;
      }
    }

    // Rate limiting 방지 (Firebase Admin SDK 제한)
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  logger.info('🎉 마이그레이션 완료!');
  logger.info(`  ✅ 성공: ${successCount}명`);
  logger.info(`  ⏭️  건너뜀: ${skipCount}명`);
  logger.info(`  ❌ 실패: ${errorCount}명`);
}

// 실행
migrateUsersToFirebasePhoneAuth().catch((error) => {
  logger.error('마이그레이션 실패:', error);
  process.exit(1);
});
```

**실행 방법**:
```bash
# 1. tsx 설치 (없으면)
npm install -g tsx

# 2. 스크립트 실행 (dry-run 모드 권장)
tsx src/scripts/migrate-users-to-firebase-phone-auth.ts

# 3. 결과 확인
# Firebase Console → Authentication → Users
```

#### 5-2. 마이그레이션 검증 스크립트

**스크립트**: `src/scripts/verify-firebase-uid-linking.ts`

```typescript
#!/usr/bin/env tsx

import { getAdminDb } from '@/lib/firebase/admin';
import { logger } from '@/lib/logger';

async function verifyFirebaseUidLinking() {
  const db = getAdminDb();

  const participantsSnapshot = await db
    .collection('participants')
    .where('isAdmin', '!=', true)
    .get();

  let linkedCount = 0;
  let notLinkedCount = 0;

  participantsSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    if (data.firebaseUid) {
      linkedCount++;
    } else {
      notLinkedCount++;
      logger.warn(`⚠️  ${data.name} (${doc.id}): firebaseUid 없음`);
    }
  });

  logger.info(`📊 검증 결과:`);
  logger.info(`  ✅ Firebase UID 연결됨: ${linkedCount}명`);
  logger.info(`  ❌ Firebase UID 없음: ${notLinkedCount}명`);

  if (notLinkedCount > 0) {
    logger.warn('⚠️  일부 참가자가 Firebase Auth에 연결되지 않았습니다.');
    logger.warn('   사용자가 직접 로그인하거나 관리자가 수동으로 연결해야 합니다.');
  } else {
    logger.info('🎉 모든 참가자가 Firebase Auth에 연결되었습니다!');
  }
}

verifyFirebaseUidLinking().catch((error) => {
  logger.error('검증 실패:', error);
  process.exit(1);
});
```

---

### Phase 6: Firebase Console 설정 (0.5일)

#### 6-1. Phone Authentication 활성화

```
1. Firebase Console 접속 (https://console.firebase.google.com)
2. 프로젝트 선택: projectpns
3. Authentication → Sign-in method → Phone 클릭
4. "Enable" 버튼 클릭
5. 저장
```

#### 6-2. 테스트 전화번호 등록 (개발용)

```
1. Authentication → Settings 탭
2. Phone numbers for testing 섹션
3. "Add phone number" 클릭
4. 테스트 번호 추가:
   - Phone: +82 10-0000-0001
   - Code: 000000
   (최대 10개까지 추가 가능)
5. 저장
```

#### 6-3. reCAPTCHA 도메인 설정

```
1. Firebase Console → Authentication → Settings
2. Authorized domains 섹션
3. 도메인 추가:
   - localhost (테스트용 - 실제로는 작동 안 함, 테스트 번호 사용)
   - your-production-domain.com
   - vercel-preview-url.vercel.app (프리뷰 배포)
```

---

## 📅 구현 일정

| Phase | 작업 | 소요 시간 | 완료 조건 |
|-------|------|----------|----------|
| 1 | Firebase 유틸리티 함수 추가 | 1일 | initRecaptcha, sendSmsVerification, confirmSmsCode 구현 완료 |
| 2 | Auth 상수 통합 | 0.5일 | src/constants/auth.ts 완성 |
| 3 | 서버 API 마이그레이션 | 2일 | requireWebAppAuth 구현 + 7개 API 수정 완료 |
| 4 | 앱 통합 | 1일 | PhoneAuthCard, use-auth 적용 + 로그인 페이지 수정 |
| 5 | 데이터 마이그레이션 | 1일 | 모든 participants에 firebaseUid 추가 |
| 6 | Firebase Console 설정 | 0.5일 | Phone Auth 활성화 + 테스트 번호 등록 |

**총 소요 시간**: 약 6일

---

## ✅ 최종 체크리스트

### Phase 1 완료 기준
- [ ] `src/lib/firebase/index.ts`에 다음 함수 추가:
  - `initRecaptcha()`
  - `sendSmsVerification()`
  - `confirmSmsCode()`
  - `getParticipantByFirebaseUid()`
  - `linkFirebaseUid()`
  - `getAuthInstance()`
  - `signOut()`
- [ ] TypeScript 에러 없음
- [ ] 빌드 성공 (`npm run build`)

### Phase 2 완료 기준
- [ ] `src/constants/auth.ts` 파일 존재
- [ ] PHONE_VALIDATION, AUTH_ERROR_MESSAGES 상수 정의됨
- [ ] ALLOWED_EMAIL_DOMAINS (데이터센터용) 유지됨

### Phase 3 완료 기준
- [ ] `requireWebAppAuth()` 구현 완료
- [ ] `requireWebAppAdmin()` 구현 완료
- [ ] 7개 API 라우트 수정 완료
- [ ] API 호출 시 `Authorization: Bearer {idToken}` 전송 확인

### Phase 4 완료 기준
- [ ] `src/features/auth/components/PhoneAuthCard.tsx` 이동 완료
- [ ] `src/hooks/use-auth.ts` 이동 완료
- [ ] 로그인 페이지에서 PhoneAuthCard 사용
- [ ] 전화번호 로그인 → SMS 코드 → 채팅 페이지 이동 성공

### Phase 5 완료 기준
- [ ] `migrate-users-to-firebase-phone-auth.ts` 실행 완료
- [ ] 모든 participants에 `firebaseUid` 필드 존재
- [ ] `verify-firebase-uid-linking.ts` 검증 통과

### Phase 6 완료 기준
- [ ] Firebase Console에서 Phone 인증 활성화됨
- [ ] 테스트 전화번호 등록됨 (+82 10-0000-0001 → 000000)
- [ ] 프로덕션 도메인 Authorized domains에 등록됨

---

## 🔒 보안 체크리스트

- [ ] reCAPTCHA 설정 완료 (봇 공격 방지)
- [ ] ID Token 검증 로직 구현 (서버 측)
- [ ] Firebase UID → Participant 조회 시 보안 체크
- [ ] 테스트 전화번호 프로덕션 배포 시 제거
- [ ] HTTPS Only (프로덕션)
- [ ] Firebase Admin SDK 서비스 계정 키 보안 유지

---

## 🚨 주의사항

### 1. 기존 사용자 영향
- **모든 사용자 재로그인 필요**: sessionToken → Firebase Auth 마이그레이션 후
- **사전 공지 필수**: "시스템 업데이트로 재로그인이 필요합니다"
- **마이그레이션 기간**: 오프 피크 시간 (새벽 2-4시 권장)

### 2. Firebase Phone Auth 제약
- **SMS 비용**: Firebase Blaze 플랜 필요 (한국 SMS: 약 $0.05/건)
- **전송 제한**: 동일 번호 1분당 1회
- **테스트 번호 제한**: 최대 10개
- **E.164 형식 필수**: +82 10-1234-5678

### 3. 개발 환경 테스트
- **localhost에서는 실제 SMS 전송 불가** → 테스트 전화번호 사용 필수
- **Vercel Preview**: Authorized domains에 등록 필요
- **RecaptchaVerifier**: 프로덕션 도메인에서만 정상 작동

### 4. 롤백 계획
- **긴급 롤백 시**: 레거시 `use-session.ts`, `CodeInputCard.tsx` 복구
- **데이터 백업**: Firestore Export 필수
- **API 하위 호환**: 일시적으로 sessionToken + Firebase Auth 병행 가능

---

## 📝 다음 단계

1. **Phase 1 시작**: Firebase 유틸리티 함수 추가
2. **로컬 테스트**: 테스트 전화번호로 로그인 확인
3. **API 통합**: 서버 API requireWebAppAuth 적용
4. **데이터 마이그레이션**: 기존 사용자 Firebase Auth 등록
5. **프로덕션 배포**: 사용자 공지 후 배포

진행하시겠습니까?

