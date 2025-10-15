# Firebase Auth Integration Plan - 웹앱 전화번호 인증 마이그레이션

**작성일**: 2025-10-15
**상태**: 계획 수립 완료
**목표**: 웹앱의 커스텀 sessionToken 시스템을 Firebase Phone Authentication으로 완전 통합

---

## 📋 현재 시스템 분석

### 1. 웹앱 인증 흐름 (Current State)

#### 클라이언트 로그인
```typescript
// 1. 사용자가 전화번호 입력
CodeInputCard.tsx
  ↓
// 2. Firebase에서 전화번호로 participant 조회
getParticipantByPhoneNumber(phoneNumber)
  ↓
// 3. 커스텀 세션 토큰 생성 (UUID)
createSessionToken(participantId)
  ↓
// 4. localStorage에 저장
localStorage.setItem('pns-session', sessionToken)
  ↓
// 5. Firestore participants 컬렉션에 저장
participants/{id} {
  sessionToken: "abc-123-uuid",
  sessionExpiry: Date.now() + 24시간
}
```

#### 서버 API 인증
```typescript
// API Route (예: /api/admin/matching)
requireAdmin(request)
  ↓
validateSession(request)
  ↓
getSessionTokenFromRequest(request) // Authorization 헤더 또는 쿠키
  ↓
getParticipantBySessionTokenServer(sessionToken)
  ↓
// Firestore에서 sessionToken으로 participant 조회
db.collection('participants')
  .where('sessionToken', '==', sessionToken)
  .limit(1)
  .get()
  ↓
// 세션 만료 체크 (24시간 + 5분 유예)
if (sessionExpiry < now - GRACE_PERIOD) {
  return null; // 세션 만료
}
```

### 2. 데이터센터 인증 흐름 (Already Migrated)

```typescript
// 클라이언트
signInWithEmailAndPassword(auth, email, password)
  ↓
// 서버 API
requireAuthToken(request)
  ↓
// Firebase Admin SDK로 ID Token 검증
auth.verifyIdToken(idToken)
  ↓
// 이메일 도메인 검증 (wheelslabs.kr만 허용)
validateEmailDomain(email)
```

---

## 🎯 마이그레이션 목표

### 핵심 요구사항
1. **웹앱**: 전화번호 기반 Firebase Phone Auth 사용
2. **데이터센터**: 이메일 기반 Firebase Auth 유지 (현재 상태)
3. **Firestore participants 필드**:
   - `sessionToken`, `sessionExpiry` 제거 (레거시)
   - `firebaseUid` 추가 (Firebase Auth UID 저장)
4. **기존 사용자 마이그레이션**: 전화번호를 Firebase Auth에 등록
5. **API 인증**: 모든 웹앱 API를 Firebase ID Token 기반으로 변경

---

## 🚀 마이그레이션 전략

### Phase 1: Firebase Phone Auth 설정 (1일)

#### 1-1. Firebase Console 설정
```bash
# Firebase Console → Authentication
1. Phone 인증 활성화
2. Test phone numbers 추가 (개발용)
   - 010-0000-0001 → 000000 (테스트 코드)
```

#### 1-2. Cloud Functions 업데이트
```typescript
// functions/src/index.ts
import { beforeUserCreated } from 'firebase-functions/v2/identity';

export const beforeUserCreatedHandler = beforeUserCreated(async (event) => {
  const user = event.data;

  // 전화번호 인증만 허용 (웹앱)
  if (user.phoneNumber) {
    // ✅ 웹앱 사용자 (전화번호 로그인)
    return;
  }

  // 이메일 인증 도메인 체크 (데이터센터)
  if (user.email) {
    const emailDomain = user.email.split('@')[1]?.toLowerCase();
    const isAllowedDomain = ALLOWED_EMAIL_DOMAINS.includes(emailDomain);

    if (!isAllowedDomain) {
      throw new HttpsError('permission-denied',
        `${emailDomain} 도메인은 가입이 허용되지 않습니다.`
      );
    }
    return;
  }

  // 익명 인증 차단
  throw new HttpsError('invalid-argument', '인증 방법이 유효하지 않습니다.');
});
```

### Phase 2: 클라이언트 마이그레이션 (2일)

#### 2-1. Firebase Phone Auth 로그인 컴포넌트

**신규 파일**: `src/features/auth/components/PhoneAuthCard.tsx`

