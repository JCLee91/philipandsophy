# 필립앤소피 독서 소셜클럽 플랫폼 TRD (Technical Requirements Document)

**최종 업데이트**: 2025-11-04
**프로젝트 버전**: V1.1 (통계 시스템 개선 완료)

## 1. 기술 개요

### 1.1 시스템 아키텍처

필립앤소피 플랫폼은 **서버리스 아키텍처**를 채택하여 확장성과 유지보수성을 확보합니다.

```
┌─────────────────────────────────────────────────┐
│                  Vercel Edge                     │
│            (Next.js 15 App Router)               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │ Landing  │  │  WebApp  │  │   API    │      │
│  │  Pages   │  │  Routes  │  │  Routes  │      │
│  └──────────┘  └──────────┘  └──────────┘      │
└────────────────────┬────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
    ┌────▼─────┐         ┌──────▼──────┐
    │ Firebase │         │   Naver     │
    │          │         │  Book API   │
    │ Firestore│         │             │
    │ Storage  │         └─────────────┘
    └──────────┘
```

### 1.2 기술 스택 요약

| 계층 | 기술 | 버전 | 목적 |
|------|------|------|------|
| **프론트엔드** | Next.js | 15.1.0 | SSR/SSG, App Router |
| | React | 19.0.0 | UI 라이브러리 |
| | TypeScript | 5.x | 타입 안전성 |
| | Tailwind CSS | 3.4.x | 스타일링 |
| **상태 관리** | React Query | 5.x | 서버 상태 |
| | Zustand | 4.x | 전역 상태 |
| **백엔드** | Firebase Firestore | 12.3.0 | NoSQL 데이터베이스 |
| | Firebase Storage | 12.3.0 | 파일 저장소 |
| **외부 API** | Naver Book API | v1.1 | 책 검색 |
| | OpenAI API | GPT-4 | AI 매칭 |
| **배포** | Vercel | - | CDN + Edge Functions |

## 2. 시스템 요구사항

### 2.1 성능 요구사항

| 지표 | 목표 | 측정 방법 |
|------|------|-----------|
| **초기 로딩** | < 3초 | Lighthouse FCP |
| **페이지 전환** | < 1초 | 사용자 체감 |
| **이미지 로딩** | < 2초 | Next.js Image |
| **API 응답** | < 500ms | Firebase 평균 |
| **Lighthouse 점수** | > 90 | Core Web Vitals |

### 2.2 확장성 요구사항

- **동시 접속자**: 최대 100명 (기수별 20명 × 5기수)
- **데이터베이스**: Firestore 무료 티어 (50k reads/day)
- **스토리지**: Firebase Storage 무료 티어 (5GB)
- **CDN**: Vercel Edge Network (글로벌 배포)

### 2.3 보안 요구사항

- **인증**: 4자리 코드 기반, 서버 사이드 검증
- **세션**: LocalStorage 기반 (만료: 14일)
- **Firebase Rules**: 인증된 사용자만 읽기/쓰기
- **환경 변수**: `.env.local` (gitignore)
- **HTTPS**: Vercel 자동 SSL

### 2.4 접근성 요구사항

- **WCAG 2.1 AA 준수**
- **색상 대비**: 최소 4.5:1
- **키보드 네비게이션**: 모든 인터랙티브 요소
- **스크린 리더**: Semantic HTML + ARIA
- **반응형**: 320px ~ 1920px

## 3. 프론트엔드 아키텍처

### 3.1 Next.js 15 App Router

#### 라우트 구조

```typescript
app/
├── page.tsx                        // 랜딩페이지 (/)
├── layout.tsx                      // 루트 레이아웃 (SEO, 폰트)
├── providers.tsx                   // React Query, Theme, Firebase
├── app/                            // 웹앱 영역
│   ├── page.tsx                   // 접근 코드 입력 (/app)
│   ├── layout.tsx                 // 웹앱 레이아웃
│   ├── chat/                      // 채팅 및 공지
│   │   ├── page.tsx
│   │   ├── layout.tsx
│   │   ├── today-library/         // 오늘의 서재
│   │   │   └── page.tsx
│   │   └── participants/          // 참가자 리스트 (iOS PWA 전용)
│   │       └── page.tsx
│   ├── profile/[participantId]/   // 참가자 프로필
│   │   └── page.tsx
│   ├── program/                   // 프로그램 소개
│   │   └── page.tsx
│   └── admin/                     // 관리자 패널
│       └── matching/
│           └── page.tsx
└── api/                           // API Routes
    ├── naver-book-search/
    │   └── route.ts
    └── seed/
        └── route.ts
```

