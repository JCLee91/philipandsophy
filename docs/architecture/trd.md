# 필립앤소피 독서 소셜클럽 플랫폼 TRD (Technical Requirements Document)

**최종 업데이트**: 2025-10-11
**프로젝트 버전**: V1.0 (프로덕션 배포 완료)

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
    @apply bg-gradient-to-r from-gray-200 via-white to-gray-200 bg-[length:200%_100%] animate-shimmer;
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
  role: 'admin' | 'participant';
  isAdministrator: boolean;        // 관리자 여부
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
  status: 'approved';              // 자동 승인
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

## 5. API 통합

### 5.1 Naver Book Search API

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

### 5.2 OpenAI API (AI 매칭)

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

## 6. 성능 최적화

### 6.1 React Query 최적화

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

### 6.2 코드 스플리팅

```typescript
// 동적 임포트로 번들 크기 감소
const ReadingSubmissionDialog = dynamic(
  () => import('@/components/ReadingSubmissionDialog'),
  { loading: () => <Skeleton />, ssr: false }
);
```

### 6.3 이미지 최적화

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

## 7. 모바일 & PWA

### 7.1 PWA 설정

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

### 7.2 iOS PWA 최적화

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

## 8. 개발 환경

### 8.1 필수 도구

- **Node.js**: 18.x 이상
- **npm**: 9.x 이상
- **Git**: 2.x 이상
- **VS Code**: 권장 IDE

### 8.2 환경 변수

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

### 8.3 스크립트

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

## 9. 배포

### 9.1 Vercel 설정

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

### 9.2 CI/CD 파이프라인

```
Git Push → Vercel Build → TypeScript Check → ESLint → Deploy
```

## 10. 모니터링 및 로깅

### 10.1 Logger 시스템

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

### 10.2 성능 모니터링

- **Vercel Analytics**: Core Web Vitals
- **Firebase Console**: Firestore 쿼리 성능
- **Lighthouse CI**: 자동화된 성능 테스트

## 11. 보안

### 11.1 인증 흐름

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

### 11.2 XSS 방지

```typescript
// HTML 태그 제거
const sanitizeInput = (input: string) => {
  return input.replace(/<[^>]*>/g, '');
};
```

## 12. 테스트 전략

### 12.1 테스트 피라미드

```
    E2E (10%)
      ↑
 Integration (20%)
      ↑
   Unit (70%)
```

### 12.2 주요 테스트 케이스

- **Unit**: Firebase 함수, 유틸리티
- **Integration**: React Query 훅, API 라우트
- **E2E**: 코드 입장, 독서 인증 제출

---

**Last Updated**: 2025-10-11
**Project Version**: V1.0 (프로덕션 배포 완료)
**Location**: `docs/architecture/trd.md`
