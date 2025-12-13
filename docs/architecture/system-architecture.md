# System Architecture Documentation

**Last Updated**: 2025-12-13
**Document Version**: v1.1.1
**Category**: architecture

---

## 목차 (Table of Contents)

1. [개요 (Overview)](#개요-overview)
2. [고수준 아키텍처 (High-Level Architecture)](#고수준-아키텍처-high-level-architecture)
3. [라우팅 전략 (Routing Strategy)](#라우팅-전략-routing-strategy)
4. [상태 관리 (State Management)](#상태-관리-state-management)
5. [인증 및 권한 관리 (Authentication & Authorization)](#인증-및-권한-관리-authentication--authorization)
6. [데이터 흐름 (Data Flow)](#데이터-흐름-data-flow)
7. [파일 구조 (File Organization)](#파일-구조-file-organization)
8. [모듈 의존성 (Module Dependencies)](#모듈-의존성-module-dependencies)
9. [보안 아키텍처 (Security Architecture)](#보안-아키텍처-security-architecture)
10. [확장성 고려사항 (Scalability Considerations)](#확장성-고려사항-scalability-considerations)

---

## 개요 (Overview)

**필립앤소피** 플랫폼은 Next.js 16 기반의 **서버리스 아키텍처**를 채택한 독서 소셜클럽 웹 애플리케이션입니다. Firebase를 백엔드로 활용하여 완전한 서버리스 환경에서 운영되며, Vercel에 배포되어 글로벌 엣지 네트워크를 통해 제공됩니다.

### 핵심 특징

- **서버리스 아키텍처**: Firebase Firestore + Storage + Auth
- **하이브리드 렌더링**: SSR (Server-Side Rendering) + CSR (Client-Side Rendering)
- **실시간 동기화**: Firebase onSnapshot을 통한 실시간 데이터 구독
- **모바일 우선 설계**: iOS PWA 최적화 및 반응형 디자인
- **4자리 접근 코드 기반 간편 인증**: 별도 회원가입 불필요

### 기술 스택 요약

| 계층 | 기술 |
|------|------|
| **프론트엔드** | Next.js 16 (App Router), React 19, TypeScript 5 |
| **UI 라이브러리** | Tailwind CSS, Shadcn UI, Lucide React |
| **상태 관리** | React Query v5 (서버 상태), Zustand v5 (전역 상태) |
| **백엔드** | Firebase Firestore, Firebase Storage, Firebase Auth |
| **외부 API** | Naver Book Search API, OpenAI API (AI Matching) |
| **배포** | Vercel (Edge Network) |
| **폰트** | Pretendard Variable (한글 웹폰트) |

---

## 고수준 아키텍처 (High-Level Architecture)

### 시스템 구성도

```
┌─────────────────────────────────────────────────────────────────┐
│                         사용자 (User)                            │
│                    모바일/데스크톱 브라우저                        │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Vercel Edge Network                           │
│                  (CDN + Edge Functions)                          │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Next.js 16 Application                         │
│  ┌──────────────┬──────────────────┬──────────────────────┐    │
│  │   Landing    │   Member Portal  │    Data Center       │    │
│  │     (/)      │      (/app)      │    (Admin Only)      │    │
│  └──────────────┴──────────────────┴──────────────────────┘    │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              React Query (Server State)                   │  │
│  │              Zustand (Global Client State)                │  │
│  │              Firebase Realtime Subscriptions              │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Backend Services                             │
│  ┌──────────────────┬──────────────────┬──────────────────┐    │
│  │   Firebase       │   Naver Book     │   OpenAI API     │    │
│  │   Firestore      │   Search API     │   (Matching)     │    │
│  │   + Storage      │   (Books)        │                  │    │
│  │   + Auth         │                  │                  │    │
│  └──────────────────┴──────────────────┴──────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### 3대 섹션 구조

프로젝트는 세 개의 주요 섹션으로 구성됩니다:

#### 1. **Landing Page (`/`)** - 마케팅 및 소개
- **목적**: 필립앤소피 독서 소셜클럽 소개 및 참가자 유입
- **렌더링**: SSR (초기 로드 최적화)
- **특징**:
  - Glassmorphism 디자인
  - SEO 최적화 (OpenGraph, Twitter Card, JSON-LD)
  - 이미지 WebP 최적화
  - 정적 HTML 페이지 (약관, 개인정보처리방침)

#### 2. **Member Portal (`/app`)** - 참가자 전용 공간
- **목적**: 참가자들의 독서 활동 및 소통
- **인증**: 4자리 접근 코드 기반 간편 로그인
- **주요 기능**:
  - `/app` - 접근 코드 입력
  - `/app/chat` - 공지사항 및 DM (Direct Message)
  - `/app/chat/today-library` - 오늘의 서재 (Today's Library)
  - `/app/profile/[participantId]` - 참가자 프로필북
  - `/app/program` - 프로그램 소개

#### 3. **Data Center** - 관리자 전용 (Admin Only)
- **목적**: 운영자를 위한 관리 인터페이스
- **권한**: `isAdministrator: true` 필요
- **주요 기능**:
  - 참가자 관리
  - 공지사항 작성/편집
  - AI 매칭 실행
  - 통계 대시보드
  - 다이렉트 메시지 모니터링

---

## 라우팅 전략 (Routing Strategy)

### Next.js App Router 구조

프로젝트는 **Next.js 16 App Router**를 활용하며, 파일 시스템 기반 라우팅을 사용합니다.

```
src/app/
├── page.tsx                          # 랜딩페이지 (/)
├── layout.tsx                        # 루트 레이아웃 (SEO, 폰트)
├── providers.tsx                     # 전역 프로바이더 (React Query, Firebase)
├── globals.css                       # 전역 스타일 (Tailwind, Shimmer)
│
├── app/                              # 웹앱 루트 (/app)
│   ├── page.tsx                      # 접근 코드 입력
│   ├── layout.tsx                    # 웹앱 레이아웃
│   │
│   ├── chat/                         # 채팅 및 공지 (/app/chat)
│   │   ├── page.tsx
│   │   ├── layout.tsx
│   │   └── today-library/            # 오늘의 서재 (/app/chat/today-library)
│   │       └── page.tsx
│   │
│   ├── profile/                      # 프로필 (/app/profile)
│   │   └── [participantId]/          # 동적 라우트 (/app/profile/abc123)
│   │       └── page.tsx
│   │
│   └── program/                      # 프로그램 소개 (/app/program)
│       ├── page.tsx
│       └── layout.tsx
│
└── api/                              # API Routes (Server-Side)
    ├── search-books/                 # 네이버 책 검색 프록시
    │   └── route.ts
    └── admin/                        # 관리자 전용 API
        └── matching/                 # AI 매칭 API
            ├── route.ts              # POST /api/admin/matching
            ├── preview/route.ts      # GET /api/admin/matching/preview
            ├── confirm/route.ts      # POST /api/admin/matching/confirm
            └── status/route.ts       # GET /api/admin/matching/status
```

### Route Groups

Next.js의 **Route Groups** 기능을 활용하여 URL 경로에 영향을 주지 않고 라우팅을 조직합니다:

```
app/
├── (landing)/          # 랜딩페이지 그룹 (URL: /)
│   └── page.tsx
│
└── (member)/           # 멤버 포털 그룹 (URL: /app/*)
    └── app/
        └── ...
```

### 동적 라우트 (Dynamic Routes)

**Next.js 15+**에서는 `params`와 `searchParams`가 **Promise**로 변경되었습니다:

```typescript
// ✅ 올바른 방법 (Next.js 15+)
export default async function ProfilePage({
  params,
}: {
  params: Promise<{ participantId: string }>;
}) {
  const { participantId } = await params;
  // ...
}

// ❌ 잘못된 방법 (Next.js 14 이전)
export default function ProfilePage({
  params,
}: {
  params: { participantId: string };
}) {
  const { participantId } = params; // 에러 발생!
}
```

### Legacy 리다이렉트 (Redirects)

기존 경로는 `next.config.ts`에서 301 영구 리다이렉트로 처리합니다:

```typescript
// next.config.ts
async redirects() {
  return [
    { source: '/member10', destination: '/app', permanent: true },
    { source: '/chat', destination: '/app/chat', permanent: true },
    { source: '/profile/:path*', destination: '/app/profile/:path*', permanent: true },
  ];
}
```

---

## 상태 관리 (State Management)

프로젝트는 **4가지 상태 관리 전략**을 혼합 사용합니다:

### 1. React Query (TanStack Query v5) - 서버 상태

**용도**: 서버 데이터 fetching, caching, synchronization

```typescript
// src/features/chat/hooks/use-notices.ts
import { useQuery } from '@tanstack/react-query';
import { getNoticesByCohort } from '@/lib/firebase/notices';

export function useNotices(cohortId: string) {
  return useQuery({
    queryKey: ['notices', cohortId],
    queryFn: () => getNoticesByCohort(cohortId),
    staleTime: 1000 * 60, // 1분
  });
}
```

**주요 설정** (`src/app/providers.tsx`):
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 60초
      gcTime: 5 * 60 * 1000, // 5분
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
```

**사용 사례**:
- 공지사항 조회 (`useNotices`)
- 참가자 목록 조회 (`useParticipants`)
- 독서 인증 제출물 조회 (`useSubmissions`)
- DM 메시지 조회 (`useMessages`)

### 2. Firebase onSnapshot - 실시간 구독

**용도**: 실시간 데이터 동기화 (프로필북, 독서 인증)

```typescript
// src/lib/firebase/submissions.ts
export function subscribeParticipantSubmissions(
  participantId: string,
  callback: (submissions: ReadingSubmission[]) => void
): () => void {
  const db = getDb();
  const q = query(
    collection(db, COLLECTIONS.READING_SUBMISSIONS),
    where('participantId', '==', participantId),
    orderBy('submittedAt', 'desc')
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const submissions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as ReadingSubmission[];
    callback(submissions);
  });

  return unsubscribe;
}
```

**사용 사례**:
- 프로필북 독서 인증 실시간 업데이트
- 오늘의 서재 (Today's Library) 실시간 참가자 목록

**장점**:
- React Query 없이 즉각적인 UI 업데이트
- 네트워크 왕복 시간 제거
- 제출 즉시 프로필북 반영

### 3. Zustand - 전역 클라이언트 상태

**용도**: UI 상태, 사용자 세션, 전역 설정

```typescript
// src/stores/auth-store.ts (예시)
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  participantId: string | null;
  cohortId: string | null;
  accessCode: string | null;
  setAuth: (data: { participantId: string; cohortId: string; accessCode: string }) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      participantId: null,
      cohortId: null,
      accessCode: null,
      setAuth: (data) => set(data),
      clearAuth: () => set({ participantId: null, cohortId: null, accessCode: null }),
    }),
    {
      name: 'auth-storage', // localStorage key
    }
  )
);
```

**사용 사례**:
- 사용자 인증 정보 (접근 코드, participantId)
- UI 테마 설정
- 모달/다이얼로그 열기/닫기 상태

### 4. React Context API - 컴포넌트 트리 상태

**용도**: 특정 컴포넌트 트리 내에서만 공유되는 상태

```typescript
// src/app/providers.tsx
'use client';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <FirebaseInitializer />
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
}
```

**사용 사례**:
- Theme Provider (다크모드)
- React Query Client Provider
- Firebase 초기화

### 상태 관리 전략 비교표

| 상태 유형 | 도구 | 사용 시기 | 예시 |
|-----------|------|-----------|------|
| **서버 데이터** | React Query | API 호출, 캐싱 필요 | 공지사항, 참가자 목록 |
| **실시간 데이터** | Firebase onSnapshot | 즉각 반영 필요 | 프로필북, 오늘의 서재 |
| **전역 상태** | Zustand | 여러 페이지 공유 | 인증 정보, 테마 설정 |
| **로컬 상태** | useState | 컴포넌트 내부만 | 폼 입력, 토글 상태 |
| **컨텍스트** | Context API | 트리 내 공유 | 프로바이더, 테마 |

---

## 인증 및 권한 관리 (Authentication & Authorization)

### 인증 시스템 아키텍처

프로젝트는 **2단계 인증 시스템**을 사용합니다:

1. **접근 코드 기반 간편 인증** (1차 인증)
2. **Firebase Phone Auth** (2차 인증, 선택적)

### 1. 접근 코드 인증 (Access Code Authentication)

**Flow Diagram**:

```
사용자 입력 (4자리 코드)
       ↓
접근 코드 검증 (Firestore: participants 컬렉션 조회)
       ↓
참가자 정보 조회 (participantId, cohortId, name)
       ↓
세션 저장 (Zustand store + localStorage)
       ↓
/app/chat 리다이렉트
```

**코드 예시**:

```typescript
// src/app/app/page.tsx (접근 코드 입력 페이지)
async function handleAccessCodeSubmit(code: string) {
  // 1. 접근 코드로 참가자 조회
  const participant = await getParticipantByAccessCode(code);

  if (!participant) {
    throw new Error('유효하지 않은 접근 코드입니다.');
  }

  // 2. 인증 정보 저장 (Zustand)
  setAuth({
    participantId: participant.id,
    cohortId: participant.cohortId,
    accessCode: code,
  });

  // 3. 채팅 페이지로 리다이렉트
  router.push('/app/chat');
}
```

### 2. Firebase Phone Auth (고급 인증)

**Phone Auth Flow**:

```
전화번호 입력
       ↓
reCAPTCHA 검증
       ↓
SMS 인증 코드 전송 (Firebase)
       ↓
6자리 인증 코드 입력
       ↓
Firebase Auth 로그인
       ↓
firebaseUid를 Participant에 연결
       ↓
Custom Claims 설정 (isAdministrator)
```

**코드 예시**:

```typescript
// src/lib/firebase/auth.ts
import { signInWithPhoneNumber, RecaptchaVerifier } from 'firebase/auth';

// Step 1: reCAPTCHA 초기화
export function initRecaptcha(containerId: string): RecaptchaVerifier {
  const auth = getFirebaseAuth();
  return new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
  });
}

// Step 2: SMS 전송
export async function sendSmsVerification(
  phoneNumber: string,
  recaptchaVerifier: RecaptchaVerifier
): Promise<ConfirmationResult> {
  const auth = getFirebaseAuth();
  const e164Number = formatPhoneNumberToE164(phoneNumber); // +821012345678

  const confirmationResult = await signInWithPhoneNumber(
    auth,
    e164Number,
    recaptchaVerifier
  );

  return confirmationResult;
}

// Step 3: 인증 코드 확인 및 로그인
export async function confirmSmsCode(
  confirmationResult: ConfirmationResult,
  verificationCode: string
): Promise<UserCredential> {
  const userCredential = await confirmationResult.confirm(verificationCode);
  return userCredential;
}
```

### 권한 관리 (Authorization)

#### Custom Claims (Firebase Auth)

Firebase Admin SDK를 통해 사용자에게 **Custom Claims**를 설정합니다:

```typescript
// Firebase Admin SDK (서버 사이드)
import * as admin from 'firebase-admin';

// Custom Claims 설정
await admin.auth().setCustomUserClaims(firebaseUid, {
  isAdministrator: true,
  canManageMatching: true,
});
```

#### 권한 체크 패턴

```typescript
// 클라이언트 사이드
import { getAuth } from 'firebase/auth';

async function checkAdminPermission(): Promise<boolean> {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) return false;

  const idTokenResult = await user.getIdTokenResult();
  return idTokenResult.claims.isAdministrator === true;
}
```

#### Firestore 필드 기반 권한

Participant 문서의 `isAdministrator`와 `isGhost` 필드로 권한을 관리합니다:

```typescript
// Participant 문서 구조
{
  id: 'admin',
  name: '운영자',
  phoneNumber: '01000000001',
  isAdministrator: true, // ← 관리자 플래그
  isGhost: false,        // ← 고스트 플래그 (테스트 사용자)
  cohortId: 'cohort1',
  // ...
}
```

**권한 체크 예시**:

```typescript
// 공지사항 작성 권한 체크
function canCreateNotice(participant: Participant): boolean {
  return participant.isAdministrator === true;
}

// 통계/매칭에서 고스트 사용자 제외
function isRealParticipant(participant: Participant): boolean {
  return !participant.isAdministrator && !participant.isGhost;
}

// UI 조건부 렌더링
{participant?.isAdministrator && (
  <Button onClick={handleCreateNotice}>
    공지 작성하기
  </Button>
)}
```

### 사용자 역할 구조

| 역할 | isAdministrator | isGhost | 권한 |
|------|-----------------|---------|------|
| **관리자** | `true` | `false` 또는 `undefined` | 공지 작성/편집/삭제, AI 매칭 실행, 모든 DM 조회 |
| **일반 참가자** | `false` 또는 `undefined` | `false` 또는 `undefined` | 독서 인증 제출, 프로필 조회, DM 전송 |
| **고스트** | `false` 또는 `undefined` | `true` | 테스트 사용자 (통계/매칭에서 제외됨) |

**고스트 사용자 특징**:
- 일반 참가자와 동일한 UI 접근 권한
- 통계 및 분석에서 자동 필터링
- AI 매칭에서 제외
- 내부 테스트 및 데모용으로 사용

### 보안 고려사항

1. **접근 코드 보안**:
   - 4자리 숫자 코드 (0000~9999)
   - 기수별로 고유한 코드 발급
   - 주기적 코드 갱신 권장

2. **Firebase Security Rules**:
   ```javascript
   // Firestore Security Rules (예시)
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // 참가자는 자신의 데이터만 읽기 가능
       match /participants/{participantId} {
         allow read: if request.auth.uid != null;
         allow write: if request.auth.token.isAdministrator == true;
       }

       // 공지사항은 모두 읽기 가능, 관리자만 쓰기 가능
       match /notices/{noticeId} {
         allow read: if request.auth.uid != null;
         allow create, update, delete: if request.auth.token.isAdministrator == true;
       }

       // 독서 인증: 고스트 사용자도 제출 가능 (but 통계에서 제외)
       match /reading_submissions/{submissionId} {
         allow read: if request.auth.uid != null;
         allow create: if request.auth.uid != null;
         allow update, delete: if request.auth.token.isAdministrator == true;
       }
     }
   }
   ```

3. **환경 변수 보안**:
   - Firebase 설정은 `NEXT_PUBLIC_` 접두사 사용 (클라이언트 노출)
   - Naver API 키는 서버 전용 (`NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`)
   - OpenAI API 키는 서버 전용 (`OPENAI_API_KEY`)

---

## 데이터 흐름 (Data Flow)

### 전체 데이터 흐름 다이어그램

```
┌─────────────────────────────────────────────────────────────────┐
│                         사용자 액션                              │
│            (버튼 클릭, 폼 제출, 페이지 이동)                      │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     React 컴포넌트                               │
│                  (이벤트 핸들러 호출)                             │
└───────────────────────────┬─────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌───────────────┐  ┌────────────────┐  ┌────────────────┐
│ React Query   │  │ Firebase       │  │ Next.js API    │
│ (useMutation) │  │ (직접 호출)    │  │ Route          │
└───────┬───────┘  └────────┬───────┘  └────────┬───────┘
        │                   │                   │
        │                   ▼                   │
        │        ┌──────────────────┐          │
        │        │ Firebase Client  │          │
        │        │ SDK              │          │
        │        │ (lib/firebase/*) │          │
        │        └──────────┬───────┘          │
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Firebase Backend                             │
│     (Firestore, Storage, Auth, Admin SDK)                       │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     실시간 구독 (onSnapshot)                     │
│              React Query 캐시 무효화 (invalidateQueries)         │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                       UI 리렌더링                                │
│                  (상태 변경 → 화면 업데이트)                      │
└─────────────────────────────────────────────────────────────────┘
```

### 주요 데이터 흐름 시나리오

#### 1. 독서 인증 제출 플로우

```
사용자: "독서 인증하기" 버튼 클릭
       ↓
컴포넌트: 다이얼로그 열기 (이미지 업로드, 책 제목, 리뷰 입력)
       ↓
사용자: 책 제목 검색 (Naver Book API 자동완성)
       ↓
Next.js API Route (/api/search-books)
       ↓
Naver Book Search API 호출 (서버 사이드)
       ↓
책 정보 반환 (제목, 저자, 표지 URL, 소개)
       ↓
사용자: 책 선택 → 이미지 업로드 → 리뷰 작성 → 제출
       ↓
Firebase Storage: 이미지 업로드
       ↓
Firebase Firestore: reading_submissions 컬렉션에 문서 생성
       {
         participantId: 'abc123',
         bookTitle: '책 제목',
         bookAuthor: '저자',
         bookCoverUrl: 'https://...',
         bookImageUrl: 'https://storage...',
         review: '간단 감상평',
         status: 'approved',       // 자동 승인
         isDraft: false,           // 완료된 제출물
         submittedAt: Timestamp,
       }
       ↓
Firebase onSnapshot: 실시간 구독 트리거
       ↓
프로필북 UI: 즉시 업데이트 (새 독서 인증 표시)
       ↓
Firebase Firestore: participants 컬렉션 업데이트
       {
         currentBookTitle: '책 제목',
         currentBookAuthor: '저자',
         currentBookCoverUrl: 'https://...',
       }

**참고: 임시 저장 (Draft) 처리**
- isDraft: true인 제출물은 통계/매칭에서 제외
- 사용자가 완료하지 않은 미완성 제출물로 간주
- 프로필북에는 표시되지만 "임시 저장" 라벨 표시
```

#### 2. 공지사항 조회 플로우

```
사용자: /app/chat 페이지 접속
       ↓
React Query: useNotices(cohortId) 호출
       ↓
캐시 확인: staleTime(60초) 이내면 캐시 반환
       ↓
캐시 만료 시: Firebase Firestore 쿼리
       {
         query: where('cohortId', '==', cohortId),
         orderBy: 'createdAt', 'asc'
       }
       ↓
React Query: 결과 캐싱 (60초)
       ↓
컴포넌트: 공지사항 리스트 렌더링
```

#### 3. AI 매칭 실행 플로우

```
관리자: "매칭 시작하기" 버튼 클릭
       ↓
POST /api/admin/matching
       {
         cohortId: 'cohort1',
         date: '2025-10-15'
       }
       ↓
서버: 어제 독서 인증한 참가자 조회
       {
         필터링 조건:
         - isAdministrator !== true (관리자 제외)
         - isGhost !== true (고스트 사용자 제외)
         - isDraft !== true (임시 저장 제출물 제외)
         - status === 'approved' (승인된 제출물만)
       }
       ↓
OpenAI API 호출 (GPT-4)
       {
         model: 'gpt-4',
         messages: [
           { role: 'system', content: '매칭 프롬프트' },
           { role: 'user', content: JSON.stringify(참가자 데이터) }
         ]
       }
       ↓
AI 응답 파싱: JSON 형식 매칭 결과
       {
         assignments: {
           'participant1': {
             similar: ['participant2', 'participant3'],
             opposite: ['participant4'],
             reasons: { similar: '이유...', opposite: '이유...' }
           },
           // ...
         }
       }
       ↓
Firestore: cohorts 컬렉션 업데이트
       {
         dailyFeaturedParticipants: {
           '2025-10-15': { assignments: {...} }
         }
       }
       ↓
React Query: 캐시 무효화
       ↓
UI: 매칭 결과 표시
```

### React Query 캐시 전략

```typescript
// src/app/providers.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 60초 - 이 시간 동안 캐시된 데이터를 "신선"하다고 간주
      gcTime: 5 * 60 * 1000, // 5분 - 사용하지 않는 캐시를 메모리에서 제거하는 시간
      retry: 1, // 실패 시 1번만 재시도
      refetchOnWindowFocus: false, // 윈도우 포커스 시 자동 refetch 비활성화
    },
  },
});
```

**캐시 무효화 패턴**:

```typescript
// 데이터 변경 후 캐시 무효화
import { useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();

// 공지사항 생성 후
await createNotice(noticeData);
queryClient.invalidateQueries({ queryKey: ['notices', cohortId] });

// 참가자 정보 업데이트 후
await updateParticipant(participantId, updateData);
queryClient.invalidateQueries({ queryKey: ['participants', cohortId] });
```

---

## 파일 구조 (File Organization)

### 전체 디렉토리 구조

```
projectpns/
├── src/
│   ├── app/                           # Next.js App Router (라우트: /, /app/*, /datacntr/*, /api/*)
│   ├── components/                    # 공유 컴포넌트 (UI 포함)
│   ├── constants/                     # 전역 상수
│   ├── contexts/                      # React Context
│   ├── features/                      # 도메인 기능 모듈
│   ├── hooks/                         # React hooks
│   ├── lib/                           # 공용 라이브러리 (firebase/push/datacntr 등)
│   ├── scripts/                       # tsx로 실행하는 데이터 작업 스크립트
│   ├── services/                      # 서비스 레이어
│   ├── stores/                        # Zustand 스토어
│   ├── styles/                        # CSS/스타일 관련
│   └── types/                         # 타입 정의
│
├── functions/                         # Firebase Functions (Node 20)
├── public/                            # 정적 파일
├── scripts/                           # 운영/검증/유틸 스크립트
├── docs/                              # 프로젝트 문서
├── next.config.ts                     # Next.js 설정
├── tailwind.config.ts                 # Tailwind 설정
├── tsconfig.json                      # TypeScript 설정
├── package.json                       # 의존성/스크립트
├── firebase.json                      # Firebase 설정
└── CLAUDE.md                          # 개발 가이드
```

### Feature-Based 모듈 구조

각 기능은 **독립적인 모듈**로 구성됩니다:

```
features/[featureName]/
├── components/          # 기능별 컴포넌트
│   ├── FeatureList.tsx
│   ├── FeatureDetail.tsx
│   └── FeatureForm.tsx
│
├── hooks/               # 기능별 React 훅
│   ├── use-feature.ts
│   └── use-feature-mutations.ts
│
├── lib/                 # 기능별 유틸리티
│   ├── helpers.ts
│   └── validation.ts
│
├── constants/           # 기능별 상수
│   └── config.ts
│
└── api.ts               # API 호출 함수
```

**예시 - Chat 기능**:

```
features/chat/
├── components/
│   ├── NoticeList.tsx              # 공지사항 리스트
│   ├── NoticeItem.tsx              # 공지사항 아이템
│   ├── NoticeCreateDialog.tsx      # 공지 작성 다이얼로그
│   ├── DirectMessageList.tsx       # DM 리스트
│   └── MessageInput.tsx            # 메시지 입력
│
├── hooks/
│   ├── use-notices.ts              # 공지사항 조회
│   ├── use-notice-mutations.ts     # 공지 생성/수정/삭제
│   ├── use-messages.ts             # 메시지 조회
│   └── use-message-mutations.ts    # 메시지 전송
│
└── lib/
    ├── message-helpers.ts          # 메시지 그룹화 로직
    └── conversation-id.ts          # 대화 ID 생성
```

### 컴포넌트 네이밍 규칙

| 유형 | 네이밍 패턴 | 예시 |
|------|-------------|------|
| **페이지** | `page.tsx` | `app/chat/page.tsx` |
| **레이아웃** | `layout.tsx` | `app/chat/layout.tsx` |
| **컴포넌트** | `PascalCase.tsx` | `NoticeList.tsx` |
| **훅** | `use-kebab-case.ts` | `use-notices.ts` |
| **유틸** | `kebab-case.ts` | `message-helpers.ts` |
| **타입** | `PascalCase` | `Participant`, `Notice` |
| **상수** | `SCREAMING_SNAKE_CASE` | `API_CACHE_DURATION` |

---

## 모듈 의존성 (Module Dependencies)

### 의존성 그래프

```
┌──────────────────────────────────────────────────────────────┐
│                        App Layer                             │
│  (pages, components, features)                               │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                     Hooks Layer                              │
│  (React Query hooks, custom hooks)                           │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                   Library Layer                              │
│  (Firebase operations, API clients)                          │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                   Types & Constants                          │
│  (database types, configuration)                             │
└──────────────────────────────────────────────────────────────┘
```

### 핵심 모듈 의존성

#### 1. Firebase 클라이언트 모듈

```typescript
// src/lib/firebase/index.ts (진입점)
export * from './config';
export * from './client';
export * from './cohorts';
export * from './participants';
export * from './submissions';
export * from './notices';
export * from './messages';
export * from './storage';
export * from './auth';

// 다른 모듈에서 사용
import { getNoticesByCohort, createNotice } from '@/lib/firebase';
```

**의존성 체인**:
```
firebase/index.ts
    └─→ firebase/config.ts (Firebase 설정)
    └─→ firebase/client.ts (Firestore/Storage 클라이언트)
            └─→ firebase/cohorts.ts (Cohort 작업)
            └─→ firebase/participants.ts (Participant 작업)
            └─→ firebase/submissions.ts (Submission 작업)
            └─→ firebase/notices.ts (Notice 작업)
            └─→ firebase/messages.ts (Message 작업)
            └─→ firebase/storage.ts (Storage 작업)
            └─→ firebase/auth.ts (Phone Auth)
```

#### 2. React Query 훅 모듈

```typescript
// features/chat/hooks/use-notices.ts
import { useQuery } from '@tanstack/react-query';
import { getNoticesByCohort } from '@/lib/firebase'; // ← Firebase 모듈 의존

export function useNotices(cohortId: string) {
  return useQuery({
    queryKey: ['notices', cohortId],
    queryFn: () => getNoticesByCohort(cohortId),
  });
}
```

**의존성 체인**:
```
features/chat/hooks/use-notices.ts
    └─→ @tanstack/react-query (외부 라이브러리)
    └─→ lib/firebase/notices.ts (Firebase 작업)
            └─→ types/database.ts (Notice 타입)
```

#### 3. 컴포넌트 모듈

```typescript
// features/chat/components/NoticeList.tsx
'use client';

import { useNotices } from '../hooks/use-notices'; // ← 훅 의존
import { Notice } from '@/types/database'; // ← 타입 의존

export function NoticeList({ cohortId }: { cohortId: string }) {
  const { data: notices, isLoading } = useNotices(cohortId);

  // ...
}
```

**의존성 체인**:
```
features/chat/components/NoticeList.tsx
    └─→ features/chat/hooks/use-notices.ts (커스텀 훅)
    └─→ types/database.ts (타입 정의)
    └─→ components/ui/* (Shadcn UI 컴포넌트)
```

### 순환 의존성 방지 규칙

**금지 패턴**:
```typescript
// ❌ 순환 의존성 (Circular Dependency)
// features/chat/hooks/use-notices.ts
import { NoticeList } from '../components/NoticeList'; // 잘못됨!

// features/chat/components/NoticeList.tsx
import { useNotices } from '../hooks/use-notices';
```

**권장 패턴**:
```typescript
// ✅ 단방향 의존성 (One-Way Dependency)
// 컴포넌트 → 훅 → 라이브러리 → 타입
// (역방향 의존성 금지)
```

### 외부 라이브러리 의존성

```json
// package.json (주요 의존성)
{
  "dependencies": {
    "next": "15.1.0",                    // 프레임워크
    "react": "^19.0.0",                  // UI 라이브러리
    "@tanstack/react-query": "^5",       // 서버 상태 관리
    "firebase": "^12.3.0",               // 백엔드 SDK
    "zustand": "^4",                     // 전역 상태 관리
    "zod": "^3",                         // 스키마 검증
    "lucide-react": "^0.469.0",          // 아이콘
    "tailwindcss": "^3.4.1",             // CSS 프레임워크
    "date-fns": "^4",                    // 날짜 유틸리티
    "framer-motion": "^11",              // 애니메이션
    "openai": "^6.3.0"                   // OpenAI API
  }
}
```

---

## 보안 아키텍처 (Security Architecture)

### 보안 계층 구조

```
┌──────────────────────────────────────────────────────────────┐
│  Layer 1: 클라이언트 입력 검증                                │
│  - Zod 스키마 검증                                            │
│  - React Hook Form 유효성 검사                               │
│  - XSS 방지 (React 자동 이스케이핑)                          │
└───────────────────────────┬──────────────────────────────────┘
                            ▼
┌──────────────────────────────────────────────────────────────┐
│  Layer 2: API Route 검증                                     │
│  - Next.js API Route 입력 검증                               │
│  - 환경 변수 체크                                             │
│  - 요청 파라미터 검증                                         │
└───────────────────────────┬──────────────────────────────────┘
                            ▼
┌──────────────────────────────────────────────────────────────┐
│  Layer 3: Firebase Security Rules                            │
│  - 인증 확인 (request.auth.uid)                              │
│  - 권한 확인 (Custom Claims)                                 │
│  - 데이터 접근 제어                                           │
└───────────────────────────┬──────────────────────────────────┘
                            ▼
┌──────────────────────────────────────────────────────────────┐
│  Layer 4: 데이터 암호화                                       │
│  - HTTPS (TLS 1.3)                                            │
│  - Firebase 데이터 자동 암호화                                │
│  - 환경 변수 암호화 (Vercel)                                 │
└──────────────────────────────────────────────────────────────┘
```

### 주요 보안 메커니즘

#### 1. Firestore Security Rules

```javascript
// firestore.rules (예시)
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // 인증된 사용자만 접근 가능
    function isAuthenticated() {
      return request.auth != null;
    }

    // 관리자 권한 확인
    function isAdmin() {
      return request.auth.token.isAdministrator == true;
    }

    // 참가자: 읽기 전용, 자신의 데이터만 수정 가능
    match /participants/{participantId} {
      allow read: if isAuthenticated();
      allow update: if isAuthenticated() &&
                       (request.auth.uid == resource.data.firebaseUid || isAdmin());
      allow create, delete: if isAdmin();
    }

    // 공지사항: 모두 읽기 가능, 관리자만 쓰기
    match /notices/{noticeId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }

    // 독서 인증: 자신의 제출물만 생성/조회 가능
    // 고스트 사용자도 제출 가능하지만 통계에서 필터링됨
    match /reading_submissions/{submissionId} {
      allow read: if isAuthenticated() &&
                     (request.auth.uid == resource.data.firebaseUid || isAdmin());
      allow create: if isAuthenticated() &&
                       request.auth.uid == request.resource.data.firebaseUid;
      allow update, delete: if isAdmin();

      // 참고: isDraft 필드로 임시 저장 구분
      // - isDraft: true → 통계/매칭 제외
      // - isDraft: false 또는 undefined → 완료된 제출물
    }

    // 메시지: 발신자/수신자만 조회, 발신자만 생성
    match /messages/{messageId} {
      allow read: if isAuthenticated() &&
                     (request.auth.uid == resource.data.senderId ||
                      request.auth.uid == resource.data.receiverId ||
                      isAdmin());
      allow create: if isAuthenticated() &&
                       request.auth.uid == request.resource.data.senderId;
      allow update, delete: if isAdmin();
    }
  }
}
```

#### 2. Storage Security Rules

```javascript
// storage.rules (예시)
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {

    // 독서 인증 이미지: 인증된 사용자만 업로드, 모두 읽기 가능
    match /reading_submissions/{participationCode}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
                      request.resource.size < 10 * 1024 * 1024 && // 10MB 제한
                      request.resource.contentType.matches('image/.*'); // 이미지만 허용
    }

    // 공지사항 이미지: 관리자만 업로드
    match /notices/{cohortId}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
                      request.auth.token.isAdministrator == true;
    }

    // DM 이미지: 발신자만 업로드
    match /direct_messages/{userId}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
                      request.auth.uid == userId;
    }
  }
}
```

#### 3. 환경 변수 보안

```bash
# .env.local (절대 커밋하지 않음!)

# 클라이언트 노출 가능 (NEXT_PUBLIC_ 접두사)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# 서버 전용 (NEXT_PUBLIC_ 없음)
NAVER_CLIENT_ID=...
NAVER_CLIENT_SECRET=...
OPENAI_API_KEY=...
FIREBASE_ADMIN_PROJECT_ID=...
FIREBASE_ADMIN_CLIENT_EMAIL=...
FIREBASE_ADMIN_PRIVATE_KEY=...
```

**보안 수칙**:
- ✅ Firebase 클라이언트 설정은 `NEXT_PUBLIC_` 접두사 사용 (클라이언트 노출 허용)
- ✅ API 키는 서버 전용 (클라이언트에 노출 금지)
- ✅ `.env.local`은 `.gitignore`에 포함
- ✅ Vercel 환경 변수로 프로덕션 배포 시 주입

#### 4. API Route 보안

```typescript
// src/app/api/search-books/route.ts
export async function GET(request: NextRequest) {
  // 1. 환경 변수 확인
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }

  // 2. 입력 검증
  const query = searchParams.get('query');
  if (!query || query.trim().length === 0) {
    return NextResponse.json(
      { error: 'Query parameter is required' },
      { status: 400 }
    );
  }

  // 3. 안전한 API 호출 (서버 사이드)
  const response = await fetch(NAVER_BOOK_API_URL, {
    headers: {
      'X-Naver-Client-Id': clientId,
      'X-Naver-Client-Secret': clientSecret,
    },
  });

  // 4. 에러 처리
  if (!response.ok) {
    logger.error('Naver API error', { status: response.status });
    return NextResponse.json(
      { error: 'API error' },
      { status: response.status }
    );
  }

  // 5. 응답 반환
  return NextResponse.json(data);
}
```

#### 5. XSS 방지

React는 기본적으로 **자동 이스케이핑**을 제공하지만, 추가 보안 조치:

```typescript
// ✅ 안전 (React 자동 이스케이핑)
<p>{userInput}</p>

// ❌ 위험 (dangerouslySetInnerHTML)
<div dangerouslySetInnerHTML={{ __html: userInput }} /> // 절대 사용 금지!

// ✅ 안전 (HTML 태그 제거 유틸리티)
import { stripHtmlTags } from '@/lib/naver-book-api';

const cleanTitle = stripHtmlTags(book.title); // <b>태그 제거
```

---

## 확장성 고려사항 (Scalability Considerations)

### 수평 확장 (Horizontal Scaling)

#### 1. 서버리스 아키텍처의 장점

- **자동 스케일링**: Vercel Edge Functions는 트래픽에 따라 자동 확장
- **무제한 동시성**: Firebase Firestore는 동시 읽기/쓰기를 자동으로 처리
- **글로벌 CDN**: 정적 파일은 Vercel Edge Network를 통해 전 세계 배포

#### 2. Firebase Firestore 확장성

**현재 구조**:
- 컬렉션: 5개 (cohorts, participants, reading_submissions, notices, messages)
- 문서 크기: 평균 5KB 이하
- 쿼리 패턴: 단순 인덱스 쿼리 (where + orderBy)

**확장 전략**:
```typescript
// ✅ 복합 인덱스 생성 (Firebase Console)
// 예: participants 컬렉션
// - cohortId (Ascending) + createdAt (Descending)
// - firebaseUid (Ascending)

// ✅ 페이지네이션 구현 (대량 데이터 조회 시)
import { query, where, orderBy, limit, startAfter } from 'firebase/firestore';

const firstPage = query(
  collection(db, 'reading_submissions'),
  where('cohortId', '==', cohortId),
  orderBy('submittedAt', 'desc'),
  limit(20) // 20개씩 로드
);

// 다음 페이지
const nextPage = query(
  collection(db, 'reading_submissions'),
  where('cohortId', '==', cohortId),
  orderBy('submittedAt', 'desc'),
  startAfter(lastDoc), // 마지막 문서 기준
  limit(20)
);
```

#### 3. 이미지 최적화 및 CDN

```typescript
// ✅ WebP 포맷 사용 (파일 크기 30% 감소)
// ✅ 이미지 압축 (browser-image-compression 라이브러리)
import imageCompression from 'browser-image-compression';

const compressedFile = await imageCompression(file, {
  maxSizeMB: 1, // 최대 1MB
  maxWidthOrHeight: 1920, // 최대 1920px
  useWebWorker: true,
});

// ✅ Next.js Image 컴포넌트 사용 (자동 최적화)
import Image from 'next/image';

<Image
  src={imageUrl}
  alt="프로필 이미지"
  width={200}
  height={200}
  loading="lazy" // 지연 로딩
/>
```

#### 4. 캐싱 전략

**React Query 캐싱**:
```typescript
// ✅ staleTime 설정으로 불필요한 요청 감소
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 60초 - 이 시간 동안 재요청 안 함
      gcTime: 5 * 60 * 1000, // 5분 - 메모리 유지 시간
    },
  },
});
```

**API Route 캐싱**:
```typescript
// ✅ Next.js fetch 캐싱
const response = await fetch(url, {
  next: {
    revalidate: 3600, // 1시간 캐싱
  },
});

// ✅ HTTP 캐시 헤더
return NextResponse.json(data, {
  headers: {
    'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
  },
});
```

### 수직 확장 (Vertical Scaling)

#### 1. 코드 스플리팅 (Code Splitting)

```typescript
// ✅ 동적 import (필요할 때만 로드)
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <div className="shimmer h-40 w-full rounded-lg" />,
  ssr: false, // 클라이언트에서만 로드
});
```

#### 2. 데이터베이스 최적화

```typescript
// ✅ 필요한 필드만 조회 (Firestore는 전체 문서 반환, 클라이언트에서 필터링)
const participants = await getParticipantsByCohort(cohortId);
const names = participants.map(p => ({ id: p.id, name: p.name })); // 필요한 필드만 사용

// ✅ 배치 처리 (여러 작업을 한 번에)
import { writeBatch } from 'firebase/firestore';

const batch = writeBatch(db);
participants.forEach(p => {
  const ref = doc(db, 'participants', p.id);
  batch.update(ref, { updatedAt: Timestamp.now() });
});
await batch.commit(); // 한 번에 커밋
```

#### 3. AI 매칭 최적화

```typescript
// ✅ 비동기 작업으로 처리 (백그라운드)
// POST /api/admin/matching
export async function POST(request: NextRequest) {
  // 1. 작업 ID 생성
  const jobId = crypto.randomUUID();

  // 2. matching_jobs 컬렉션에 작업 생성
  await createMatchingJob({
    id: jobId,
    status: 'pending',
    cohortId,
    date,
  });

  // 3. 즉시 응답 반환 (사용자는 기다리지 않음)
  return NextResponse.json({ jobId, status: 'pending' });

  // 4. 백그라운드에서 처리 (Vercel Function 타임아웃 15분)
  // (실제로는 Vercel Cron Job 또는 Cloud Functions 사용 권장)
}
```

### 모니터링 및 성능 추적

```typescript
// ✅ 로거 유틸리티 사용
import { logger } from '@/lib/logger';

// 개발 환경: console.log
// 프로덕션 환경: Sentry 또는 LogRocket으로 전송 가능
logger.info('User logged in', { userId: participant.id });
logger.error('Failed to load notices', error);
```

**권장 모니터링 도구**:
- **Vercel Analytics**: 페이지 성능 추적
- **Firebase Performance Monitoring**: Firestore 쿼리 성능
- **Sentry**: 에러 추적 및 알림
- **LogRocket**: 사용자 세션 리플레이

---

## 요약 (Summary)

**필립앤소피** 플랫폼은 다음과 같은 아키텍처 특징을 가집니다:

### ✅ 핵심 설계 원칙

1. **서버리스 우선**: Firebase + Vercel로 완전한 서버리스 환경 구현
2. **실시간 동기화**: Firebase onSnapshot을 통한 즉각적인 UI 업데이트
3. **모바일 우선**: iOS PWA 최적화 및 반응형 디자인
4. **보안 중심**: 4계층 보안 아키텍처 (입력 검증 → API 검증 → Security Rules → 암호화)
5. **확장 가능**: 수평/수직 확장 전략 모두 고려

### 🏗️ 기술적 하이라이트

- **Next.js 16 App Router**: 파일 시스템 기반 라우팅, SSR/CSR 하이브리드
- **React Query + Firebase**: 서버 상태 관리와 실시간 구독의 조화
- **4자리 접근 코드**: 간편하면서도 안전한 인증 시스템
- **AI 매칭**: OpenAI API를 활용한 참가자 매칭 자동화

### 📈 확장성 로드맵

- **단기**: React Query 캐싱, 이미지 최적화, 코드 스플리팅
- **중기**: 페이지네이션, 배치 처리, 복합 인덱스
- **장기**: 마이크로서비스 분리, 전용 백엔드 API, 글로벌 CDN 확장

---

## 문서 변경 이력 (Changelog)

### v1.1.0 (2025-11-04)

**주요 변경사항**:
- **사용자 역할 시스템 업데이트**:
  - Ghost 역할 추가 (isGhost: true)
  - 관리자, 일반 참가자, 고스트 3개 역할 체계
  - 고스트 사용자는 통계/매칭에서 자동 제외

- **독서 인증 제출 시스템**:
  - Draft 제출물 처리 로직 추가 (isDraft 필드)
  - 임시 저장 제출물은 통계/매칭에서 제외
  - 제출 플로우에 draft 처리 설명 추가

- **AI 매칭 로직 개선**:
  - 관리자/고스트/임시저장 제출물 필터링 명시
  - 매칭 참가자 선정 기준 상세화

- **보안 아키텍처**:
  - Firestore Security Rules에 고스트 사용자 권한 추가
  - Draft 제출물 처리 규칙 추가

### v1.0.0 (2025-10-16)

**초기 버전**:
- 전체 시스템 아키텍처 문서 작성
- Next.js App Router + Firebase 서버리스 아키텍처 정의
- 3대 섹션 구조 (Landing, Member Portal, Data Center)
- 인증/권한 관리 시스템
- 데이터 흐름 및 상태 관리 전략
- 보안 아키텍처 4계층 구조
- 확장성 고려사항 및 최적화 전략

---

*이 문서는 필립앤소피 프로젝트의 시스템 아키텍처에 대한 단일 권위 문서입니다.*

**관련 문서**:
- [API Reference Documentation](../api/api-reference.md)
- [Development Setup & Workflow Guide](../development/setup-guide.md)
- [Database Optimization](../optimization/database.md)
- [PRD (Product Requirements Document)](./prd.md)