#### Server Components vs Client Components

```typescript
// Server Component (기본)
// - 데이터 페칭 최적화
// - SEO 친화적
// - 번들 크기 감소
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // 서버 사이드 데이터 페칭
}

// Client Component (명시적)
// - 인터랙티브 UI
// - 브라우저 API 사용
// - 상태 관리
'use client'
export default function InteractiveComponent() {
  const [state, setState] = useState();
  // 클라이언트 로직
}
```

### 3.2 상태 관리 전략

#### React Query (서버 상태)

```typescript
// 3단계 캐시 전략
const CACHE_CONFIG = {
  STATIC: {
    staleTime: 5 * 60 * 1000,      // 5분 (cohorts, participants)
    cacheTime: 10 * 60 * 1000,     // 10분
  },
  SEMI_DYNAMIC: {
    staleTime: 1 * 60 * 1000,      // 1분 (notices, submissions)
    cacheTime: 5 * 60 * 1000,      // 5분
  },
  REAL_TIME: {
    staleTime: 0,                   // 실시간 (messages, matching)
    cacheTime: 0,
    refetchInterval: 30 * 1000,     // 30초
  },
};
```

#### Zustand (전역 상태)

```typescript
// 경량 전역 상태 (세션, UI 상태)
interface GlobalStore {
  sessionToken: string | null;
  sessionExpiry: number | null;
  setSession: (token: string, expiry: number) => void;
  clearSession: () => void;
}
```

### 3.3 스타일링 시스템

#### Tailwind CSS 설정

```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      animation: {
        shimmer: 'shimmer 1.5s ease-in-out infinite'
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        }
      }
    }
  }
}
```

#### CSS Layers

```css
/* globals.css */
@layer utilities {
  .shimmer {
    @apply bg-linear-to-r from-gray-200 via-white to-gray-200 bg-size-[200%_100%] animate-shimmer;
    will-change: background-position;
  }

  @media (prefers-reduced-motion: reduce) {
    .shimmer {
      animation: none;
      background: theme('colors.gray.200') !important;
    }
  }
}
```

## 4. 백엔드 아키텍처

### 4.1 Firebase Firestore 스키마

#### Collections

```typescript
// cohorts: 기수 정보
interface Cohort {
  cohortId: string;
  name: string;                    // "1기"
  accessCode: string;              // 4자리 코드
  startDate: Timestamp;
  endDate: Timestamp;
  dailyFeaturedParticipants?: {   // AI 매칭 결과
    date: string;                  // "YYYY-MM-DD"
    similar: string[];             // [participantId, participantId]
    opposite: string[];            // [participantId, participantId]
  }[];
  createdAt: Timestamp;
}

// participants: 참가자 정보
interface Participant {
  participantId: string;
  cohortId: string;
  name: string;
  phone: string;
  role: 'admin' | 'participant' | 'ghost';  // **UPDATED**: ghost 역할 추가
  isAdministrator: boolean;        // 관리자 여부
  isSuperAdmin?: boolean;          // **NEW**: 슈퍼어드민 여부 (최고 권한)
  isGhost?: boolean;               // **NEW**: 고스트(테스터) 여부 (통계 제외)
  profileImage?: string;
  bio?: string;
  mbti?: string;
  job?: string;
  interests?: string[];
  favoriteGenres?: string[];
  currentBookTitle?: string;       // 현재 읽는 책
  currentBookAuthor?: string;
  currentBookCoverUrl?: string;
  hasSubmittedToday?: boolean;     // 오늘 독서 인증 여부
  createdAt: Timestamp;
}

// notices: 공지사항
interface Notice {
  noticeId: string;
  cohortId: string;
  title?: string;
  content: string;
  images?: string[];               // Firebase Storage URLs
  links?: string[];
  authorId: string;                // admin participantId
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

// reading_submissions: 독서 인증
interface ReadingSubmission {
  submissionId: string;
  participantId: string;
  cohortId: string;
  bookTitle: string;
  bookAuthor?: string;
  bookCoverUrl?: string;
  bookDescription?: string;
  imageUrl: string;                // Firebase Storage URL
  review: string;                  // 최소 40자
  dailyQuestion?: string;          // 오늘의 질문
  dailyAnswer?: string;            // 오늘의 답변
  status: 'approved' | 'draft';    // **UPDATED**: draft 상태 추가 (통계 제외)
  submittedAt: Timestamp;
}

// messages: 다이렉트 메시지
interface Message {
  messageId: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead: boolean;
  createdAt: Timestamp;
}
```

