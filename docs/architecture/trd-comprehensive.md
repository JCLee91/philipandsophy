# 필립앤소피 독서 소셜클럽 플랫폼 TRD (Technical Requirements Document)

**문서 버전**: 3.0 - Comprehensive Edition
**최종 업데이트**: 2025년 10월 16일
**프로젝트 상태**: V1.0 프로덕션 배포 완료
**작성자**: Technical Documentation Specialist

---

## 📋 목차

1. [기술 개요](#1-기술-개요)
2. [시스템 아키텍처](#2-시스템-아키텍처)
3. [기술 스택 상세](#3-기술-스택-상세)
4. [API 명세](#4-api-명세)
5. [데이터베이스 아키텍처](#5-데이터베이스-아키텍처)
6. [성능 요구사항](#6-성능-요구사항)
7. [보안 요구사항](#7-보안-요구사항)
8. [확장성 및 인프라](#8-확장성-및-인프라)
9. [개발 환경](#9-개발-환경)
10. [배포 전략](#10-배포-전략)
11. [모니터링 및 로깅](#11-모니터링-및-로깅)
12. [테스트 전략](#12-테스트-전략)

---

## 1. 기술 개요

### 1.1 아키텍처 철학

필립앤소피 플랫폼은 다음 원칙을 기반으로 설계되었습니다:

- **서버리스 우선 (Serverless-First)**: Firebase와 Vercel Edge를 활용한 완전 서버리스 아키텍처
- **모노레포 구조 (Monorepo)**: 랜딩페이지, 웹앱, Data Center가 하나의 프로젝트로 통합
- **타입 안전성 (Type Safety)**: TypeScript 5를 통한 전체 코드베이스 타입 보장
- **실시간 우선 (Realtime-First)**: Firebase `onSnapshot`을 활용한 실시간 데이터 동기화
- **모바일 우선 (Mobile-First)**: 80% 모바일 사용자를 위한 반응형 + PWA 최적화

### 1.2 기술 선택 근거

| 기술 | 선택 이유 | 대안 고려 |
|------|----------|----------|
| **Next.js 15** | App Router의 Server Components로 초기 로딩 최적화, Vercel과 완벽한 통합 | Remix, Astro |
| **Firebase** | 실시간 동기화 + 파일 저장소 + 인증 통합, 무료 티어로 MVP 검증 | Supabase, PlanetScale + S3 |
| **React Query v5** | 서버 상태 캐싱 및 동기화, DevTools 제공 | SWR, Apollo Client |
| **Zustand** | 경량 전역 상태 관리 (2.9KB), Redux보다 간결 | Jotai, Valtio |
| **Tailwind CSS** | 빠른 UI 개발, Tree-shaking으로 최소 번들 사이즈 | Styled-components, CSS Modules |

---

## 2. 시스템 아키텍처

### 2.1 고수준 아키텍처 다이어그램

```
┌──────────────────────────────────────────────────────────────┐
│                      클라이언트 레이어                          │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Landing   │  │   Web App   │  │ Data Center │        │
│  │   (/)       │  │   (/app)    │  │ (/datacntr) │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│         │                 │                 │               │
│         └─────────────────┴─────────────────┘               │
│                           │                                 │
└───────────────────────────┼─────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
┌───────────────▼──────────┐ ┌─────────▼──────────┐
│   Vercel Edge Network    │ │  Firebase Services  │
│   (Next.js 15 Runtime)   │ │                     │
│                          │ │  ┌──────────────┐   │
│  - Server Components     │ │  │  Firestore   │   │
│  - API Routes            │ │  │  (NoSQL DB)  │   │
│  - Static Generation     │ │  └──────────────┘   │
│  - Image Optimization    │ │  ┌──────────────┐   │
│  - Edge Functions        │ │  │   Storage    │   │
└──────────────────────────┘ │  │  (Files/CDN) │   │
                             │  └──────────────┘   │
┌──────────────────────────┐ │  ┌──────────────┐   │
│   External APIs          │ │  │     Auth     │   │
│                          │ │  │ (Phone/JWT)  │   │
│  ┌──────────────────┐    │ │  └──────────────┘   │
│  │ Naver Book API   │    │ └────────────────────┘
│  │ (책 검색)         │    │
│  └──────────────────┘    │
│  ┌──────────────────┐    │
│  │  OpenAI GPT-4    │    │
│  │ (AI 매칭 엔진)    │    │
│  └──────────────────┘    │
└──────────────────────────┘
```

### 2.2 데이터 흐름 아키텍처

#### 2.2.1 독서 인증 제출 플로우

```
사용자 (모바일 브라우저)
    │
    │ 1. 책 제목 입력 (자동완성)
    ├──────────────────────────────────────────┐
    │                                          │
    ▼                                          ▼
Next.js API Route                       Firebase Storage
(/api/naver-book-search)                    │
    │                                          │
    ▼                                          │
Naver Book API                                │
    │                                          │
    │ 2. 책 정보 반환                           │
    ▼                                          │
사용자 (책 선택 + 사진 업로드)                  │
    │                                          │
    │ 3. 이미지 업로드                          │
    └──────────────────────────────────────────┤
                                              │
                              4. URL 반환      │
                                              ▼
                                        Firebase Firestore
                                      (reading_submissions)
                                              │
                              5. 실시간 구독    │
                            (onSnapshot)      │
                                              ▼
                                        React Query Cache
                                        (staleTime: 1분)
                                              │
                                              ▼
                                        UI 자동 업데이트
                                    (Today's Library)
```

#### 2.2.2 AI 매칭 플로우

```
관리자 (Data Center)
    │
    │ 1. "매칭 미리보기" 버튼 클릭
    ▼
Next.js API Route
(/api/generate-matching)
    │
    │ 2. 참가자 데이터 조회
    ▼
Firebase Firestore
(participants + reading_submissions)
    │
    │ 3. 프로필 + 독서 이력 취합
    ▼
OpenAI API
(GPT-4 Turbo)
    │
    │ 4. AI 분석 및 매칭
    │    - 성향 비슷한 2명
    │    - 성향 다른 2명
    │    - 매칭 이유 설명
    ▼
관리자 (매칭 결과 확인)
    │
    │ 5. "최종 적용" 버튼 클릭
    ▼
Firebase Firestore
(cohorts.dailyFeaturedParticipants)
    │
    │ 6. 실시간 반영
    ▼
Today's Library
(블루/주황 테두리 하이라이트)
```

### 2.3 인증 및 권한 아키텍처

#### 2.3.1 이중 인증 시스템

```
┌─────────────────────────────────────────────┐
│         일반 사용자 인증 (접근 코드)          │
│                                             │
│  사용자 입력: 4자리 코드 (예: 1234)          │
│       ↓                                     │
│  Firestore Query:                           │
│    cohorts.where('accessCode', '==', code)  │
│       ↓                                     │
│  코드 검증 성공                              │
│       ↓                                     │
│  LocalStorage 세션 저장 (14일 유효)          │
│  { cohortId, accessCode, expiry }           │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│      관리자 인증 (Firebase Phone Auth)       │
│                                             │
│  관리자 입력: 전화번호 (010-XXXX-XXXX)       │
│       ↓                                     │
│  Firebase Phone Authentication              │
│       ↓                                     │
│  SMS 인증 코드 발송                          │
│       ↓                                     │
│  코드 입력 및 검증                           │
│       ↓                                     │
│  Firebase Custom Claims 확인:               │
│  { admin: true } or { isAdministrator: true }│
│       ↓                                     │
│  Data Center 접근 허용                       │
└─────────────────────────────────────────────┘
```

#### 2.3.2 권한 레벨

| 권한 레벨 | 인증 방식 | 접근 가능 영역 | 권한 |
|----------|----------|---------------|------|
| **Guest** | 없음 | `/` (랜딩페이지만) | 읽기 전용 |
| **Member** | 4자리 접근 코드 | `/app/*` (웹앱) | 공지 조회, 독서 인증, DM 발송 |
| **Administrator** | Firebase Phone Auth + Custom Claims | `/datacntr/*` (Data Center) | 모든 데이터 읽기/쓰기, 공지 발행, 매칭 관리 |

---

## 3. 기술 스택 상세

### 3.1 프론트엔드 스택

#### 3.1.1 코어 프레임워크

| 라이브러리 | 버전 | 용도 | 주요 기능 |
|-----------|------|------|----------|
| **Next.js** | 15.1.0 | React 메타 프레임워크 | App Router, Server Components, ISR, Image Optimization |
| **React** | 19.0.0 | UI 라이브러리 | JSX, Hooks, Suspense, Concurrent Features |
| **TypeScript** | 5.x | 타입 시스템 | 타입 체크, IntelliSense, 컴파일 타임 에러 방지 |

#### 3.1.2 스타일링 시스템

| 라이브러리 | 버전 | 용도 | 특징 |
|-----------|------|------|------|
| **Tailwind CSS** | 3.4.1 | 유틸리티 CSS | JIT 컴파일, Tree-shaking, 반응형 유틸리티 |
| **Shadcn UI** | Latest | 컴포넌트 라이브러리 | Radix UI 기반, 커스터마이징 가능, 접근성 내장 |
| **Framer Motion** | 11.x | 애니메이션 | Declarative API, 스크롤 애니메이션, Gestures |
| **Lucide React** | 0.469.0 | 아이콘 | Tree-shakable SVG 아이콘, 1000+ 아이콘 |

**커스텀 Tailwind 설정**:

```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      // 커스텀 색상 시스템
      colors: {
        'library-blue': '#45a1fd',
        'library-blue-light': '#cee7ff',
        'library-yellow': '#ffd362',
        'library-yellow-light': '#fff2d2',
        admin: {
          text: { primary: '#31363e', secondary: '#8f98a3' },
          bg: { page: '#eff6ff', card: '#ffffff' },
          brand: '#45a1fd'
        }
      },
      // 커스텀 애니메이션 (Shimmer)
      animation: {
        shimmer: 'shimmer 1.5s ease-in-out infinite'
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-100% 0' },
          '100%': { backgroundPosition: '100% 0' }
        }
      },
      // 커스텀 트랜지션 타이밍
      transitionDuration: {
        'fast': '150ms',
        'normal': '300ms',
        'slow': '500ms'
      }
    }
  }
}
```

#### 3.1.3 상태 관리 스택

| 라이브러리 | 버전 | 용도 | 상태 범위 |
|-----------|------|------|----------|
| **@tanstack/react-query** | 5.x | 서버 상태 관리 | API 응답, 캐싱, 동기화, Optimistic Updates |
| **Zustand** | 4.x | 전역 클라이언트 상태 | 세션, UI 상태, 모달 상태 |
| **React Context API** | Built-in | 컨텍스트 공유 | Theme, Auth, Platform 감지 |

**React Query 캐시 전략 (3단계)**:

```typescript
// src/constants/api.ts
export const CACHE_CONFIG = {
  // 정적 데이터 (기수, 참가자 프로필)
  STATIC: {
    staleTime: 5 * 60 * 1000,      // 5분
    cacheTime: 10 * 60 * 1000,     // 10분
    refetchOnWindowFocus: false
  },
  // 준동적 데이터 (공지, 독서 인증)
  SEMI_DYNAMIC: {
    staleTime: 1 * 60 * 1000,      // 1분
    cacheTime: 5 * 60 * 1000,      // 5분
    refetchOnWindowFocus: true
  },
  // 실시간 데이터 (메시지, AI 매칭)
  REAL_TIME: {
    staleTime: 30 * 1000,          // 30초
    cacheTime: 1 * 60 * 1000,      // 1분
    refetchInterval: 30 * 1000     // 30초마다 자동 갱신
  }
} as const;
```

### 3.2 백엔드 스택 (Firebase)

#### 3.2.1 Firebase 서비스 구성

| 서비스 | 버전 | 용도 | 주요 기능 |
|--------|------|------|----------|
| **Firestore** | 12.3.0 | NoSQL 데이터베이스 | 실시간 동기화, 오프라인 지원, 트랜잭션 |
| **Storage** | 12.3.0 | 파일 저장소 | 이미지 업로드, CDN 배포, 보안 규칙 |
| **Authentication** | 12.3.0 | 인증 서비스 | Phone Auth, Custom Claims, 세션 관리 |
| **Admin SDK** | 13.5.0 | 서버 사이드 SDK | 관리자 작업, Custom Claims 설정 |

#### 3.2.2 Firebase 초기화 패턴

```typescript
// lib/firebase/client.ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

let firebaseApp: ReturnType<typeof initializeApp> | null = null;

export function initializeFirebase() {
  if (firebaseApp) return firebaseApp;

  firebaseApp = initializeApp({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!
  });

  return firebaseApp;
}

export const getDb = () => getFirestore(initializeFirebase());
export const getStorageInstance = () => getStorage(initializeFirebase());
export const getFirebaseAuth = () => getAuth(initializeFirebase());
```

### 3.3 외부 API 통합

#### 3.3.1 Naver Book Search API

**버전**: v1.1
**인증**: Client ID + Client Secret (Header 방식)
**Rate Limit**: 25,000 calls/day (무료 티어)

**통합 방식**:

```typescript
// app/api/naver-book-search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
  const { query } = await request.json();

  const response = await axios.get('https://openapi.naver.com/v1/search/book.json', {
    params: {
      query,
      display: 5,  // 최대 5개 결과
      sort: 'sim'  // 정확도순 정렬
    },
    headers: {
      'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID!,
      'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET!
    }
  });

  return NextResponse.json(response.data);
}
```

**응답 스키마**:

```typescript
interface NaverBookSearchResponse {
  lastBuildDate: string;
  total: number;
  start: number;
  display: number;
  items: {
    title: string;       // HTML 태그 포함 (예: "<b>클린</b> 코드")
    link: string;
    image: string;       // 표지 이미지 URL (SSL)
    author: string;
    discount: string;    // 할인가
    publisher: string;
    pubdate: string;     // YYYYMMDD
    isbn: string;        // ISBN-13
    description: string; // 책 소개 (최대 300자)
  }[];
}
```

#### 3.3.2 OpenAI API (GPT-4 Turbo)

**버전**: GPT-4 Turbo (gpt-4-turbo-2024-04-09)
**인증**: Bearer Token (API Key)
**Rate Limit**: 10,000 TPM (Tokens Per Minute) - Tier 1

**통합 방식**:

```typescript
// lib/matching/openai.ts
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

export async function generateAIMatching(participants: Participant[]) {
  const prompt = `
당신은 독서 모임 참가자들의 성향을 분석하는 전문가입니다.
아래 참가자들의 정보를 바탕으로, 각 참가자마다 다음을 추천해주세요:
1. 성향이 비슷한 2명 (similar)
2. 성향이 다른 2명 (opposite)

참가자 정보:
${participants.map(p => `
- ID: ${p.id}
- 이름: ${p.name}
- MBTI: ${p.mbti}
- 관심사: ${p.interests?.join(', ')}
- 좋아하는 장르: ${p.favoriteGenres?.join(', ')}
- 최근 독서 리뷰: ${p.recentReviews?.slice(0, 3).join(' / ')}
`).join('\n')}

JSON 형식으로만 응답해주세요:
{
  "assignments": {
    "participant-id": {
      "similar": ["id1", "id2"],
      "opposite": ["id3", "id4"],
      "reasons": {
        "similar": "비슷한 이유 설명",
        "opposite": "다른 이유 설명",
        "summary": "전체 요약"
      }
    }
  }
}
  `.trim();

  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    messages: [
      { role: 'system', content: '당신은 독서 모임 매칭 전문가입니다.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.7,
    max_tokens: 4000,
    response_format: { type: 'json_object' }
  });

  return JSON.parse(response.choices[0].message.content!);
}
```

---

## 4. API 명세

### 4.1 Next.js API Routes

#### 4.1.1 책 검색 API

**Endpoint**: `POST /api/naver-book-search`

**Request Body**:
```typescript
{
  query: string  // 검색어 (책 제목, 저자명)
}
```

**Response** (200 OK):
```typescript
{
  total: number,
  items: Array<{
    title: string,
    author: string,
    publisher: string,
    image: string,      // HTTPS URL
    description: string
  }>
}
```

**Error Responses**:
- `400 Bad Request`: query 파라미터 누락
- `429 Too Many Requests`: Naver API Rate Limit 초과
- `500 Internal Server Error`: Naver API 오류

**Rate Limiting**: 500ms debounce (클라이언트), 5분 캐싱 (React Query)

#### 4.1.2 시딩 API (개발 전용)

**Endpoint**: `POST /api/seed`

**Request Body**:
```typescript
{
  type?: 'cohorts' | 'participants' | 'notices' | 'submissions' | 'all'
}
```

**Response** (200 OK):
```typescript
{
  success: true,
  message: string,
  data: {
    cohortsCreated: number,
    participantsCreated: number,
    noticesCreated: number,
    submissionsCreated: number
  }
}
```

**Access Control**: 개발 환경에서만 실행 가능 (`NODE_ENV === 'development'`)

### 4.2 Firebase Client SDK 작업

#### 4.2.1 Cohort 작업

**생성**:
```typescript
import { createCohort } from '@/lib/firebase';

const cohortId = await createCohort({
  name: '2기',
  startDate: '2025-04-01',
  endDate: '2025-06-30',
  isActive: false
});
```

**조회**:
```typescript
import { getCohortById, getAllCohorts, getActiveCohorts } from '@/lib/firebase';

const cohort = await getCohortById('cohort1');
const allCohorts = await getAllCohorts();
const activeCohorts = await getActiveCohorts();
```

**업데이트**:
```typescript
import { updateCohort } from '@/lib/firebase';

await updateCohort('cohort1', {
  isActive: true,
  dailyFeaturedParticipants: {
    '2025-10-15': {
      assignments: { /* ... */ }
    }
  }
});
```

#### 4.2.2 Participant 작업

**생성**:
```typescript
import { createParticipant } from '@/lib/firebase';

const participantId = await createParticipant({
  cohortId: 'cohort1',
  name: '홍길동',
  phoneNumber: '01012345678',
  gender: 'male',
  occupation: '개발자'
});
```

**조회**:
```typescript
import {
  getParticipantById,
  getParticipantByPhoneNumber,
  getParticipantsByCohort
} from '@/lib/firebase';

const participant = await getParticipantById('participant123');
const byPhone = await getParticipantByPhoneNumber('010-1234-5678');
const cohortParticipants = await getParticipantsByCohort('cohort1');
```

**책 정보 업데이트 (트랜잭션)**:
```typescript
import { updateParticipantBookInfo } from '@/lib/firebase';

await updateParticipantBookInfo(
  'participant123',
  '클린 코드',
  '로버트 C. 마틴',
  'https://cover-url.com/clean-code.jpg'
);
```

#### 4.2.3 Reading Submission 작업

**생성**:
```typescript
import { createSubmission } from '@/lib/firebase';

const submissionId = await createSubmission({
  participantId: 'participant123',
  participationCode: 'COHORT1',
  bookTitle: '클린 코드',
  bookAuthor: '로버트 C. 마틴',
  bookCoverUrl: 'https://naver-api.com/cover.jpg',
  bookImageUrl: 'https://storage.firebase.com/reading.webp',
  review: '이 책을 읽고 코드 품질의 중요성을 깨달았습니다.',
  dailyQuestion: '가장 인상 깊었던 원칙은?',
  dailyAnswer: '함수는 한 가지 일만 해야 한다',
  status: 'approved'
});
```

**실시간 구독 (오늘 제출 참가자)**:
```typescript
import { subscribeTodayVerified } from '@/lib/firebase';

const unsubscribe = subscribeTodayVerified('cohort1', (participantIds) => {
  console.log('오늘 인증 완료:', participantIds);
});

// 컴포넌트 언마운트 시
return () => unsubscribe();
```

#### 4.2.4 Storage 작업

**이미지 업로드**:
```typescript
import { uploadReadingImage } from '@/lib/firebase';

const imageUrl = await uploadReadingImage(
  'participant123',
  imageFile,  // File 객체
  (progress) => {
    console.log(`업로드 진행률: ${progress}%`);
  }
);
```

**경로 규칙**:
```
reading_submissions/{participantId}/{timestamp}_{filename}.webp
profile_images/{participantId}/profile.webp
notices/{noticeId}/{filename}.webp
```

### 4.3 Firebase Admin SDK 작업 (서버 전용)

#### 4.3.1 Custom Claims 설정

```typescript
// scripts/set-admin-claims.ts
import { initializeAdminApp, setAdminClaims } from '@/lib/firebase/admin';

await initializeAdminApp();

// 관리자 권한 부여
await setAdminClaims('firebase-uid-abc123', {
  admin: true,
  isAdministrator: true
});
```

#### 4.3.2 사용자 검증

```typescript
import { verifyIdToken } from '@/lib/firebase/admin';

const decodedToken = await verifyIdToken(idToken);

if (decodedToken.admin) {
  // 관리자 전용 작업
}
```

---

## 5. 데이터베이스 아키텍처

### 5.1 Firestore 컬렉션 구조

상세한 스키마는 [Database Schema 문서](../../database/schema.md)를 참조하세요.

#### 5.1.1 컬렉션 요약

| 컬렉션 | 문서 수 | 주요 쿼리 | 인덱스 |
|--------|--------|----------|--------|
| `cohorts` | ~10 | `isActive == true` | `isActive (ASC)` |
| `participants` | ~200 | `cohortId == X, orderBy createdAt` | `(cohortId ASC, createdAt ASC)` |
| `reading_submissions` | ~3,000 | `participantId == X, orderBy submittedAt DESC` | `(participantId ASC, submittedAt DESC)` |
| `notices` | ~50 | `cohortId == X, orderBy createdAt DESC` | `(cohortId ASC, createdAt DESC)` |
| `messages` | ~5,000 | `conversationId == X, orderBy createdAt ASC` | `(conversationId ASC, createdAt ASC)` |
| `matching_jobs` | ~100 | `cohortId == X, status == 'pending'` | `(cohortId ASC, status ASC)` |

### 5.2 Firebase Security Rules 핵심

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() {
      return request.auth != null;
    }

    function isAdminClaim() {
      return isSignedIn() && request.auth.token.admin == true;
    }

    function isOwnParticipant(participantId) {
      return exists(/databases/$(database)/documents/participants/$(participantId)) &&
             get(/databases/$(database)/documents/participants/$(participantId)).data.firebaseUid == request.auth.uid;
    }

    // Cohorts: 공개 읽기, 관리자만 쓰기
    match /cohorts/{cohortId} {
      allow read: if true;
      allow write: if isAdminClaim();
    }

    // Reading Submissions: 본인만 작성, 모두 읽기
    match /reading_submissions/{submissionId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn() &&
        isOwnParticipant(request.resource.data.participantId) &&
        request.resource.data.status == 'approved';
      allow update, delete: if isSignedIn() &&
        isOwnParticipant(resource.data.participantId);
    }

    // Messages: 송수신자만 읽기/쓰기
    match /messages/{messageId} {
      allow read: if isSignedIn() && (
        isOwnParticipant(resource.data.senderId) ||
        isOwnParticipant(resource.data.receiverId)
      );
      allow create: if isSignedIn() &&
        isOwnParticipant(request.resource.data.senderId);
      allow update: if isSignedIn() &&
        isOwnParticipant(resource.data.receiverId) &&
        request.resource.data.diff(resource.data).affectedKeys().hasOnly(['isRead']);
    }
  }
}
```

### 5.3 데이터 일관성 보장 (트랜잭션)

**책 정보 업데이트 예시**:

```typescript
import { runTransaction } from 'firebase/firestore';

await runTransaction(db, async (transaction) => {
  const participantRef = doc(db, 'participants', participantId);
  const participantSnap = await transaction.get(participantRef);

  if (!participantSnap.exists()) {
    throw new Error('Participant not found');
  }

  const data = participantSnap.data();
  const updates: any = {
    currentBookTitle: newBookTitle,
    currentBookAuthor: newBookAuthor,
    currentBookCoverUrl: newBookCoverUrl,
    updatedAt: Timestamp.now()
  };

  // 책이 변경되었으면 bookHistory 업데이트
  if (data.currentBookTitle && data.currentBookTitle !== newBookTitle) {
    updates.bookHistory = arrayUnion({
      title: data.currentBookTitle,
      startedAt: data.bookStartedAt || Timestamp.now(),
      endedAt: Timestamp.now()
    });
  }

  transaction.update(participantRef, updates);
});
```

---

## 6. 성능 요구사항

### 6.1 Core Web Vitals 목표

| 지표 | 목표 | 현재 | 측정 방법 |
|------|------|------|-----------|
| **LCP** (Largest Contentful Paint) | < 2.5s | 2.1s | Lighthouse, Vercel Analytics |
| **FID** (First Input Delay) | < 100ms | 45ms | Real User Monitoring |
| **CLS** (Cumulative Layout Shift) | < 0.1 | 0.05 | Lighthouse |
| **FCP** (First Contentful Paint) | < 1.8s | 1.4s | Lighthouse |
| **TTI** (Time to Interactive) | < 3.8s | 3.2s | Lighthouse |

### 6.2 성능 최적화 전략

#### 6.2.1 React Query 캐싱

**설정** (`src/app/providers.tsx`):

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,     // 기본 1분
      cacheTime: 5 * 60 * 1000, // 기본 5분
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});
```

**69.5% 읽기 감소 효과** (최적화 전후 비교):

| 작업 | 최적화 전 | 최적화 후 | 감소율 |
|------|----------|----------|--------|
| 공지사항 조회 | 매번 조회 | 5분 캐싱 | -83% |
| 참가자 목록 | 매번 조회 | 5분 캐싱 | -83% |
| 독서 인증 목록 | 매번 조회 | 1분 캐싱 | -50% |
| **평균** | 100% | **30.5%** | **-69.5%** |

#### 6.2.2 이미지 최적화

**Next.js Image 컴포넌트**:

```typescript
import Image from 'next/image';

<Image
  src={bookCoverUrl}
  alt="책 표지"
  width={120}
  height={180}
  quality={85}
  loading="lazy"
  placeholder="blur"
  blurDataURL="/placeholder.jpg"
/>
```

**WebP 변환** (클라이언트 사이드):

```typescript
import imageCompression from 'browser-image-compression';

const options = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  fileType: 'image/webp'
};

const compressedFile = await imageCompression(file, options);
```

**결과**: 평균 70% 용량 감소 (JPEG 대비)

#### 6.2.3 코드 스플리팅

**동적 임포트**:

```typescript
import dynamic from 'next/dynamic';

const ReadingSubmissionDialog = dynamic(
  () => import('@/components/ReadingSubmissionDialog'),
  {
    loading: () => <Skeleton className="w-full h-96" />,
    ssr: false  // 클라이언트 전용 컴포넌트
  }
);
```

**Route-based Splitting** (자동):
- `/` - 69KB (랜딩페이지)
- `/app` - 42KB (접근 코드 입력)
- `/app/chat` - 78KB (채팅 + 공지)
- `/app/chat/today-library` - 85KB (Today's Library)
- `/datacntr` - 112KB (Data Center)

#### 6.2.4 Prefetching

**Server Component Prefetch**:

```typescript
// app/app/chat/page.tsx (Server Component)
import { getCohortById, getNoticesByCohort } from '@/lib/firebase/server';

export default async function ChatPage({ searchParams }: Props) {
  const { cohortId } = await searchParams;

  // 서버 사이드에서 데이터 미리 페칭
  const [cohort, notices] = await Promise.all([
    getCohortById(cohortId),
    getNoticesByCohort(cohortId)
  ]);

  return <ChatInterface cohort={cohort} notices={notices} />;
}
```

### 6.3 Firebase 최적화

#### 6.3.1 읽기 비용 절감

**복합 인덱스 활용**:

```typescript
// ❌ Bad: 여러 번 읽기
const participants = await getParticipantsByCohort(cohortId);
const submissions = await Promise.all(
  participants.map(p => getSubmissionsByParticipant(p.id))
);
// 읽기 횟수: 1 + N (N: 참가자 수)

// ✅ Good: 한 번에 읽기
const submissions = await getSubmissionsByCode(cohortCode);
// 읽기 횟수: 1
```

**onSnapshot 구독 최적화**:

```typescript
// 포커스 있을 때만 구독
useEffect(() => {
  if (!isDocumentVisible) return;

  const unsubscribe = onSnapshot(
    query(collection(db, 'messages'), where('conversationId', '==', id)),
    (snapshot) => {
      // 실시간 업데이트
    }
  );

  return unsubscribe;
}, [isDocumentVisible, id]);
```

---

## 7. 보안 요구사항

### 7.1 인증 보안

#### 7.1.1 접근 코드 시스템

**생성 규칙**:
- 4자리 숫자 조합
- 기수별로 고유 (중복 불가)
- 서버 사이드에서만 검증

**Rate Limiting**:
```typescript
// 클라이언트 사이드 제한
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 5 * 60 * 1000; // 5분

if (failedAttempts >= MAX_ATTEMPTS) {
  const lockoutUntil = lastFailedAt + LOCKOUT_DURATION;
  if (Date.now() < lockoutUntil) {
    throw new Error('Too many attempts. Please try again later.');
  }
}
```

#### 7.1.2 세션 관리

**LocalStorage 세션**:
```typescript
interface Session {
  cohortId: string;
  accessCode: string;
  expiry: number;  // Unix timestamp (14일 후)
  createdAt: number;
}

function validateSession(session: Session): boolean {
  return Date.now() < session.expiry;
}
```

**자동 로그아웃**: 14일 후 또는 브라우저 데이터 삭제 시

### 7.2 Firebase Security Rules

자세한 규칙은 `firestore.rules` 파일 및 [보안 규칙 문서](../../setup/firebase-security-quickstart.md)를 참조하세요.

### 7.3 환경 변수 보안

**서버 전용 변수** (NEXT_PUBLIC_ 없음):
```bash
# .env.local
NAVER_CLIENT_SECRET=xxxxx        # 서버 사이드만 접근 가능
OPENAI_API_KEY=sk-xxxxx          # 서버 사이드만 접근 가능
FIREBASE_SERVICE_ACCOUNT_KEY={}  # Admin SDK 전용
```

**클라이언트 노출 변수** (NEXT_PUBLIC_ 있음):
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...  # 브라우저 접근 가능 (안전)
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...   # 브라우저 접근 가능 (안전)
```

**`.gitignore` 필수**:
```
.env*.local
firebase-service-account.json
```

### 7.4 XSS 및 인젝션 방지

**Zod 스키마 검증**:

```typescript
import { z } from 'zod';

export const readingSubmissionSchema = z.object({
  bookTitle: z.string().min(1).max(200),
  review: z.string().min(40).max(1000),
  dailyAnswer: z.string().min(20).max(300)
});

// 사용
const validated = readingSubmissionSchema.parse(formData);
```

**HTML 이스케이핑** (React 자동 처리):

```tsx
// ✅ Safe: React가 자동으로 이스케이프
<p>{userInput}</p>

// ❌ Dangerous: dangerouslySetInnerHTML 사용 금지
<div dangerouslySetInnerHTML={{ __html: userInput }} />
```

---

## 8. 확장성 및 인프라

### 8.1 서버리스 아키텍처 장점

| 요소 | 장점 | 구현 |
|------|------|------|
| **자동 확장** | 트래픽 급증 시 자동 스케일링 | Vercel Edge Functions |
| **비용 효율** | 사용한 만큼만 과금 | Firebase 무료 티어 → 유료 전환 |
| **글로벌 배포** | CDN을 통한 전 세계 배포 | Vercel Edge Network (30+ 지역) |
| **제로 유지보수** | 서버 관리 불필요 | Firebase + Vercel 자동 관리 |

### 8.2 현재 리소스 사용량

**Firebase Firestore** (무료 티어 기준):

| 리소스 | 무료 할당량 | 현재 사용량 | 사용률 |
|--------|------------|------------|--------|
| **읽기** | 50,000 / day | ~15,000 / day | 30% |
| **쓰기** | 20,000 / day | ~3,000 / day | 15% |
| **스토리지** | 1GB | ~400MB | 40% |

**Firebase Storage** (무료 티어 기준):

| 리소스 | 무료 할당량 | 현재 사용량 | 사용률 |
|--------|------------|------------|--------|
| **저장소** | 5GB | ~2GB | 40% |
| **다운로드** | 1GB / day | ~300MB / day | 30% |

**Vercel** (Pro Plan):

| 리소스 | 제한 | 현재 사용량 | 사용률 |
|--------|------|------------|--------|
| **빌드 시간** | 6,000분 / 월 | ~100분 / 월 | 1.7% |
| **대역폭** | 100GB / 월 | ~15GB / 월 | 15% |
| **엣지 함수 실행** | 1M / 월 | ~200K / 월 | 20% |

### 8.3 확장 계획

**단기 (V2.0, 2025 Q4)**:
- Firebase 유료 전환 (Blaze Plan): $25/월
- 참가자 500명까지 지원
- 푸시 알림 추가 (FCM)

**중기 (V3.0, 2026 Q2)**:
- Vercel Pro Plan → Team Plan: $20/user/월
- CDN 캐싱 최적화
- Edge Functions 고도화

**장기 (2026 Q4+)**:
- 다중 기수 동시 운영 (최대 10기수)
- 국제화 지원 (영어 버전)
- 네이티브 모바일 앱 (React Native)

---

## 9. 개발 환경

### 9.1 필수 도구

| 도구 | 버전 | 용도 | 설치 명령 |
|------|------|------|-----------|
| **Node.js** | 18.x 이상 | JavaScript 런타임 | `brew install node@18` (macOS) |
| **npm** | 9.x 이상 | 패키지 매니저 | Node.js와 함께 설치됨 |
| **Git** | 2.x 이상 | 버전 관리 | `brew install git` |
| **VS Code** | Latest | IDE (권장) | [code.visualstudio.com](https://code.visualstudio.com) |

**VS Code 확장 프로그램 (권장)**:
- ESLint
- Prettier - Code formatter
- Tailwind CSS IntelliSense
- Error Lens
- GitLens

### 9.2 환경 변수 설정

**`.env.local` 파일 생성**:

```bash
# Firebase 클라이언트 설정
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=projectpns.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=projectpns
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=projectpns.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef

# 네이버 책 검색 API (서버 전용)
NAVER_CLIENT_ID=your_client_id
NAVER_CLIENT_SECRET=your_client_secret

# OpenAI API (서버 전용)
OPENAI_API_KEY=sk-...

# Firebase Admin SDK (서버 전용)
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
```

**환경 변수 검증**:

```typescript
// lib/env.ts
import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1),
  NAVER_CLIENT_ID: z.string().min(1),
  NAVER_CLIENT_SECRET: z.string().min(1),
  OPENAI_API_KEY: z.string().startsWith('sk-')
});

export const env = envSchema.parse(process.env);
```

### 9.3 개발 서버 실행

```bash
# 의존성 설치
npm install

# 개발 서버 시작 (Turbopack)
npm run dev

# 브라우저 열기: http://localhost:3000
```

### 9.4 스크립트 목록

자세한 스크립트는 `package.json`을 참조하세요.

**주요 스크립트**:

```json
{
  "scripts": {
    // 개발
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",

    // 데이터 시딩
    "seed:cohorts": "tsx src/scripts/seed-cohorts-participants.ts",
    "seed:notices": "tsx src/scripts/seed-notices.ts",
    "seed:submissions": "tsx src/scripts/seed-submissions.ts",
    "seed:admin": "tsx src/scripts/seed-admin.ts",
    "seed:all": "npm run seed:cohorts && npm run seed:notices && npm run seed:submissions",

    // 데이터 정리
    "cleanup:dummy": "tsx src/scripts/cleanup-dummy-data.ts",
    "cleanup:dm": "tsx src/scripts/cleanup-dm-messages.ts",

    // 유틸리티
    "convert:webp": "tsx src/scripts/convert-all-to-webp.ts",
    "check:user-data": "tsx src/scripts/check-user-data.ts"
  }
}
```

---

## 10. 배포 전략

### 10.1 Vercel 배포 설정

**vercel.json**:

```json
{
  "buildCommand": "npm run build",
  "framework": "nextjs",
  "regions": ["icn1"],  // 서울 리전 (한국 사용자 최적화)
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        }
      ]
    }
  ]
}
```

**환경 변수 설정** (Vercel Dashboard):

1. Project Settings → Environment Variables
2. Production, Preview, Development 각각 설정
3. Sensitive 변수는 "Encrypted" 옵션 활성화

### 10.2 CI/CD 파이프라인

```
Git Push (GitHub)
    ↓
Vercel Webhook 트리거
    ↓
┌─────────────────────────────────┐
│ Build Phase (Vercel)            │
├─────────────────────────────────┤
│ 1. Install Dependencies         │
│    npm ci                        │
│                                  │
│ 2. TypeScript Type Check         │
│    tsc --noEmit                  │
│                                  │
│ 3. ESLint Check                  │
│    npm run lint                  │
│                                  │
│ 4. Next.js Build                 │
│    npm run build                 │
└─────────────────────────────────┘
    ↓
┌─────────────────────────────────┐
│ Deploy Phase                     │
├─────────────────────────────────┤
│ 1. Edge Functions 배포           │
│ 2. Static Assets CDN 업로드      │
│ 3. 도메인 연결                   │
└─────────────────────────────────┘
    ↓
Preview URL 생성 (PR마다)
    ↓
Production 배포 (main 브랜치)
```

**자동 배포 트리거**:
- `main` 브랜치 푸시 → Production 배포
- PR 생성/업데이트 → Preview 배포
- 수동 배포 → Vercel Dashboard

### 10.3 배포 체크리스트

**배포 전 확인사항**:

- [ ] TypeScript 컴파일 성공 (`tsc --noEmit`)
- [ ] ESLint 오류 없음 (`npm run lint`)
- [ ] 프로덕션 빌드 성공 (`npm run build`)
- [ ] 환경 변수 모두 설정됨 (Vercel Dashboard)
- [ ] Firebase Security Rules 업데이트됨
- [ ] Firebase Indexes 생성됨
- [ ] README.md 업데이트됨

**배포 후 검증**:

- [ ] 랜딩페이지 로딩 확인 (/)
- [ ] 접근 코드 로그인 테스트 (/app)
- [ ] 독서 인증 제출 테스트
- [ ] Today's Library 표시 확인
- [ ] Data Center 접근 테스트 (관리자)
- [ ] 모바일 반응형 확인 (iOS Safari, Android Chrome)
- [ ] PWA 설치 테스트

---

## 11. 모니터링 및 로깅

### 11.1 Logger 시스템

**구현** (`lib/logger.ts`):

```typescript
export const logger = {
  error: (message: string, error?: Error, context?: Record<string, any>) => {
    if (process.env.NODE_ENV === 'production') {
      // TODO: Sentry.captureException(error, { contexts: { custom: context } });
      console.error(`[ERROR] ${message}`, error, context);
    } else {
      console.error(`[ERROR] ${message}`, error, context);
    }
  },

  warn: (message: string, context?: Record<string, any>) => {
    console.warn(`[WARN] ${message}`, context);
  },

  info: (message: string, context?: Record<string, any>) => {
    console.info(`[INFO] ${message}`, context);
  },

  debug: (message: string, context?: Record<string, any>) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${message}`, context);
    }
  }
};
```

**사용 예시**:

```typescript
try {
  await createSubmission(data);
} catch (error) {
  logger.error('Failed to create submission', error as Error, {
    userId: participantId,
    bookTitle: data.bookTitle
  });
  throw error;
}
```

### 11.2 성능 모니터링

**Vercel Analytics**:

- Core Web Vitals 실시간 추적
- Real User Monitoring (RUM)
- 페이지별 성능 분석
- 지역별 성능 비교

**Firebase Console**:

- Firestore 쿼리 성능 분석
- Storage 다운로드 속도
- Authentication 성공/실패율
- Realtime Database 사용량

**Lighthouse CI** (향후 추가 예정):

```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI
on: [pull_request]
jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci && npm run build
      - run: npx lhci autorun
```

### 11.3 에러 추적 (향후 추가)

**Sentry 통합 계획** (V2.0):

```typescript
// lib/sentry.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  beforeSend(event, hint) {
    // 민감 정보 필터링
    if (event.request?.headers) {
      delete event.request.headers.Authorization;
    }
    return event;
  }
});
```

---

## 12. 테스트 전략

### 12.1 테스트 피라미드

```
        ┌───────────┐
        │  E2E (5%) │  ← Playwright (향후)
        └───────────┘
      ┌─────────────────┐
      │ Integration (15%)│  ← Jest + Firebase Emulator (향후)
      └─────────────────┘
    ┌─────────────────────┐
    │    Unit (80%)       │  ← Jest + React Testing Library (향후)
    └─────────────────────┘
```

**현재 상태**: 테스트 미구현 (수동 테스트 중심)

### 12.2 테스트 전략 (V2.0 계획)

#### 12.2.1 Unit 테스트

**대상**:
- Firebase 유틸리티 함수 (`lib/firebase/*.ts`)
- 상수 및 검증 로직 (`constants/validation.ts`)
- 헬퍼 함수 (`lib/utils.ts`)

**도구**: Jest + `@testing-library/react`

**예시**:

```typescript
// __tests__/lib/firebase/cohorts.test.ts
import { createCohort, getCohortById } from '@/lib/firebase/cohorts';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';

describe('Cohort Operations', () => {
  let testEnv: any;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'test-project'
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  it('should create a cohort', async () => {
    const cohortId = await createCohort({
      name: '1기',
      startDate: '2025-01-01',
      endDate: '2025-03-31',
      isActive: true
    });

    expect(cohortId).toBeTruthy();

    const cohort = await getCohortById(cohortId);
    expect(cohort.name).toBe('1기');
  });
});
```

#### 12.2.2 Integration 테스트

**대상**:
- React Query 훅 (`useParticipants`, `useNotices`)
- API Routes (`/api/naver-book-search`)
- Firebase 실시간 구독 (`subscribeTodayVerified`)

**도구**: Jest + Firebase Emulator Suite

#### 12.2.3 E2E 테스트

**대상**:
- 접근 코드 입장 플로우
- 독서 인증 제출 플로우
- AI 매칭 실행 플로우

**도구**: Playwright (향후)

**예시 시나리오**:

```typescript
// e2e/reading-submission.spec.ts
import { test, expect } from '@playwright/test';

test('사용자가 독서 인증을 제출할 수 있다', async ({ page }) => {
  // 1. 접근 코드로 로그인
  await page.goto('/app');
  await page.fill('input[name="accessCode"]', '1234');
  await page.click('button[type="submit"]');

  // 2. 채팅 페이지로 이동 확인
  await expect(page).toHaveURL('/app/chat');

  // 3. 독서 인증 다이얼로그 열기
  await page.click('text=독서 인증하기');

  // 4. 책 검색 (자동완성)
  await page.fill('input[placeholder="책 제목 검색"]', '클린 코드');
  await page.click('text=클린 코드 - 로버트 C. 마틴');

  // 5. 이미지 업로드
  await page.setInputFiles('input[type="file"]', 'test-image.jpg');

  // 6. 리뷰 작성
  await page.fill('textarea[name="review"]', '이 책은 정말 유익했습니다. 코드 품질의 중요성을 깨달았습니다.');

  // 7. 제출
  await page.click('text=제출하기');

  // 8. 성공 토스트 확인
  await expect(page.locator('text=제출 완료')).toBeVisible();

  // 9. Today's Library에 반영 확인
  await page.goto('/app/chat/today-library');
  await expect(page.locator('text=클린 코드')).toBeVisible();
});
```

---

## 관련 문서

- **[PRD (Product Requirements Document)](./prd-comprehensive.md)**: 제품 요구사항 및 기능 명세
- **[Database Schema](../../database/schema.md)**: Firestore 데이터베이스 스키마 상세
- **[System Architecture](./system-architecture.md)**: 시스템 아키텍처 및 라우팅
- **[API Reference](../../api/api-reference.md)**: API 엔드포인트 및 SDK 사용법
- **[Design System](../../design/design-system.md)**: 디자인 가이드 및 컴포넌트
- **[Development Setup Guide](../../development/setup-guide.md)**: 개발 환경 설정 가이드
- **[Performance Optimization](../../optimization/performance.md)**: 성능 최적화 전략
- **[Firebase Security](../../setup/firebase-security-quickstart.md)**: Firebase 보안 규칙
- **[iOS PWA Optimization](../../troubleshooting/ios-pwa-scroll.md)**: iOS PWA 최적화

---

**문서 위치**: `docs/architecture/trd-comprehensive.md`
**최종 업데이트**: 2025년 10월 16일
**문서 버전**: 3.0 - Comprehensive Edition
**다음 업데이트 예정**: V2.0 기능 추가 시 (2025년 Q4)

---

**© 2025 Philip & Sophy. All rights reserved.**