```typescript
'use client';

import { useState } from 'react';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { initializeFirebase } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import UnifiedButton from '@/components/UnifiedButton';
import { useRouter } from 'next/navigation';
import { appRoutes } from '@/lib/navigation';
import { logger } from '@/lib/logger';

export default function PhoneAuthCard() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // 1. 전화번호 입력 → SMS 인증 코드 전송
  const handleSendCode = async () => {
    try {
      setIsLoading(true);
      setError('');

      const { auth } = initializeFirebase();

      // RecaptchaVerifier 설정 (봇 방지)
      const recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {
          logger.debug('reCAPTCHA verified');
        },
      });

      // 전화번호 형식: +82 10-1234-5678 → +821012345678
      const formattedPhone = `+82${phoneNumber.replace(/-/g, '').substring(1)}`;

      // Firebase Phone Auth: SMS 코드 전송
      const result = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier);
      setConfirmationResult(result);

      logger.info('SMS 인증 코드 전송 완료', { phoneNumber: formattedPhone });
    } catch (err: any) {
      logger.error('SMS 전송 실패:', err);
      setError('인증 코드 전송에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. 인증 코드 확인 → Firebase 로그인
  const handleVerifyCode = async () => {
    try {
      setIsLoading(true);
      setError('');

      // SMS 코드 검증
      const userCredential = await confirmationResult.confirm(verificationCode);
      const firebaseUser = userCredential.user;

      logger.info('Firebase Phone Auth 로그인 성공', { uid: firebaseUser.uid });

      // 3. Firestore participants에 firebaseUid 저장
      await linkFirebaseUidToParticipant(firebaseUser.uid, phoneNumber);

      // 4. 채팅 페이지로 이동
      router.replace(appRoutes.chat('cohort-id')); // cohortId는 participants에서 가져와야 함

    } catch (err: any) {
      logger.error('인증 코드 확인 실패:', err);
      setError('인증 코드가 올바르지 않습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>필립앤소피</CardTitle>
        <CardDescription>
          {!confirmationResult
            ? '휴대폰 번호를 입력해주세요'
            : 'SMS로 받은 인증 코드를 입력해주세요'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!confirmationResult ? (
          <Input
            type="tel"
            placeholder="010-1234-5678"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            maxLength={13}
          />
        ) : (
          <Input
            type="text"
            placeholder="인증 코드 6자리"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            maxLength={6}
          />
        )}
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      </CardContent>
      <CardFooter>
        <UnifiedButton
          onClick={!confirmationResult ? handleSendCode : handleVerifyCode}
          disabled={!phoneNumber && !verificationCode}
          loading={isLoading}
          fullWidth
        >
          {!confirmationResult ? '인증 코드 받기' : '확인'}
        </UnifiedButton>
      </CardFooter>
      <div id="recaptcha-container" />
    </Card>
  );
}

// Firestore participants에 firebaseUid 연결
async function linkFirebaseUidToParticipant(firebaseUid: string, phoneNumber: string) {
  const { getDb } = await import('@/lib/firebase/client');
  const { updateDoc, doc } = await import('firebase/firestore');

  const db = getDb();

  // 1. 전화번호로 participant 찾기
  const participantRef = await getParticipantByPhoneNumber(phoneNumber);

  if (!participantRef) {
    throw new Error('등록되지 않은 전화번호입니다.');
  }

  // 2. firebaseUid 저장
  await updateDoc(doc(db, 'participants', participantRef.id), {
    firebaseUid,
    updatedAt: Timestamp.now(),
  });
}
```

#### 2-2. useAuth 훅 (Firebase Auth 상태 관리)

**신규 파일**: `src/hooks/use-auth.ts`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { initializeFirebase } from '@/lib/firebase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const { auth } = initializeFirebase();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, isLoading, isAuthenticated: !!user };
}
```

### Phase 3: 서버 API 마이그레이션 (2일)

#### 3-1. 새로운 인증 함수

**수정 파일**: `src/lib/api-auth.ts`

```typescript
/**
 * 웹앱 API 요청 인증 검증 (Firebase Phone Auth)
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
    // Firebase ID Token 검증
    const { getAdminAuth } = await import('@/lib/firebase/admin');
    const auth = getAdminAuth();
    const decodedToken = await auth.verifyIdToken(idToken);

    // UID로 Firestore participants 조회
    const db = getAdminDb();
    const snapshot = await db
      .collection('participants')
      .where('firebaseUid', '==', decodedToken.uid)
      .limit(1)
      .get();

    if (snapshot.empty) {
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

    return { user: participant, error: null };

  } catch (error) {
    logger.error('Firebase ID Token 검증 실패:', error);
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
 * 관리자 권한 검증 (웹앱용)
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

**수정 대상 파일**:
- `src/app/api/admin/matching/route.ts`
- `src/app/api/admin/matching/confirm/route.ts`
- `src/app/api/admin/matching/preview/route.ts`
- `src/app/api/admin/matching/status/route.ts`
- `src/app/api/admin/add-backdated-submission/route.ts`
- `src/app/api/notices/[noticeId]/route.ts`

**변경 사항**:
```typescript
// Before (레거시 sessionToken)
export async function POST(request: NextRequest) {
  const { user, error } = await requireAdmin(request);
  // ...
}

// After (Firebase Phone Auth)
export async function POST(request: NextRequest) {
  const { user, error } = await requireWebAppAdmin(request);
  // ...
}
```

### Phase 4: 데이터 마이그레이션 (1일)

#### 4-1. 기존 사용자 Firebase Auth 등록

**신규 스크립트**: `src/scripts/migrate-users-to-firebase-auth.ts`

```typescript
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';

/**
 * Firestore participants를 Firebase Auth에 등록
 *
 * 주의: 실제 전화번호를 Firebase Auth에 등록할 수 없으므로
 * 개발 환경에서만 테스트용 전화번호 사용
 */
