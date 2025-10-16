# Firebase Phone Auth 마이그레이션 가이드

**Last Updated**: 2025-10-14
**Status**: Phase 2 - 코드 분석 및 백업
**Branch**: feature/firebase-phone-auth

## 마이그레이션 목표

### 현재 문제점
1. **세션 로그아웃 이슈**: 뒤로가기, PWA 앱 전환 시 1-2분 내 세션 만료
2. **복잡한 세션 관리**: 110줄의 커스텀 코드로 토큰 생성, 검증, 저장 관리
3. **짧은 세션 지속 시간**: 24시간 세션 (Firebase Auth는 60일)
4. **배포 시 로그아웃 위험**: Vercel 배포 시 70-80% 확률로 세션 리셋

### 마이그레이션 후 개선점
1. **자동 세션 관리**: onAuthStateChanged로 자동 상태 감지 (코드 73% 감소)
2. **긴 세션 지속 시간**: 60일 자동 갱신 (24시간 → 60일)
3. **PWA 완벽 지원**: 앱 전환, 뒤로가기 시에도 세션 유지
4. **배포 안정성**: 0% 로그아웃 확률 (자동 세션 복구)

---

## Phase 1: Firebase Console 설정 ✅

### 승인된 도메인 확인
- ✅ localhost (개발 환경)
- ✅ philipandsophy.firebaseapp.com
- ✅ philipandsophy.web.app
- ✅ www.philipandsophy.kr
- ✅ pslanding-phi.vercel.app
- ✅ philipandsophy.kr

### SMS 리전 정책
- Firebase Console에서 SMS 인증 설정 완료
- Phone Authentication 활성화 확인

---

## Phase 2: 현재 인증 시스템 분석

### 2.1 현재 아키텍처

#### 세션 토큰 생성 (participants.ts:298-315)
```typescript
export async function createSessionToken(participantId: string): Promise<string> {
  const sessionToken = crypto.randomUUID();
  const sessionExpiry = Date.now() + 24 * 60 * 60 * 1000; // 24시간

  await updateDoc(docRef, {
    sessionToken,
    sessionExpiry,
    updatedAt: Timestamp.now(),
  });

  return sessionToken;
}
```

**문제점**:
- UUID 기반 커스텀 토큰 (표준 JWT 아님)
- 24시간 고정 만료 시간
- 수동 갱신 필요

#### 세션 검증 (participants.ts:323-363)
```typescript
export async function getParticipantBySessionToken(
  sessionToken: string
): Promise<Participant | null> {
  const q = query(
    collection(db, COLLECTIONS.PARTICIPANTS),
    where('sessionToken', '==', sessionToken)
  );

  // 세션 만료 확인 (5분 유예 시간)
  if (participant.sessionExpiry < Date.now()) {
    const GRACE_PERIOD_MS = 5 * 60 * 1000; // 5분
    if (Date.now() - participant.sessionExpiry > GRACE_PERIOD_MS) {
      await clearSessionToken(participant.id);
      return null;
    }
  }

  return participant;
}
```

**문제점**:
- 매번 Firestore 쿼리 필요 (네트워크 비용)
- 유예 시간 처리 복잡
- 만료 시간 계산 클라이언트 의존

#### 클라이언트 세션 관리 (use-session.ts:89-127)
```typescript
const validateSession = useCallback(async () => {
  const cachedToken = sessionToken;
  const token = cachedToken || getSessionToken();

  if (!token) {
    setCurrentUser(null);
    setIsLoading(false);
    return;
  }

  try {
    const participant = await getParticipantBySessionToken(token);
    if (participant) {
      setCurrentUser(participant);
    } else {
      removeSessionToken();
      setCurrentUser(null);
    }
  } catch (error) {
    logger.error('세션 검증 실패 (상태 유지):', error);
    if (!currentUser) {
      setCurrentUser(null);
    }
  }
}, [sessionToken, currentUser]);
```