### 4.2 Firebase Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Cohorts: 모든 인증 사용자 읽기 가능
    match /cohorts/{cohortId} {
      allow read: if request.auth != null;
      allow write: if request.auth.token.admin == true;
    }

    // Participants: 본인 정보 읽기/수정
    match /participants/{participantId} {
      allow read: if request.auth != null;
      allow update: if request.auth.uid == participantId;
      allow create, delete: if request.auth.token.admin == true;
    }

    // Notices: 읽기는 모두, 쓰기는 관리자만
    match /notices/{noticeId} {
      allow read: if request.auth != null;
      allow write: if request.auth.token.admin == true;
    }

    // Reading Submissions: 본인 인증만 작성 가능
    match /reading_submissions/{submissionId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth.uid == resource.data.participantId;
    }

    // Messages: 송신자/수신자만 읽기 가능
    match /messages/{messageId} {
      allow read: if request.auth.uid == resource.data.senderId
                  || request.auth.uid == resource.data.receiverId;
      allow create: if request.auth != null;
    }
  }
}
```

### 4.3 Firebase Storage 구조

```
philipandsophy-storage/
├── reading_submissions/
│   └── {participantId}/
│       └── {timestamp}_{filename}.webp
├── profile_images/
│   └── {participantId}/
│       └── profile.webp
└── notices/
    └── {noticeId}/
        └── {filename}.webp
```

## 5. 사용자 역할 및 권한 시스템 **NEW**

### 5.1 참가자 역할 구분

필립앤소피 플랫폼은 3가지 참가자 역할을 지원합니다:

#### 1. 일반 참가자 (Participant)
```typescript
{
  role: 'participant',
  isAdministrator: false,
  isGhost: false
}
```
- **통계 포함**: 모든 통계 집계에 포함
- **매칭 포함**: AI 매칭 대상에 포함
- **권한**: 독서 인증, 프로필 수정, DM 발송

#### 2. 관리자 (Admin)
```typescript
{
  role: 'admin',
  isAdministrator: true
}
```
- **통계 제외**: 모든 통계 집계에서 제외
- **매칭 제외**: AI 매칭 대상에서 제외
- **권한**: 공지 작성/수정/삭제, 참가자 관리, 전체 DM 조회

#### 3. 고스트 (Ghost/Tester)
```typescript
{
  role: 'ghost',
  isGhost: true
}
```
- **통계 제외**: 모든 통계 집계에서 제외
- **매칭 제외**: AI 매칭 대상에서 제외
- **권한**: 일반 참가자와 동일 (테스트 목적)
- **용도**: QA 테스터, 베타 테스터, 임시 계정

#### 4. 슈퍼어드민 (Super Admin)
```typescript
{
  isSuperAdmin: true
}
```
- **통계 제외**: 모든 통계 집계에서 제외
- **매칭 제외**: AI 매칭 대상에서 제외
- **권한**: 최고 관리 권한 (코호트 생성, 전체 데이터 접근)

### 5.2 역할별 통계 포함/제외 규칙

#### 통계 집계 필터링 로직
```typescript
// 통계에서 제외할 참가자 판별
const shouldExcludeFromStats = (participant: Participant) => {
  return participant.isAdministrator === true
      || participant.isSuperAdmin === true
      || participant.isGhost === true;
};

// 통계에 포함할 참가자만 필터링
const regularParticipants = allParticipants.filter(p =>
  !shouldExcludeFromStats(p)
);
```

#### Draft 제출물 제외 로직
```typescript
// 통계에서 제외할 제출물 판별
const shouldExcludeSubmission = (submission: ReadingSubmission) => {
  return submission.status === 'draft';
};

