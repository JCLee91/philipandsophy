# API Reference Documentation

**Last Updated**: 2025-11-04
**Document Version**: v2.0.0
**Category**: api

---

## 목차 (Table of Contents)

1. [개요 (Overview)](#개요-overview)
2. [인증 (Authentication)](#인증-authentication)
3. [Data Center APIs](#data-center-apis)
   - [Statistics APIs](#statistics-apis)
   - [Cohorts Management APIs](#cohorts-management-apis)
   - [Participants Management APIs](#participants-management-apis)
   - [Submissions Management APIs](#submissions-management-apis)
   - [Notices Management APIs](#notices-management-apis)
   - [Messages Management APIs](#messages-management-apis)
   - [Export APIs](#export-apis)
   - [AI Chat APIs](#ai-chat-apis)
4. [Admin APIs](#admin-apis)
   - [Matching APIs](#matching-apis)
   - [Admin Operations](#admin-operations)
   - [Notifications APIs](#notifications-apis)
5. [Public APIs](#public-apis)
   - [Book Search API](#book-search-api)
   - [Push Subscriptions API](#push-subscriptions-api)
   - [Public Notices API](#public-notices-api)
6. [Firebase Client SDK Operations](#firebase-client-sdk-operations)
7. [Error Handling](#error-handling)
8. [Rate Limiting](#rate-limiting)

---

## 개요 (Overview)

이 문서는 필립앤소피 플랫폼에서 사용하는 모든 API에 대한 완전한 레퍼런스를 제공합니다.

### API 카테고리

| 카테고리 | 위치 | 인증 요구 | 용도 |
|----------|------|-----------|------|
| **Data Center APIs** | `/api/datacntr/*` | 관리자 (requireWebAppAdmin) | 통계, 코호트/참가자/제출물/공지/메시지 관리 |
| **Admin APIs** | `/api/admin/*` | 관리자 (requireWebAppAdmin) | AI 매칭, 과거 데이터 추가, 커스텀 알림 |
| **Public APIs** | `/api/*` | 필요시 인증 | 책 검색, 푸시 구독, 공개 공지사항 |
| **Firebase Client SDK** | `src/lib/firebase/*.ts` | 클라이언트 측 | Firestore, Storage, Auth 작업 |

### 중요 개념

#### Ghost/Admin/Draft Filtering
통계 API는 다음 필터링 규칙을 따릅니다:
- **Ghost 참가자**: `isGhost: true` - 통계에서 제외
- **관리자**: `isSuperAdmin: true` 또는 `isAdministrator: true` - 통계에서 제외
- **Draft 제출물**: `status: 'draft'` - 인증 횟수 집계에서 제외

#### 날짜 형식
- 모든 날짜는 **YYYY-MM-DD** 형식 (ISO 8601)
- KST (한국 표준시) 기준
- `submissionDate` 필드는 타임존 이슈 제거를 위해 문자열로 저장

---

## 인증 (Authentication)

### 인증 방식

#### 1. Firebase ID Token (관리자)
```http
Authorization: Bearer <firebase-id-token>
```

**획득 방법**:
```typescript
import { getAuth } from 'firebase/auth';

const auth = getAuth();
const user = auth.currentUser;
const token = await user?.getIdToken();
```

#### 2. Internal Service Secret (내부 서비스)
```http
X-Internal-Secret: <internal-secret>
```

**사용처**: Cron 함수 → Next.js API 내부 호출

### 권한 검증 함수

#### `requireWebAppAdmin(request)`
관리자 권한 검증 (Data Center + Admin APIs)

**Returns**:
```typescript
{
  user: { id: string; name: string; } | null;
  error: NextResponse | null;
}
```

#### `requireWebAppAuth(request)`
일반 사용자 인증 검증 (Push Subscriptions 등)

**Returns**:
```typescript
{
  user: { id: string; } | null;
  error: NextResponse | null;
}
```

---

## Data Center APIs

### Statistics APIs

#### GET `/api/datacntr/stats/overview`
전체 통계 대시보드 데이터를 조회합니다.

**Authentication**: 🔒 Admin required

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `cohortId` | string | No | 특정 코호트로 필터링 (미제공 시 전체) |

**Response**:
```typescript
{
  averageSubmissionsPerParticipant: number;  // 참가자당 평균 인증 횟수
  totalParticipants: number;                 // 총 참가자 수 (ghost/admin 제외)
  todaySubmissions: number;                  // 오늘 인증한 참가자 수 (중복 제거)
  totalSubmissions: number;                  // 총 인증 수 (draft 제외)
  totalNotices: number;                      // 총 공지사항 수
  totalMessages: number;                     // 총 메시지 수
  pushEnabledCount: number;                  // 푸시 알림 허용 인원
  activeParticipants: number;                // 활성 참가자 (3일 이내)
  moderateParticipants: number;              // 중간 활동 참가자 (4-7일)
  dormantParticipants: number;               // 휴면 참가자 (7일 이상)
  weeklyParticipationRate: number;           // 주간 참여율 (%)
  totalSubmissionRate: number;               // 총 인증률 (%)
}
```

**Example Request**:
```bash
curl -X GET "https://api.example.com/api/datacntr/stats/overview?cohortId=1" \
  -H "Authorization: Bearer <token>"
```

**Key Features**:
- Ghost, 슈퍼관리자, 일반 관리자 제외
- Draft 상태 제출물 제외
- 오늘 인증은 참가자 기준 중복 제거
- 총 인증률: (실제 인증 수) / (참가자 수 × 경과 일수) × 100

---

#### GET `/api/datacntr/stats/submissions`
독서 인증 분석 통계를 조회합니다.

**Authentication**: 🔒 Admin required

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `cohortId` | string | No | 특정 코호트로 필터링 |

**Response**:
```typescript
{
  timeDistribution: Array<{
    timeRange: string;      // '06-09', '09-12', etc.
    count: number;          // 해당 시간대 제출 수
    percentage: number;     // 백분율
  }>;
  participation: {
    totalSubmissions: number;        // 총 제출 수 (draft 제외)
    totalActiveParticipants: number; // 인증한 참가자 수
    dailyAverage: number;            // 일일 평균 인증 수
    activeDays: number;              // 활동 일수
  };
  reviewQuality: {
    averageReviewLength: number;       // 평균 리뷰 길이 (글자 수)
    averageDailyAnswerLength: number;  // 평균 답변 길이 (글자 수)
  };
  allBooks: Array<{
    title: string;          // 책 제목
    author?: string;        // 저자
    count: number;          // 인증 횟수
    participants: string[]; // 인증한 참가자 이름 (정렬됨)
  }>;
}
```

**Example Response**:
```json
{
  "timeDistribution": [
    { "timeRange": "06-09", "count": 5, "percentage": 10 },
    { "timeRange": "09-12", "count": 15, "percentage": 30 },
    { "timeRange": "18-21", "count": 20, "percentage": 40 }
  ],
  "participation": {
    "totalSubmissions": 50,
    "totalActiveParticipants": 15,
    "dailyAverage": 3.5,
    "activeDays": 14
  },
  "reviewQuality": {
    "averageReviewLength": 120,
    "averageDailyAnswerLength": 85
  },
  "allBooks": [
    {
      "title": "해리포터와 마법사의 돌",
      "author": "J.K. 롤링",
      "count": 5,
      "participants": ["김철수", "이영희", "박민수"]
    }
  ]
}
```

**Key Features**:
- 시간대별 제출 분포 (7개 구간)
- 책 목록은 인증 횟수 내림차순 정렬
- Draft 제출물 제외
- Ghost/Admin 제외

---

#### GET `/api/datacntr/stats/activity`
날짜별 활동 지표를 조회합니다.

**Authentication**: 🔒 Admin required

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `cohortId` | string | No | 특정 코호트로 필터링 |
| `days` | number | No | 조회 기간 (기본값: 7일, cohortId 있으면 코호트 전체 기간) |

**Response**:
```typescript
Array<{
  date: string;              // 날짜 (YYYY-MM-DD)
  pushEnabled: number;       // 그날까지 푸시 허용한 참가자 수 (누적)
  submissions: number;       // 그날 인증 수
  avgReviewLength: number;   // 그날 평균 리뷰 길이
  avgAnswerLength: number;   // 그날 평균 답변 길이
}>
```

**Example Request**:
```bash
# 최근 7일
curl -X GET "https://api.example.com/api/datacntr/stats/activity" \
  -H "Authorization: Bearer <token>"

# 특정 코호트 전체 기간
curl -X GET "https://api.example.com/api/datacntr/stats/activity?cohortId=1" \
  -H "Authorization: Bearer <token>"
```

**Key Features**:
- 코호트 시작일 ~ 종료일 기간 (OT 첫날 제외)
- Draft 제출물 제외
- Ghost/Admin 제외
- 날짜순 정렬

---

### Cohorts Management APIs

#### GET `/api/datacntr/cohorts`
모든 코호트 목록을 조회합니다.

**Authentication**: 🔒 Admin required

**Response**:
```typescript
Array<{
  id: string;
  name: string;
  startDate: string;           // YYYY-MM-DD
  endDate: string;             // YYYY-MM-DD
  programStartDate: string;    // YYYY-MM-DD
  isActive: boolean;
  profileUnlockDate?: string;  // YYYY-MM-DD (프로필 공개일)
  createdAt: Timestamp;
  updatedAt: Timestamp;
}>
```

**Sorting**: `createdAt` 내림차순 (최신순)

---

#### POST `/api/datacntr/cohorts`
새 코호트를 생성합니다.

**Authentication**: 🔒 Admin required

**Request Body**:
```typescript
{
  name: string;              // 코호트 이름 (예: '1기')
  startDate: string;         // 시작일 (YYYY-MM-DD)
  endDate: string;           // 종료일 (YYYY-MM-DD)
  programStartDate: string;  // 프로그램 시작일 (YYYY-MM-DD)
  participants: Array<{
    name: string;            // 참가자 이름
    phone: string;           // 전화번호
    role: 'participant' | 'admin' | 'ghost';
  }>;
  questionsOption?: 'copy' | 'manual'; // 'copy': 1기 질문 복사
}
```

**Response**:
```json
{
  "success": true,
  "cohortId": "abc123",
  "participantIds": ["p1", "p2", "p3"],
  "message": "1기 생성 완료"
}
```

**Key Features**:
- 참가자 일괄 생성
- Daily Questions 복사 지원 (1기 기준)
- 날짜 자동 재계산

---

#### GET `/api/datacntr/cohorts/list`
코호트 목록 조회 (커스텀 알림용 간소화 버전)

**Authentication**: 🔒 Admin required

**Response**:
```json
{
  "cohorts": [
    { "id": "1", "name": "1기", "isActive": true },
    { "id": "2", "name": "2기", "isActive": false }
  ]
}
```

---

#### GET `/api/datacntr/cohorts/[cohortId]`
특정 코호트 상세 정보를 조회합니다.

**Authentication**: 🔒 Admin required

**Response**:
```typescript
{
  cohort: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    programStartDate: string;
    isActive: boolean;
    profileUnlockDate?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
  };
  participants: Array<{
    id: string;
    name: string;
    phoneNumber: string;
    cohortId: string;
    cohortName: string;
    submissionCount: number;  // 인증 횟수 (draft 제외)
    // ... other participant fields
  }>;
}
```

**Key Features**:
- Ghost/Admin/슈퍼어드민 제외
- 각 참가자의 인증 횟수 포함
- Draft 제출물 제외

---

#### PATCH `/api/datacntr/cohorts/[cohortId]`
코호트 설정을 업데이트합니다.

**Authentication**: 🔒 Admin required

**Request Body**:
```typescript
{
  profileUnlockDate: string | null;  // YYYY-MM-DD or null
}
```

**Response**:
```json
{
  "success": true,
  "profileUnlockDate": "2025-11-15"
}
```

**Validation**: YYYY-MM-DD 형식 검증

---

#### POST `/api/datacntr/cohorts/[cohortId]/toggle-active`
코호트 활성화 상태를 토글합니다.

**Authentication**: 🔒 Admin required

**Request Body**:
```typescript
{
  isActive: boolean;
}
```

**Response**:
```json
{
  "success": true,
  "cohortId": "1",
  "isActive": true,
  "message": "해당 기수가 활성화되었습니다. 다른 기수는 자동으로 비활성화되었습니다."
}
```

**Key Features**:
- Transaction 사용 (하나만 활성화 보장)
- 활성화 시 다른 모든 코호트 자동 비활성화

---

#### GET `/api/datacntr/cohorts/[cohortId]/daily-questions`
코호트의 Daily Questions를 조회합니다.

**Authentication**: 🔒 Admin required

**Response**:
```typescript
Array<{
  id: string;
  dayNumber: number;
  date: string;          // YYYY-MM-DD
  category: string;
  question: string;
  order: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}>
```

**Sorting**: `dayNumber` 오름차순

---

#### POST `/api/datacntr/cohorts/[cohortId]/daily-questions`
Daily Questions를 일괄 저장합니다.

**Authentication**: 🔒 Admin required

**Request Body**:
```typescript
{
  questions: Array<{
    dayNumber: number;       // 1-14
    date: string;            // YYYY-MM-DD
    category: string;
    question: string;
  }>;  // 정확히 14개 필요
}
```

**Response**:
```json
{
  "success": true,
  "message": "Daily Questions가 저장되었습니다"
}
```

**Validation**: 정확히 14개 질문 필요

---

### Participants Management APIs

#### GET `/api/datacntr/participants`
참가자 목록을 조회합니다.

**Authentication**: 🔒 Admin required

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `cohortId` | string | No | 특정 코호트로 필터링 |

**Response**:
```typescript
Array<{
  id: string;
  name: string;
  phoneNumber: string;
  cohortId: string;
  cohortName: string;              // 코호트 이름
  submissionCount: number;         // 인증 횟수 (draft 제외)
  engagementScore: number;         // 인게이지먼트 점수
  engagementLevel: 'high' | 'medium' | 'low';
  hasPushToken: boolean;           // 실제 푸시 토큰 존재 여부
  activityStatus: 'active' | 'moderate' | 'dormant';
  lastActivityAt?: Timestamp;
  gender?: 'male' | 'female' | 'other';
  profileImage?: string;
  currentBookTitle?: string;
  // ... other sanitized fields
}>
```

**Key Features**:
- Ghost/Admin/슈퍼어드민 제외
- 인게이지먼트 점수 자동 계산
- N+1 쿼리 최적화 (Batch read)
- `createdAt` 오름차순 정렬

**Engagement Levels**:
- `high`: 80점 이상
- `medium`: 50-79점
- `low`: 50점 미만

**Activity Status**:
- `active`: 3일 이내 활동
- `moderate`: 4-7일 이내 활동
- `dormant`: 7일 이상 비활동

---

#### GET `/api/datacntr/participants/list`
참가자 목록 조회 (간소화 버전)

**Authentication**: 🔒 Admin required

**Response**: (구현 필요 시 확인)

---

#### GET `/api/datacntr/participants/unverified`
미인증 참가자 목록 조회

**Authentication**: 🔒 Admin required

**Response**: (구현 필요 시 확인)

---

### Submissions Management APIs

#### GET `/api/datacntr/submissions`
독서 인증 제출물 목록을 조회합니다.

**Authentication**: 🔒 Admin required

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `cohortId` | string | No | 특정 코호트로 필터링 |

**Response**:
```typescript
Array<{
  id: string;
  participantId: string;
  participantName: string;         // 참가자 이름
  cohortName: string;              // 코호트 이름
  bookTitle: string;
  bookAuthor?: string;
  bookImageUrl: string;            // 인증 사진 URL
  review: string;
  dailyQuestion: string;
  dailyAnswer: string;
  submissionDate: string;          // YYYY-MM-DD
  submittedAt: Timestamp;
  status: 'approved' | 'draft';
  // ... other fields
}>
```

**Key Features**:
- Draft 제출물 제외
- Ghost/Admin/슈퍼어드민 제외
- `submittedAt` 내림차순 정렬 (최신순)
- N+1 쿼리 최적화

---

### Notices Management APIs

#### GET `/api/datacntr/notices`
공지사항 목록을 조회합니다.

**Authentication**: 🔒 Admin required

**Response**:
```typescript
Array<{
  id: string;
  cohortId: string;
  cohortName: string;              // 코호트 이름
  author: string;
  content: string;
  imageUrl?: string;
  isPinned: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}>
```

**Sorting**: `createdAt` 내림차순 (최신순)

---

#### POST `/api/datacntr/notices/create`
새 공지사항을 생성합니다.

**Authentication**: 🔒 Admin required

**Request Body**: (구현 확인 필요)

---

#### GET `/api/datacntr/notices/[noticeId]`
특정 공지사항을 조회합니다.

**Authentication**: 🔒 Admin required

---

#### PATCH `/api/datacntr/notices/[noticeId]`
공지사항을 업데이트합니다.

**Authentication**: 🔒 Admin required

---

#### DELETE `/api/datacntr/notices/[noticeId]`
공지사항을 삭제합니다.

**Authentication**: 🔒 Admin required

---

#### GET `/api/datacntr/notice-templates`
공지사항 템플릿 목록을 조회합니다.

**Authentication**: 🔒 Admin required

---

#### POST `/api/datacntr/notices/from-templates`
템플릿에서 공지사항을 생성합니다.

**Authentication**: 🔒 Admin required

---

#### POST `/api/datacntr/notices/[noticeId]/to-template`
공지사항을 템플릿으로 저장합니다.

**Authentication**: 🔒 Admin required

---

#### GET `/api/datacntr/notice-templates/[templateId]`
특정 템플릿을 조회합니다.

**Authentication**: 🔒 Admin required

---

#### DELETE `/api/datacntr/notice-templates/[templateId]`
템플릿을 삭제합니다.

**Authentication**: 🔒 Admin required

---

### Messages Management APIs

#### GET `/api/datacntr/messages`
메시지 목록을 조회합니다.

**Authentication**: 🔒 Admin required

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `cohortId` | string | No | 특정 코호트로 필터링 |

**Response**:
```typescript
Array<{
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;              // 발신자 이름
  receiverId: string;
  receiverName: string;            // 수신자 이름
  content: string;
  imageUrl?: string;
  isRead: boolean;
  createdAt: Timestamp;
}>
```

**Key Features**:
- `cohortId` 필터링 시 참가자 기준 IN 쿼리
- 중복 제거 (senderId/receiverId 양방향)
- `createdAt` 내림차순 정렬 (최신순)
- 최대 200개 제한

---

### Export APIs

#### GET `/api/datacntr/export-books`
독서 인증에서 제출된 모든 책 목록을 추출합니다.

**Authentication**: 🔒 Admin required

**Response**:
```json
{
  "success": true,
  "totalSubmissions": 150,         // 유효 제출 수 (draft 제외)
  "uniqueBooks": 45,               // 고유 책 수
  "books": [
    {
      "title": "해리포터와 마법사의 돌",
      "author": "J.K. 롤링",
      "count": 5                   // 인증 횟수
    }
  ]
}
```

**Key Features**:
- Ghost/Admin/슈퍼어드민 제외
- Draft 제출물 제외
- 인증 횟수 내림차순 정렬
- 저자별 중복 제거 (제목 + 저자 조합)

---

### AI Chat APIs

#### POST `/api/datacntr/ai-chat`
AI 채팅을 실행합니다.

**Authentication**: 🔒 Admin required

**Request Body**: (구현 확인 필요)

---

#### POST `/api/datacntr/ai-chat/refresh`
AI 채팅을 새로고침합니다.

**Authentication**: 🔒 Admin required

**Request Body**: (구현 확인 필요)

---

## Admin APIs

### Matching APIs

#### POST `/api/admin/matching`
AI 매칭을 실행합니다 (Cloud Run 함수로 위임).

**Authentication**: 🔒 Admin required

**Request Body**:
```typescript
{
  cohortId: string;
}
```

**Response**:
```json
{
  "success": true,
  "date": "2025-11-04",
  "question": "오늘 책에서 가장 인상 깊었던 구절은?",
  "totalParticipants": 15,
  "matching": {
    "assignments": {
      "participant1": {
        "similar": ["participant2", "participant3"],
        "opposite": ["participant4"],
        "reasons": {
          "similar": "같은 장르를 선호합니다",
          "opposite": "독서 스타일이 상반됩니다"
        }
      }
    }
  }
}
```

**Key Features**:
- Cloud Run 함수 호출 (환경변수: `MANUAL_MATCHING_URL`)
- 원본 ID 토큰 그대로 전달
- 프리뷰 모드 (Firestore 저장 안 함)

---

#### GET `/api/admin/matching`
특정 날짜의 매칭 결과를 조회합니다.

**Authentication**: 🔒 Admin required

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `cohortId` | string | Yes | 코호트 ID |
| `date` | string | No | 날짜 (YYYY-MM-DD, 기본값: 오늘) |

**Response**:
```json
{
  "success": true,
  "date": "2025-11-04",
  "question": "오늘 책에서 가장 인상 깊었던 구절은?",
  "matching": {
    "assignments": { /* ... */ }
  }
}
```

**Error Response** (404):
```json
{
  "error": "해당 날짜의 매칭 결과가 없습니다.",
  "availableDates": ["2025-11-01", "2025-11-02"],
  "requestedDate": "2025-11-04"
}
```

---

#### POST `/api/admin/matching/preview`
AI 매칭을 실행합니다 (프리뷰 모드 - Firestore 저장 안 함).

**Authentication**: 🔒 Admin required OR Internal Secret

**Request Body**:
```typescript
{
  cohortId: string;
}
```

**Response**:
```json
{
  "success": true,
  "preview": true,
  "date": "2025-11-04",
  "submissionDate": "2025-11-03",
  "question": "오늘 책에서 가장 인상 깊었던 구절은?",
  "totalParticipants": 15,
  "matching": {
    "assignments": { /* ... */ }
  },
  "validation": {
    "isValid": true,
    "errors": []
  },
  "submissionStats": {
    "submitted": 15,
    "notSubmitted": 5,
    "notSubmittedList": [
      { "id": "p1", "name": "김철수" }
    ]
  },
  "debug": {
    "provider": "openai",
    "model": "gpt-4o-mini",
    "participantCount": 15,
    "timestamp": "2025-11-04T10:00:00Z"
  }
}
```

**Key Features**:
- 새벽 2시 마감 정책 적용
- Draft 제출물 제외
- Ghost/Admin/슈퍼어드민 제외
- 최소 4명 필요 (MATCHING_CONFIG.MIN_PARTICIPANTS)
- Batch read로 N+1 쿼리 최적화

---

#### POST `/api/admin/matching/confirm`
AI 매칭 결과를 최종 확인하고 Firestore에 저장합니다.

**Authentication**: 🔒 Admin required OR Internal Secret

**Request Body**:
```typescript
{
  cohortId: string;
  matching: {
    assignments: Record<string, {
      similar: string[];
      opposite: string[];
      reasons?: {
        similar?: string;
        opposite?: string;
      };
    }>;
  };
  date?: string;  // YYYY-MM-DD (기본값: 오늘)
}
```

**Response**:
```json
{
  "success": true,
  "confirmed": true,
  "date": "2025-11-04",
  "message": "매칭 결과가 성공적으로 저장되었습니다."
}
```

**Error Responses**:
- **409 Conflict**: 이미 해당 날짜의 매칭이 존재
- **400 Bad Request**: 데이터 형식 오류 (Zod 검증)
- **404 Not Found**: Cohort 없음

**Key Features**:
- Transaction 사용 (race condition 방지)
- Zod 스키마 검증
- 중복 저장 방지

---

#### GET `/api/admin/matching/status`
특정 날짜의 제출 현황을 조회합니다.

**Authentication**: 🔒 Admin required

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `cohortId` | string | Yes | 코호트 ID |
| `date` | string | No | 날짜 (YYYY-MM-DD, 기본값: 오늘) |

**Response**:
```json
{
  "success": true,
  "date": "2025-11-04",
  "question": "오늘 책에서 가장 인상 깊었던 구절은?",
  "submissionCount": 15,
  "totalSubmissions": 15
}
```

**Key Features**:
- 코호트 필터링 (다중 코호트 혼입 방지)
- Batch 처리로 N+1 쿼리 최적화

---

### Admin Operations

#### POST `/api/admin/add-backdated-submission`
과거 날짜 독서 인증을 추가합니다 (관리자 전용).

**Authentication**: 🔒 Admin required

**Request Body**: (구현 확인 필요)

---

### Notifications APIs

#### POST `/api/admin/notifications/custom`
커스텀 푸시 알림을 전송합니다.

**Authentication**: 🔒 Admin required

**Request Body**: (구현 확인 필요)

---

## Public APIs

### Book Search API

#### GET `/api/search-books`
네이버 책 검색 API 프록시입니다.

**Authentication**: ✅ No auth required (public)

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | 검색어 |
| `display` | number | No | 검색 결과 개수 (기본값: 10, 최대: 100) |
| `start` | number | No | 검색 시작 위치 (기본값: 1, 최대: 1000) |
| `sort` | string | No | 정렬 ('sim': 유사도순, 'date': 출간일순) |

**Response**:
```typescript
{
  lastBuildDate: string;
  total: number;
  start: number;
  display: number;
  items: Array<{
    title: string;          // HTML 태그 제거됨
    author: string;         // HTML 태그 제거됨
    publisher: string;
    description: string;    // HTML 태그 제거됨
    isbn: string;
    image: string;          // 표지 이미지 URL
    link: string;           // 네이버 책 상세 페이지
    pubdate: string;        // YYYYMMDD
    discount: string;       // 정가
  }>;
}
```

**Error Responses**:
- **400 Bad Request**: 입력 검증 실패
- **429 Too Many Requests**: Rate limit 초과
- **500 Internal Server Error**: 환경변수 미설정

**Example Request**:
```bash
curl "https://api.example.com/api/search-books?query=해리포터&display=10&sort=sim"
```

**Key Features**:
- HTML 태그 자동 제거
- 캐싱 지원 (API_CACHE_DURATION.NAVER_BOOK_SEARCH)
- 환경변수: `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`

---

### Push Subscriptions API

#### POST `/api/push-subscriptions`
Web Push 구독을 저장합니다.

**Authentication**: 🔒 Auth required (본인만)

**Request Body**:
```typescript
{
  participantId: string;
  subscription: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  };
  deviceId: string;
  type?: string;
}
```

**Response**:
```json
{
  "success": true,
  "message": "Web Push subscription saved",
  "subscription": {
    "endpoint": "https://...",
    "keys": { /* ... */ },
    "deviceId": "abc123",
    "userAgent": "Mozilla/5.0...",
    "createdAt": { /* Timestamp */ },
    "lastUsedAt": { /* Timestamp */ }
  }
}
```

**Key Features**:
- 단일 디바이스 전략 (기존 구독 전부 삭제)
- FCM 토큰도 함께 삭제 (iOS Web Push만 저장)
- `pushNotificationEnabled: true` 자동 설정

---

#### DELETE `/api/push-subscriptions`
Web Push 구독을 제거합니다.

**Authentication**: 🔒 Auth required (본인만)

**Request Body**:
```typescript
{
  participantId: string;
  deviceId: string;
  subscriptionEndpoint?: string;
}
```

**Response**:
```json
{
  "success": true,
  "message": "Web Push subscription removed"
}
```

**Key Features**:
- 모든 토큰/구독 완전 삭제
- `pushNotificationEnabled: false` 자동 설정

---

### Public Notices API

#### GET `/api/notices/[noticeId]`
공개 공지사항을 조회합니다.

**Authentication**: ✅ No auth required (public)

**Response**: (구현 확인 필요)

---

### Debug APIs

#### GET `/api/debug/env`
환경변수를 확인합니다 (개발 전용).

**Authentication**: ✅ No auth required

**Response**: (구현 확인 필요)

---

## Firebase Client SDK Operations

Firebase Client SDK는 별도 문서로 유지됩니다. 주요 모듈:

- **Cohorts API** (`src/lib/firebase/cohorts.ts`)
- **Participants API** (`src/lib/firebase/participants.ts`)
- **Submissions API** (`src/lib/firebase/submissions.ts`)
- **Notices API** (`src/lib/firebase/notices.ts`)
- **Messages API** (`src/lib/firebase/messages.ts`)
- **Storage API** (`src/lib/firebase/storage.ts`)
- **Auth API** (`src/lib/firebase/auth.ts`)

자세한 내용은 기존 섹션 참조.

---

## Error Handling

### 표준 HTTP 상태 코드

| Code | Status | Description |
|------|--------|-------------|
| 200 | OK | 성공 |
| 400 | Bad Request | 입력 검증 실패 |
| 401 | Unauthorized | 인증 실패 |
| 403 | Forbidden | 권한 없음 |
| 404 | Not Found | 리소스 없음 |
| 409 | Conflict | 리소스 충돌 (중복 등) |
| 429 | Too Many Requests | Rate Limit 초과 |
| 500 | Internal Server Error | 서버 에러 |

### 공통 에러 응답 형식

```json
{
  "error": "오류 메시지",
  "details": "상세 설명 (선택)",
  "message": "추가 정보 (선택)"
}
```

### Firebase 에러 코드

```typescript
// 주요 Firestore 에러
'permission-denied'       // Security Rules 위반
'not-found'              // 문서 없음
'already-exists'         // 문서 이미 존재
'unavailable'            // 네트워크 오류
'resource-exhausted'     // 할당량 초과

// Phone Auth 에러
'auth/invalid-phone-number'
'auth/too-many-requests'
'auth/invalid-verification-code'
'auth/code-expired'
'auth/quota-exceeded'
```

### 에러 처리 예시

```typescript
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // API 로직
    const data = await fetchData();
    return NextResponse.json(data);
  } catch (error) {
    logger.error('API 실행 실패', error);

    return NextResponse.json(
      { error: '데이터 조회 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
```

---

## Rate Limiting

### Naver API

- **일일 한도**: 25,000 요청/일
- **초당 한도**: 10 요청/초

**대응 전략**:
- Next.js 캐싱 (revalidate: 3600초)
- Cache-Control 헤더 (s-maxage, stale-while-revalidate)

### Firebase Firestore (무료 플랜)

- **읽기**: 50,000 reads/day
- **쓰기**: 20,000 writes/day
- **문서 크기**: 최대 1MB/문서

**최적화 전략**:
- React Query staleTime (60초)
- Batch write 사용
- N+1 쿼리 최적화 (IN 쿼리, 최대 10개씩)

### OpenAI API

- **GPT-4o-mini**: 분당 요청 제한
- **토큰 한도**: 분당 토큰 제한

**대응 전략**:
- 비동기 백그라운드 처리
- 결과 캐싱 (Firestore 저장)

---

## 요약 (Summary)

### 📊 API 통계
- **Data Center APIs**: 30+ endpoints (통계, 코호트, 참가자, 제출물, 공지, 메시지)
- **Admin APIs**: 8+ endpoints (매칭, 과거 데이터, 알림)
- **Public APIs**: 4+ endpoints (책 검색, 푸시 구독, 공개 공지)

### 🔐 보안 특징
- Firebase ID Token 기반 인증
- 관리자 전용 API (requireWebAppAdmin)
- 내부 서비스 시크릿 (X-Internal-Secret)
- Ghost/Admin/Draft 필터링

### ⚡ 성능 최적화
- N+1 쿼리 최적화 (Batch read, IN 쿼리)
- React Query 캐싱
- Next.js API 캐싱
- Firestore Transaction (race condition 방지)

---

*이 문서는 필립앤소피 프로젝트의 모든 API에 대한 단일 권위 문서입니다.*

**관련 문서**:
- [System Architecture](../architecture/system-architecture.md)
- [Development Setup & Workflow Guide](../development/setup-guide.md)
- [Database Optimization](../optimization/database.md)