async function migrateUsersToFirebaseAuth() {
  const auth = getAdminAuth();
  const db = getAdminDb();

  const participantsSnapshot = await db.collection('participants').get();

  for (const doc of participantsSnapshot.docs) {
    const participant = doc.data();
    const phoneNumber = participant.phoneNumber;

    if (!phoneNumber) {
      console.log(`⏭️  Skipping ${doc.id} (no phone number)`);
      continue;
    }

    try {
      // Firebase Auth에 사용자 생성 (전화번호)
      const userRecord = await auth.createUser({
        phoneNumber: `+82${phoneNumber.substring(1).replace(/-/g, '')}`,
        displayName: participant.name,
      });

      // Firestore participants에 firebaseUid 저장
      await db.collection('participants').doc(doc.id).update({
        firebaseUid: userRecord.uid,
        // 레거시 필드 제거는 나중에 (Phase 5)
      });

      console.log(`✅ Migrated ${participant.name} (${phoneNumber}) → ${userRecord.uid}`);

    } catch (error: any) {
      if (error.code === 'auth/phone-number-already-exists') {
        console.log(`⚠️  ${phoneNumber} already exists in Firebase Auth`);

        // 기존 사용자 조회하여 firebaseUid 저장
        const existingUser = await auth.getUserByPhoneNumber(
          `+82${phoneNumber.substring(1).replace(/-/g, '')}`
        );

        await db.collection('participants').doc(doc.id).update({
          firebaseUid: existingUser.uid,
        });

        console.log(`✅ Linked ${participant.name} to existing user ${existingUser.uid}`);
      } else {
        console.error(`❌ Failed to migrate ${participant.name}:`, error);
      }
    }
  }

  console.log('🎉 Migration complete!');
}

migrateUsersToFirebaseAuth().catch(console.error);
```

**실행 방법**:
```bash
npm run tsx src/scripts/migrate-users-to-firebase-auth.ts
```

### Phase 5: 레거시 코드 제거 (1일)

#### 5-1. Participants 타입 정리

**수정 파일**: `src/types/database.ts`

```typescript
export interface Participant {
  id: string;
  name: string;
  phoneNumber: string;
  cohortId: string;

  // ✅ 신규 필드
  firebaseUid?: string; // Firebase Auth UID

  // ❌ 제거된 필드 (주석 처리)
  // sessionToken?: string; // DEPRECATED: Use Firebase Auth
  // sessionExpiry?: number; // DEPRECATED: Use Firebase Auth