// 승인된 제출물만 통계에 포함
const approvedSubmissions = allSubmissions.filter(s =>
  s.status === 'approved'
);
```

### 5.3 코호트 생성 시 역할 할당

#### CSV 업로드 형식
```csv
name,phone,role
홍길동,01012345678,participant
김관리,01087654321,admin
테스터,01099999999,ghost
```

#### 역할 변환 로직
```typescript
const normalizeRole = (role: string): 'participant' | 'admin' | 'ghost' => {
  const roleLower = role.toLowerCase().trim();

  if (roleLower === 'admin' || roleLower === 'administrator') {
    return 'admin';
  }

  if (roleLower === 'ghost' || roleLower === 'tester') {
    return 'ghost';
  }

  return 'participant';
};
```

#### Firestore 저장 형식
```typescript
// 일반 참가자
{
  role: 'participant',
  isAdministrator: false,
  // isGhost 필드 없음 또는 false
}

// 관리자
{
  role: 'admin',
  isAdministrator: true
}

// 고스트
{
  role: 'ghost',
  isGhost: true
}

// 슈퍼어드민
{
  isSuperAdmin: true,
  isAdministrator: true  // 관리자 권한도 포함
}
```

## 6. 데이터센터 통계 시스템 **UPDATED**

### 6.1 통계 API 엔드포인트

필립앤소피 플랫폼은 관리자용 데이터센터에서 다양한 통계를 제공합니다. 모든 통계 API는 **어드민, 슈퍼어드민, 고스트를 완전히 제외**하고 집계합니다.

#### API 목록 및 필터링 규칙

| API 엔드포인트 | 설명 | 제외 대상 | Draft 제외 |
|---------------|------|-----------|-----------|
| `/api/datacntr/submissions` | 독서 인증 현황판 | Admin, SuperAdmin, Ghost | ✅ |
| `/api/datacntr/stats/submissions` | 독서 인증 분석 | Admin, SuperAdmin, Ghost | ✅ |
| `/api/datacntr/stats/overview` | 통계 개요 | Admin, SuperAdmin, Ghost | ✅ |
| `/api/datacntr/stats/activity` | 활동 지표 | Admin, SuperAdmin, Ghost | ✅ |
| `/api/datacntr/cohorts/[cohortId]` | 코호트 상세 | Admin, SuperAdmin, Ghost | ✅ |
| `/api/datacntr/participants` | 참가자 목록 | Admin, SuperAdmin, Ghost | ✅ |
| `/api/datacntr/participants/list` | 참가자 리스트 | Admin, SuperAdmin, Ghost | ✅ |
| `/api/datacntr/participants/unverified` | 미인증 참가자 | Admin, SuperAdmin, Ghost | - |
| `/api/datacntr/export-books` | 책 목록 추출 | Admin, SuperAdmin, Ghost | ✅ |
| `/api/admin/matching/preview` | 매칭 프리뷰 | Admin, SuperAdmin, Ghost | - |
| Firebase Functions - `generateDailyMatching` | AI 매칭 생성 | Admin, SuperAdmin, Ghost | - |

### 6.2 통계 필터링 구현 패턴

#### 참가자 필터링
```typescript
// 모든 통계 API에서 사용하는 공통 필터
const regularParticipants = participants.filter(p =>
  !p.isAdministrator && !p.isSuperAdmin && !p.isGhost
);
```

#### 제출물 필터링
```typescript
// draft 상태 제외 + 관리자/고스트 제출물 제외
const validSubmissions = submissions.filter(s => {
  // 1. Draft 제외
  if (s.status === 'draft') return false;

  // 2. 제출자가 관리자/슈퍼어드민/고스트인지 확인
  const participant = participants.find(p => p.participantId === s.participantId);
  if (!participant) return false;

  if (participant.isAdministrator ||
      participant.isSuperAdmin ||
      participant.isGhost) {
    return false;
  }

  return true;
});
```

### 6.3 통계 정확성 보장

#### 2025-11-04 개선사항
- **11개 API 파일 수정**: 모든 통계 API에서 일관된 필터링 로직 적용
- **Draft 완전 제외**: 모든 집계에서 draft 상태 제출물 제외
- **3단계 필터링**:
  1. `isAdministrator === true` 제외
  2. `isSuperAdmin === true` 제외
  3. `isGhost === true` 제외

#### 통계 검증 체크리스트
- [ ] 참가자 수가 실제 일반 참가자 수와 일치하는가?
- [ ] 독서 인증 수에 draft가 포함되지 않았는가?
- [ ] 관리자/고스트의 활동이 통계에 영향을 주지 않는가?
- [ ] 평균/비율 계산 시 분모가 일반 참가자 수인가?

### 6.4 매칭 시스템 필터링

AI 매칭은 일반 참가자만 대상으로 진행됩니다:

```typescript
// Firebase Functions: generateDailyMatching
const eligibleParticipants = participants.filter(p =>
  !p.isAdministrator && !p.isSuperAdmin && !p.isGhost
);