**문제점**:
- 110줄의 복잡한 로직
- visibilitychange, popstate 이벤트 수동 관리
- localStorage 타이밍 이슈 (메모리 캐시로 우회)
- 네트워크 에러 시 상태 유지 로직 복잡

### 2.2 Firestore 스키마

#### participants 컬렉션 (현재)
```typescript
interface Participant {
  id: string;
  phoneNumber: string;
  name: string;
  cohortId: string;
  participationCode: string;
  sessionToken?: string;        // ← 제거 예정
  sessionExpiry?: number;       // ← 제거 예정
  isAdministrator: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### participants 컬렉션 (마이그레이션 후)
```typescript
interface Participant {
  id: string;
  phoneNumber: string;
  name: string;
  cohortId: string;
  participationCode: string;
  firebaseUid?: string;         // ← 추가 (Firebase Auth UID)
  isAdministrator: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**변경 사항**:
- `sessionToken` 제거 (Firebase Auth가 관리)
- `sessionExpiry` 제거 (Firebase Auth가 관리)
- `firebaseUid` 추가 (Firebase Auth UID와 연결)

### 2.3 로그인 플로우

#### 현재 로그인 (app/page.tsx)
```typescript
// 1. 사용자가 참여코드 입력
const code = await accessCode;

// 2. 코드로 cohort 조회
const cohort = await getCohortByAccessCode(code);

// 3. 전화번호 입력
const phoneNumber = userInput;

// 4. 참가자 조회
const participant = await getParticipantByPhoneNumber(phoneNumber);

// 5. 세션 토큰 생성 및 저장
const token = await createSessionToken(participant.id);

// 6. localStorage에 토큰 저장
localStorage.setItem('pns-session', token);

// 7. 리다이렉트
router.push('/app/chat');
```

**총 7단계, 3번의 Firebase 쿼리**

#### 마이그레이션 후 로그인 (예상)
```typescript
// 1. 사용자가 참여코드 입력
const code = await accessCode;

// 2. 코드로 cohort 조회
const cohort = await getCohortByAccessCode(code);

// 3. 전화번호 입력 + SMS 전송
const phoneNumber = userInput;
const verificationId = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);

// 4. 인증 코드 입력
const verificationCode = userInput;
const credential = PhoneAuthProvider.credential(verificationId, verificationCode);

// 5. Firebase 로그인 (자동 세션 생성)
const userCredential = await signInWithCredential(auth, credential);

// 6. Firestore 참가자 조회 (firebaseUid로)
const participant = await getParticipantByFirebaseUid(userCredential.user.uid);

// 7. 리다이렉트
router.push('/app/chat');
```

**총 7단계, 하지만 세션은 Firebase가 자동 관리**

### 2.4 이벤트 리스너 분석

#### 현재 (use-session.ts:135-163)
```typescript
// Visibility change (PWA 앱 전환)
useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      validateSession(); // Firebase 쿼리
    }
  };
  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
}, [validateSession]);

// Popstate (뒤로가기)
useEffect(() => {
  const handlePopState = () => {
    validateSession(); // Firebase 쿼리
  };
  window.addEventListener('popstate', handlePopState);
  return () => window.removeEventListener('popstate', handlePopState);
}, [validateSession]);
```

**문제점**:
- 매 이벤트마다 Firebase 쿼리 (네트워크 비용)
- validateSession이 비동기라 타이밍 이슈
- 의존성 배열에 함수 포함 (useCallback 필수)

#### 마이그레이션 후 (예상)
```typescript
// onAuthStateChanged가 자동으로 처리
useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    if (user) {
      const participant = await getParticipantByFirebaseUid(user.uid);
      setCurrentUser(participant);
    } else {
      setCurrentUser(null);
    }
    setIsLoading(false);
  });

  return () => unsubscribe();
}, []); // 빈 의존성 배열 (Firebase가 자동 감지)
```

**개선점**:
- 이벤트 리스너 불필요 (Firebase가 자동 감지)
- 네트워크 비용 감소 (캐시 활용)
- 타이밍 이슈 없음 (Firebase SDK가 관리)

---

## Phase 3: Firebase Auth SDK 초기화 (예정)

### 3.1 config.ts 수정
```typescript
// src/lib/firebase/config.ts
import { getAuth } from 'firebase/auth';
import { getApp } from 'firebase/app';

// 앱 초기화 후
export const auth = getAuth(getApp());
```

### 3.2 index.ts export
```typescript
// src/lib/firebase/index.ts
export { auth } from './config';
```

---

## Phase 4: 로그인 컴포넌트 구현 (예정)

### 4.1 PhoneAuthCard 컴포넌트
- reCAPTCHA 설정
- SMS 전송 (signInWithPhoneNumber)
- 인증 코드 확인 (PhoneAuthProvider.credential)

### 4.2 UI 플로우
1. 참여코드 입력
2. 전화번호 입력 → SMS 전송
3. 인증 코드 입력 → 로그인 완료

---

## Phase 5: useAuth 훅 구현 (예정)

### 5.1 onAuthStateChanged 구독
```typescript
export function useAuth() {
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const participant = await getParticipantByFirebaseUid(user.uid);
        setCurrentUser(participant);
      } else {
        setCurrentUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return {
    currentUser,
    isLoading,
    isAuthenticated: !!currentUser,
    logout: async () => await signOut(auth),
  };
}
```

### 5.2 코드 감소
- **Before**: 110줄 (use-session.ts)
- **After**: 30줄 (use-auth.ts)
- **감소율**: 73%

---

## Phase 6: 사용자 마이그레이션 (예정)

### 6.1 마이그레이션 스크립트
```typescript
// 모든 기존 사용자에게 firebaseUid 추가
// Phone Auth 첫 로그인 시 자동으로 연결
```

### 6.2 병렬 운영
- 기존 세션 토큰 방식: 30일간 유지
- 새 Firebase Auth: 즉시 사용 가능
- 점진적 마이그레이션

---

## Phase 7: 테스트 (예정)

### 7.1 테스트 시나리오
- SMS 전송 및 인증 코드 확인
- PWA 앱 전환 시 세션 유지
- 뒤로가기 시 세션 유지
- Vercel 배포 후 세션 유지

---

## Phase 8: 프로덕션 배포 (예정)

### 8.1 배포 체크리스트
- [ ] Firebase Console 설정 확인
- [ ] 프로덕션 도메인 승인
- [ ] SMS 쿼터 확인
- [ ] 모니터링 설정

---

## 코드 변경 요약

### 제거할 파일
- 없음 (기존 코드 유지, 점진적 교체)

### 수정할 파일
1. `src/lib/firebase/config.ts` - Firebase Auth 초기화
2. `src/lib/firebase/index.ts` - auth export
3. `src/lib/firebase/participants.ts` - firebaseUid 추가
4. `src/hooks/use-session.ts` → `src/hooks/use-auth.ts` (교체)
5. `src/app/app/page.tsx` - 로그인 UI 교체

### 추가할 파일
1. `src/components/phone-auth-card.tsx` - SMS 인증 UI
2. `src/scripts/migrate-to-firebase-auth.ts` - 마이그레이션 스크립트

---

## 타임라인

| Phase | 작업 | 예상 시간 | 상태 |
|-------|------|-----------|------|
| 1 | Firebase Console 설정 | 30분 | ✅ 완료 |
| 2 | 코드 분석 및 백업 | 1시간 | 🔄 진행 중 |
| 3 | Firebase Auth SDK 초기화 | 30분 | ⏳ 대기 |
| 4 | 로그인 컴포넌트 구현 | 2시간 | ⏳ 대기 |
| 5 | useAuth 훅 구현 | 1시간 | ⏳ 대기 |
| 6 | 사용자 마이그레이션 | 1시간 | ⏳ 대기 |
| 7 | 테스트 및 검증 | 2시간 | ⏳ 대기 |
| 8 | 프로덕션 배포 | 1시간 | ⏳ 대기 |

**총 예상 시간**: 8.5시간 (1-2일)

---

*이 문서는 마이그레이션 진행 상황에 따라 업데이트됩니다.*