  // ... 기타 필드
}
```

#### 5-2. 레거시 함수 제거

**수정 파일**: `src/lib/firebase/participants.ts`

```typescript
// ❌ 제거 대상
// - createSessionToken()
// - getParticipantBySessionToken()
// - clearSessionToken()
```

**수정 파일**: `src/lib/api-auth.ts`

```typescript
// ❌ 제거 대상
// - validateSession() → requireWebAppAuth()로 대체됨
// - requireAdmin() → requireWebAppAdmin()로 대체됨
// - getSessionTokenFromRequest() → 불필요
// - getParticipantBySessionTokenServer() → 불필요
```

#### 5-3. 클라이언트 코드 제거

**수정 파일**: `src/hooks/use-session.ts`

```typescript
// ❌ 전체 파일 삭제 → use-auth.ts로 대체됨
```

**수정 파일**: `src/features/auth/components/CodeInputCard.tsx`

```typescript
// ❌ 전체 파일 삭제 → PhoneAuthCard.tsx로 대체됨
```

#### 5-4. Firestore 필드 정리

**신규 스크립트**: `src/scripts/cleanup-legacy-session-fields.ts`

```typescript
import { getAdminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Firestore participants에서 레거시 세션 필드 제거
 *
 * 주의: 이 스크립트는 Phase 2-4가 완료된 후에만 실행
 */
async function cleanupLegacySessionFields() {
  const db = getAdminDb();
  const participantsSnapshot = await db.collection('participants').get();

  let count = 0;

  for (const doc of participantsSnapshot.docs) {
    const data = doc.data();

    // sessionToken 또는 sessionExpiry가 있으면 제거
    if (data.sessionToken || data.sessionExpiry) {
      await db.collection('participants').doc(doc.id).update({
        sessionToken: FieldValue.delete(),
        sessionExpiry: FieldValue.delete(),
      });

      console.log(`✅ Cleaned up ${data.name} (${doc.id})`);
      count++;
    }
  }

  console.log(`🎉 Cleanup complete! Removed legacy fields from ${count} participants.`);
}

cleanupLegacySessionFields().catch(console.error);
```

---

## 📅 마이그레이션 일정

| Phase | 작업 | 소요 시간 | 완료 조건 |
|-------|------|----------|----------|
| 1 | Firebase Phone Auth 설정 | 1일 | Firebase Console 설정 완료 + Cloud Functions 배포 |
| 2 | 클라이언트 마이그레이션 | 2일 | PhoneAuthCard, useAuth 구현 완료 |
| 3 | 서버 API 마이그레이션 | 2일 | 모든 웹앱 API가 Firebase ID Token 검증 |
| 4 | 데이터 마이그레이션 | 1일 | 모든 participants에 firebaseUid 추가 |
| 5 | 레거시 코드 제거 | 1일 | sessionToken 관련 코드 완전 제거 |

**총 소요 시간**: 약 7일 (1주일)

---

## ✅ 완료 기준 (Definition of Done)

### Phase 1
- [ ] Firebase Console에서 Phone 인증 활성화됨
- [ ] Cloud Functions `beforeUserCreatedHandler` 배포됨
- [ ] Test phone numbers 등록됨

### Phase 2
- [ ] `PhoneAuthCard.tsx` 구현 완료
- [ ] `use-auth.ts` 구현 완료
- [ ] 전화번호 로그인 → SMS 코드 → Firebase Auth 성공
- [ ] Firestore participants에 firebaseUid 저장 확인

### Phase 3
- [ ] `requireWebAppAuth()`, `requireWebAppAdmin()` 구현 완료
- [ ] 모든 웹앱 API 라우트 수정 완료 (7개 파일)
- [ ] API 호출 시 `Authorization: Bearer {idToken}` 헤더 전송 확인

### Phase 4
- [ ] `migrate-users-to-firebase-auth.ts` 실행 완료
- [ ] 모든 participants에 firebaseUid 필드 존재
- [ ] Firebase Auth Users 목록에 전화번호 사용자 확인

### Phase 5
- [ ] `src/types/database.ts`에서 sessionToken, sessionExpiry 제거
- [ ] `participants.ts`에서 세션 함수 제거
- [ ] `api-auth.ts`에서 레거시 함수 제거
- [ ] `use-session.ts`, `CodeInputCard.tsx` 삭제
- [ ] `cleanup-legacy-session-fields.ts` 실행 완료

---

## 🔒 보안 고려사항

### 1. 전화번호 인증 보안
- **RecaptchaVerifier**: 봇 공격 방지
- **SMS 인증 코드**: 6자리 랜덤 코드
- **ID Token 만료**: 60분 (자동 갱신)

### 2. API 인증 보안
- **Firebase ID Token**: 서버에서 검증 필수
- **HTTPS Only**: 모든 API는 HTTPS 사용
- **Domain Restriction**: Cloud Functions에서 도메인 체크

### 3. 데이터 마이그레이션 보안
- **백업**: 마이그레이션 전 Firestore 백업 필수
- **롤백 계획**: 문제 발생 시 레거시 시스템으로 복귀 가능

---

## 🚨 주의사항

### 1. 기존 사용자 영향 최소화
- **점진적 마이그레이션**: Phase 2-4는 레거시 시스템과 병행 운영 가능
- **사용자 재로그인**: 마이그레이션 완료 후 모든 사용자 재로그인 필요

### 2. Firebase Phone Auth 제약
- **국제 전화번호 형식 필수**: +82 10-1234-5678
- **SMS 비용**: Firebase Blaze 플랜 필요 (종량제)
- **테스트 전화번호 제한**: 최대 10개

### 3. API 호환성
- **기존 API 클라이언트**: Authorization 헤더에 `Bearer {idToken}` 전송 필요
- **세션 토큰**: 마이그레이션 후 사용 불가

---

## 📝 참고 자료

- [Firebase Phone Auth 공식 문서](https://firebase.google.com/docs/auth/web/phone-auth)
- [Firebase Admin SDK 인증 가이드](https://firebase.google.com/docs/auth/admin/verify-id-tokens)
- [기존 마이그레이션 계획](../firebase-auth-migration/MIGRATION_PLAN.md)

---

**다음 단계**: Phase 1 시작 - Firebase Console 설정