// OpenAI API로 매칭 생성
const matching = await generateAIMatching(eligibleParticipants);
```

## 7. API 통합

### 7.1 Naver Book Search API

#### 엔드포인트

```
POST /api/naver-book-search
```

#### 요청

```typescript
interface BookSearchRequest {
  query: string;  // 책 제목
}
```

#### 응답

```typescript
interface BookSearchResponse {
  items: {
    title: string;
    author: string;
    publisher: string;
    image: string;
    description: string;
  }[];
}
```

#### 구현

```typescript
// app/api/naver-book-search/route.ts
export async function POST(request: Request) {
  const { query } = await request.json();

  const response = await axios.get('https://openapi.naver.com/v1/search/book.json', {
    params: { query, display: 5 },
    headers: {
      'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID!,
      'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET!,
    },
  });

  return Response.json(response.data);
}
```

### 7.2 OpenAI API (AI 매칭)

#### 사용 모델

- **GPT-4**: 성향 기반 참가자 매칭

#### 구현

```typescript
// lib/matching.ts
export async function generateDailyMatching(participants: Participant[]) {
  const prompt = `
    다음 참가자들을 분석하여:
    1. 성향이 비슷한 2명 (similar)
    2. 성향이 다른 2명 (opposite)

    JSON 형식으로 응답:
    {
      "similar": ["id1", "id2"],
      "opposite": ["id3", "id4"]
    }
  `;

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
  });

  return JSON.parse(response.choices[0].message.content);
}
```

## 8. 성능 최적화

### 8.1 React Query 최적화

#### Prefetching

```typescript
// 페이지 진입 전 데이터 미리 로딩
export async function prefetchCohortData(cohortId: string) {
  const queryClient = getQueryClient();

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ['cohort', cohortId],
      queryFn: () => getCohortById(cohortId),
    }),
    queryClient.prefetchQuery({
      queryKey: ['participants', cohortId],
      queryFn: () => getParticipantsByCohort(cohortId),
    }),
  ]);
}
```

#### 선택적 구독

```typescript
// 필요한 데이터만 실시간 구독
useEffect(() => {
  if (!isInFocus) return; // 포커스 없으면 구독 중지

  const unsubscribe = onSnapshot(
    collection(db, 'messages'),
    (snapshot) => {
      // 실시간 업데이트
    }
  );

  return unsubscribe;
}, [isInFocus]);
```

### 8.2 코드 스플리팅

```typescript
// 동적 임포트로 번들 크기 감소
const ReadingSubmissionDialog = dynamic(
  () => import('@/components/ReadingSubmissionDialog'),
  { loading: () => <Skeleton />, ssr: false }
);
```

### 8.3 이미지 최적화

```typescript
// Next.js Image 컴포넌트
<Image
  src={imageUrl}
  alt="독서 인증 이미지"
  width={600}
  height={400}
  quality={85}
  priority={isAboveFold}
  loading={isAboveFold ? 'eager' : 'lazy'}
/>
```

## 9. 모바일 & PWA

### 9.1 PWA 설정

#### manifest.json

```json
{
  "name": "필립앤소피 독서 소셜클럽",
  "short_name": "필립앤소피",
  "description": "독서로 연결되는 사람들",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#FFFFFF",
  "theme_color": "#1E2A44",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### 9.2 iOS PWA 최적화

#### Safe Area 대응

```css
/* iOS 노치 대응 */
body {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}

/* iOS PWA 감지 */
@media (display-mode: standalone) {
  /* PWA 전용 스타일 */
}
```

#### position:fixed 스크롤 버그 해결

```typescript
// useIsIosStandalone.ts
export function useIsIosStandalone() {
  const [isIosStandalone, setIsIosStandalone] = useState(false);

  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    setIsIosStandalone(isIOS && isStandalone);
  }, []);

  return isIosStandalone;
}
```

## 10. 개발 환경

### 10.1 필수 도구

- **Node.js**: 18.x 이상
- **npm**: 9.x 이상
- **Git**: 2.x 이상
- **VS Code**: 권장 IDE

### 10.2 환경 변수

```bash
# .env.local
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=

OPENAI_API_KEY=
```

### 10.3 스크립트

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "seed:all": "npm run seed:cohorts && npm run seed:notices && npm run seed:submissions",
    "cleanup:dummy": "tsx src/scripts/cleanup-dummy-data.ts"
  }
}
```

## 11. 배포

### 11.1 Vercel 설정

#### vercel.json

```json
{
  "buildCommand": "npm run build",
  "framework": "nextjs",
  "regions": ["icn1"],
  "env": {
    "NEXT_PUBLIC_FIREBASE_API_KEY": "@firebase-api-key",
    "NAVER_CLIENT_ID": "@naver-client-id",
    "NAVER_CLIENT_SECRET": "@naver-client-secret"
  }
}
```

### 11.2 CI/CD 파이프라인

```
Git Push → Vercel Build → TypeScript Check → ESLint → Deploy
```

## 12. 모니터링 및 로깅

### 12.1 Logger 시스템

```typescript
// lib/logger.ts
export const logger = {
  error: (message: string, error?: Error) => {
    if (process.env.NODE_ENV === 'production') {
      // Sentry.captureException(error);
    } else {
      console.error(message, error);
    }
  },
  warn: (message: string) => console.warn(message),
  info: (message: string) => console.info(message),
  debug: (message: string) => console.debug(message),
};
```

### 12.2 성능 모니터링

- **Vercel Analytics**: Core Web Vitals
- **Firebase Console**: Firestore 쿼리 성능
- **Lighthouse CI**: 자동화된 성능 테스트

## 13. 보안

### 13.1 인증 흐름

```typescript
// 1. 4자리 코드 입력
const validateAccessCode = async (code: string) => {
  const cohort = await getCohortByAccessCode(code);
  if (!cohort) throw new Error('Invalid code');

  // 2. 세션 생성
  const session = {
    token: generateToken(),
    expiry: Date.now() + 14 * 24 * 60 * 60 * 1000, // 14일
  };

  // 3. LocalStorage 저장
  localStorage.setItem('session', JSON.stringify(session));
};
```

### 13.2 XSS 방지

```typescript
// HTML 태그 제거
const sanitizeInput = (input: string) => {
  return input.replace(/<[^>]*>/g, '');
};
```

## 14. 테스트 전략

### 14.1 테스트 피라미드

```
    E2E (10%)
      ↑
 Integration (20%)
      ↑
   Unit (70%)
```

### 14.2 주요 테스트 케이스

- **Unit**: Firebase 함수, 유틸리티
- **Integration**: React Query 훅, API 라우트
- **E2E**: 코드 입장, 독서 인증 제출

---

## 15. 변경 이력

### V1.1 (2025-11-04) - 통계 시스템 개선
- **고스트(Ghost) 역할 추가**: QA/테스터 계정을 위한 새로운 역할
- **통계 필터링 로직 강화**: 11개 API에서 어드민/슈퍼어드민/고스트 완전 제외
- **Draft 상태 제외**: 모든 통계 집계에서 draft 제출물 제외
- **참가자 역할 시스템 문서화**: 4가지 역할(Participant, Admin, Ghost, SuperAdmin) 명확화

### V1.0 (2025-10-13) - 프로덕션 배포
- 초기 프로덕션 배포 완료
- 기본 기능 구현 (독서 인증, 매칭, 프로필, 공지)

---

**Last Updated**: 2025-11-04
**Project Version**: V1.1 (통계 시스템 개선 완료)
**Location**: `docs/architecture/trd.md`
