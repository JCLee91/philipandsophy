# Firestore 데이터베이스 스키마

**최종 업데이트**: 2025년 10월 16일
**문서 버전**: v1.0
**프로젝트**: projectpns (필립앤소피 독서 소셜클럽)

---

## 📋 목차

1. [개요](#개요)
2. [컬렉션 목록](#컬렉션-목록)
3. [상세 스키마](#상세-스키마)
4. [관계도 (ERD)](#관계도-erd)
5. [인덱스 전략](#인덱스-전략)
6. [보안 규칙](#보안-규칙)
7. [데이터 타입 가이드](#데이터-타입-가이드)

---

## 개요

필립앤소피 플랫폼은 Firebase Firestore를 NoSQL 데이터베이스로 사용합니다. 총 **6개의 메인 컬렉션**으로 구성되어 있으며, 서버리스 아키텍처의 장점을 활용하여 확장 가능하고 유지보수가 용이한 구조를 갖추고 있습니다.

### 주요 특징

- **NoSQL 문서 지향 구조**: 유연한 스키마 설계
- **실시간 동기화**: `onSnapshot` API를 통한 실시간 데이터 변경 감지
- **트랜잭션 지원**: 원자적 읽기-수정-쓰기 작업 보장
- **서브컬렉션 미사용**: 플랫 구조로 쿼리 최적화 및 단순화
- **Timestamp 타입**: 서버 시간 기준으로 일관성 확보
- **커스텀 인덱싱**: 복합 쿼리 최적화

---

## 컬렉션 목록

| 컬렉션 이름 | 문서 ID 형식 | 주요 용도 | 문서 수 예상 |
|------------|------------|---------|------------|
| `cohorts` | 자동 생성 ID | 기수 정보 및 AI 매칭 결과 저장 | ~10개 (기수별) |
| `participants` | 자동 생성 ID | 참가자 프로필 및 회원 정보 | ~100명 (기수당 20명 × 5기수) |
| `reading_submissions` | 자동 생성 ID | 독서 인증 제출 데이터 | ~3,000개 (일 30개 × 100일) |
| `notices` | 자동 생성 ID | 관리자 공지사항 | ~50개 |
| `messages` | 자동 생성 ID | 참가자 간 DM (Direct Message) | ~5,000개 (활성 기간 누적) |
| `matching_jobs` | UUID | AI 매칭 비동기 작업 큐 | ~100개 (일별 작업 × 100일) |

---

## 상세 스키마

### 1. `cohorts` (기수 정보)

독서 소셜클럽의 기수 정보와 AI 매칭 결과를 저장합니다.

#### 필드 상세

| 필드명 | 타입 | 필수 | 설명 | 예시 값 |
|-------|------|------|------|--------|
| `id` | `string` | ✅ | 문서 ID (Firestore 자동 생성) | `cohort1` |
| `name` | `string` | ✅ | 기수 이름 | `"1기"` |
| `startDate` | `string` (ISO 8601) | ✅ | 시작 날짜 | `"2025-01-01"` |
| `endDate` | `string` (ISO 8601) | ✅ | 종료 날짜 | `"2025-03-31"` |
| `isActive` | `boolean` | ✅ | 현재 활성 기수 여부 | `true` |
| `dailyFeaturedParticipants` | `Record<string, DailyMatchingEntry>` | ❌ | 날짜별 AI 추천 참가자 매칭 결과 | 아래 참조 |
| `createdAt` | `Timestamp` | ✅ | 생성 일시 | `Timestamp(2025-01-01)` |
| `updatedAt` | `Timestamp` | ✅ | 수정 일시 | `Timestamp(2025-01-02)` |

#### `dailyFeaturedParticipants` 구조

```typescript
// 날짜를 키로 하는 객체 (예: "2025-01-15")
dailyFeaturedParticipants: {
  "2025-01-15": {
    assignments: {
      "participant-id-1": {
        similar: ["participant-id-2", "participant-id-3"],
        opposite: ["participant-id-4", "participant-id-5"],
        reasons: {
          similar: "성향이 비슷한 이유 설명",
          opposite: "성향이 다른 이유 설명",
          summary: "전체 요약"
        }
      },
      // ... 다른 참가자들
    },
    // Legacy v1.0 호환 필드 (읽기 전용, 신규 저장 시 사용 안 함)
    similar?: string[],
    opposite?: string[],
    reasons?: DailyMatchingReasons
  }
}
```

#### 코드 예시

```typescript
// Cohort 생성
import { createCohort } from '@/lib/firebase';

const cohortId = await createCohort({
  name: '2기',
  startDate: '2025-04-01',
  endDate: '2025-06-30',
  isActive: false,
});
```

#### 인덱스 요구사항

```
Single Field Indexes:
- isActive (ASC)
- createdAt (DESC)
```

---

### 2. `participants` (참가자 정보)

독서 소셜클럽 참가자의 프로필 및 회원 정보를 저장합니다.

#### 필드 상세

| 필드명 | 타입 | 필수 | 설명 | 예시 값 |
|-------|------|------|------|--------|
| `id` | `string` | ✅ | 문서 ID (Firestore 자동 생성) | `participant123` |
| `cohortId` | `string` | ✅ | 소속 기수 ID (FK: cohorts) | `cohort1` |
| `name` | `string` | ✅ | 참가자 이름 | `"홍길동"` |
| `phoneNumber` | `string` | ✅ | 전화번호 (하이픈 제거) | `"01012345678"` |
| `gender` | `'male' \| 'female' \| 'other'` | ❌ | 성별 | `"female"` |
| `profileImage` | `string` (URL) | ❌ | 프로필 이미지 (큰 이미지, 프로필 상세용) | Firebase Storage URL |
| `profileImageCircle` | `string` (URL) | ❌ | 원형 프로필 이미지 (작은 아바타용) | Firebase Storage URL |
| `profileBookUrl` | `string` (URL) | ❌ | 프로필북 외부 링크 | `"https://example.com/book"` |
| `isAdministrator` | `boolean` | ❌ | 관리자 권한 여부 | `false` |
| `occupation` | `string` | ❌ | 직업/하는 일 | `"소프트웨어 개발자"` |
| `bio` | `string` | ❌ | 한 줄 소개 (최대 2줄) | `"책과 코드를 사랑합니다"` |
| `currentBookTitle` | `string` | ❌ | 현재 읽고 있는 책 제목 | `"클린 코드"` |
| `currentBookAuthor` | `string` | ❌ | 현재 읽고 있는 책 저자 | `"로버트 C. 마틴"` |
| `currentBookCoverUrl` | `string` (URL) | ❌ | 현재 읽고 있는 책 표지 URL | Naver API URL |
| `bookHistory` | `BookHistoryEntry[]` | ❌ | 책 읽기 이력 (관리자용) | 아래 참조 |
| `firebaseUid` | `string` | ❌ | Firebase Auth UID (Phone Auth 연동용) | `"firebase-uid-abc123"` |
| `pushToken` | `string` | ❌ | 푸시 알림 토큰 (FCM) | `"fcm-token-xyz"` |
| `lastActivityAt` | `Timestamp` | ❌ | 마지막 활동 시간 (데이터센터용) | `Timestamp(2025-10-15)` |
| `createdAt` | `Timestamp` | ✅ | 생성 일시 | `Timestamp(2025-01-01)` |
| `updatedAt` | `Timestamp` | ✅ | 수정 일시 | `Timestamp(2025-10-15)` |

#### `bookHistory` 구조

```typescript
interface BookHistoryEntry {
  title: string;           // 책 제목
  startedAt: Timestamp;    // 읽기 시작 일시
  endedAt: Timestamp | null; // 읽기 종료 일시 (null: 현재 읽는 중)
}

// 예시
bookHistory: [
  {
    title: "해리 포터와 마법사의 돌",
    startedAt: Timestamp(2025-01-01),
    endedAt: Timestamp(2025-01-20)
  },
  {
    title: "클린 코드",
    startedAt: Timestamp(2025-01-21),
    endedAt: null // 현재 읽는 중
  }
]
```

#### 코드 예시

```typescript
// Participant 생성
import { createParticipant } from '@/lib/firebase';

const participantId = await createParticipant({
  cohortId: 'cohort1',
  name: '홍길동',
  phoneNumber: '01012345678',
  gender: 'male',
  occupation: '소프트웨어 개발자',
});

// Participant 조회 (전화번호로)
import { getParticipantByPhoneNumber } from '@/lib/firebase';

const participant = await getParticipantByPhoneNumber('010-1234-5678');

// Participant 책 정보 업데이트 (책 변경 감지 + 이력 관리)
import { updateParticipantBookInfo } from '@/lib/firebase';

await updateParticipantBookInfo(
  'participant123',
  '클린 코드',
  '로버트 C. 마틴',
  'https://cover-url.com/clean-code.jpg'
);
```

#### 인덱스 요구사항

```
Composite Indexes:
- cohortId (ASC) + createdAt (ASC)
- phoneNumber (ASC) [UNIQUE 제약 없음, 앱 레벨 검증]
- firebaseUid (ASC)
```

---

### 3. `reading_submissions` (독서 인증 자료)

참가자들이 제출한 독서 인증 데이터를 저장합니다.

#### 필드 상세

| 필드명 | 타입 | 필수 | 설명 | 예시 값 |
|-------|------|------|------|--------|
| `id` | `string` | ✅ | 문서 ID (Firestore 자동 생성) | `submission456` |
| `participantId` | `string` | ✅ | 제출자 ID (FK: participants) | `participant123` |
| `participationCode` | `string` | ✅ | 참여 코드 (기수별 고유 코드) | `"COHORT1"` |
| `bookTitle` | `string` | ✅ | 책 제목 | `"클린 코드"` |
| `bookAuthor` | `string` | ❌ | 책 저자 | `"로버트 C. 마틴"` |
| `bookCoverUrl` | `string` (URL) | ❌ | 책 표지 이미지 URL (네이버 API) | Naver API URL |
| `bookDescription` | `string` | ❌ | 책 소개글 (네이버 API) | `"코드 품질 개선 가이드"` |
| `bookImageUrl` | `string` (URL) | ✅ | 독서 인증 사진 (사용자 촬영) | Firebase Storage URL |
| `review` | `string` | ✅ | 간단 감상평 (최소 40자) | `"이 책을 읽고..."` |
| `dailyQuestion` | `string` | ✅ | 오늘의 질문 | `"오늘 읽은 내용 중 가장 인상 깊었던 부분은?"` |
| `dailyAnswer` | `string` | ✅ | 오늘의 질문 답변 | `"리팩토링 원칙이 인상 깊었습니다"` |
| `submittedAt` | `Timestamp` | ✅ | 제출 일시 | `Timestamp(2025-10-15 09:30:00)` |
| `submissionDate` | `string` (YYYY-MM-DD) | ✅ | 제출 날짜 (날짜 비교용) | `"2025-10-15"` |
| `status` | `'pending' \| 'approved' \| 'rejected'` | ✅ | ⚠️ **DEPRECATED**: 승인 상태 (자동 승인으로 변경) | `"approved"` |
| `reviewNote` | `string` | ❌ | ⚠️ **DEPRECATED**: 검토 메모 (승인 프로세스 제거) | `""` |
| `createdAt` | `Timestamp` | ✅ | 생성 일시 | `Timestamp(2025-10-15 09:30:00)` |
| `updatedAt` | `Timestamp` | ✅ | 수정 일시 | `Timestamp(2025-10-15 09:30:00)` |
| `metadata` | `Record<string, any>` | ❌ | 추가 메타데이터 (확장 가능) | `{ source: 'mobile' }` |

#### ⚠️ Deprecated 필드 안내

- **`status`**: 모든 제출은 자동으로 `'approved'` 상태로 저장됩니다. 승인 프로세스는 제거되었으며, DB 호환성을 위해 필드만 유지됩니다.
- **`reviewNote`**: 승인 프로세스 제거로 더 이상 사용되지 않습니다. 신규 제출 시 비워두거나 생략 가능합니다.

#### 코드 예시

```typescript
// Reading Submission 생성
import { createSubmission } from '@/lib/firebase';

const submissionId = await createSubmission({
  participantId: 'participant123',
  participationCode: 'COHORT1',
  bookTitle: '클린 코드',
  bookAuthor: '로버트 C. 마틴',
  bookCoverUrl: 'https://naver-book-api.com/cover.jpg',
  bookDescription: '코드 품질 개선 가이드',
  bookImageUrl: 'https://storage.firebase.com/reading-image.webp',
  review: '이 책을 읽고 리팩토링의 중요성을 깨달았습니다.',
  dailyQuestion: '오늘 읽은 내용 중 가장 인상 깊었던 부분은?',
  dailyAnswer: '함수는 한 가지 일만 해야 한다는 원칙이 인상 깊었습니다.',
  status: 'approved', // 자동 승인
  submittedAt: Timestamp.now(),
});

// 참가자별 Submission 조회
import { getSubmissionsByParticipant } from '@/lib/firebase';

const submissions = await getSubmissionsByParticipant('participant123');

// 오늘 인증한 참가자 실시간 구독
import { subscribeTodayVerified } from '@/lib/firebase';

const unsubscribe = subscribeTodayVerified('cohort1', (verifiedIds) => {
  console.log('오늘 인증 완료:', verifiedIds);
});
```

#### 인덱스 요구사항

```
Composite Indexes:
- participantId (ASC) + submittedAt (DESC)
- participationCode (ASC) + submissionDate (DESC)
- submissionDate (ASC) + participantId (ASC)
```

#### 유효성 검증 규칙

```typescript
// src/constants/validation.ts
export const READING_SUBMISSION_RULES = {
  REVIEW_MIN_LENGTH: 40,      // 감상평 최소 40자
  REVIEW_MAX_LENGTH: 500,     // 감상평 최대 500자
  ANSWER_MIN_LENGTH: 20,      // 답변 최소 20자
  ANSWER_MAX_LENGTH: 300,     // 답변 최대 300자
  IMAGE_MAX_SIZE: 5 * 1024 * 1024, // 이미지 최대 5MB
} as const;
```

---

### 4. `notices` (공지사항)

관리자가 작성한 공지사항을 저장합니다.

#### 필드 상세

| 필드명 | 타입 | 필수 | 설명 | 예시 값 |
|-------|------|------|------|--------|
| `id` | `string` | ✅ | 문서 ID (Firestore 자동 생성) | `notice789` |
| `cohortId` | `string` | ✅ | 대상 기수 ID (FK: cohorts) | `cohort1` |
| `author` | `string` | ✅ | 작성자 이름 | `"운영자"` |
| `content` | `string` | ✅ | 공지 내용 | `"1기 종료 안내"` |
| `imageUrl` | `string` (URL) | ❌ | 첨부 이미지 URL | Firebase Storage URL |
| `isPinned` | `boolean` | ❌ | 상단 고정 여부 | `false` |
| `createdAt` | `Timestamp` | ✅ | 생성 일시 | `Timestamp(2025-10-15)` |
| `updatedAt` | `Timestamp` | ✅ | 수정 일시 | `Timestamp(2025-10-15)` |

#### 코드 예시

```typescript
// Notice 생성
import { createNotice } from '@/lib/firebase';

const noticeId = await createNotice({
  cohortId: 'cohort1',
  author: '운영자',
  content: '1기가 종료되었습니다. 수고하셨습니다!',
  imageUrl: 'https://storage.firebase.com/notice-image.webp',
  isPinned: true,
});

// 기수별 Notice 조회
import { getNoticesByCohort } from '@/lib/firebase';

const notices = await getNoticesByCohort('cohort1');

// Notice 상단 고정 토글
import { toggleNoticePin } from '@/lib/firebase';

await toggleNoticePin('notice789');
```

#### 인덱스 요구사항

```
Composite Indexes:
- cohortId (ASC) + createdAt (DESC)
- isPinned (DESC) + createdAt (DESC)
```

---

### 5. `messages` (다이렉트 메시지)

참가자 간 1:1 다이렉트 메시지를 저장합니다.

#### 필드 상세

| 필드명 | 타입 | 필수 | 설명 | 예시 값 |
|-------|------|------|------|--------|
| `id` | `string` | ✅ | 문서 ID (Firestore 자동 생성) | `message101` |
| `conversationId` | `string` | ✅ | 대화 ID (정렬된 userId 조합) | `"participant123-participant456"` |
| `senderId` | `string` | ✅ | 발신자 ID (FK: participants) | `participant123` |
| `receiverId` | `string` | ✅ | 수신자 ID (FK: participants) | `participant456` |
| `content` | `string` | ✅ | 메시지 내용 | `"안녕하세요!"` |
| `imageUrl` | `string` (URL) | ❌ | 첨부 이미지 URL | Firebase Storage URL |
| `isRead` | `boolean` | ✅ | 읽음 여부 | `false` |
| `createdAt` | `Timestamp` | ✅ | 생성 일시 | `Timestamp(2025-10-15 10:30:00)` |

#### `conversationId` 생성 규칙

```typescript
// lib/firebase/messages.ts
export function getConversationId(userId1: string, userId2: string): string {
  return [userId1, userId2].sort().join('-');
}

// 예시
getConversationId('alice', 'bob');  // → "alice-bob"
getConversationId('bob', 'alice');  // → "alice-bob" (동일)
```

#### 코드 예시

```typescript
// Message 생성
import { createMessage, getConversationId } from '@/lib/firebase';

const conversationId = getConversationId('participant123', 'participant456');

const messageId = await createMessage({
  conversationId,
  senderId: 'participant123',
  receiverId: 'participant456',
  content: '안녕하세요! 같은 책을 읽고 있네요.',
  isRead: false,
});

// 대화 조회
import { getMessagesByConversation } from '@/lib/firebase';

const messages = await getMessagesByConversation(conversationId);

// 메시지 실시간 구독
import { subscribeToMessages } from '@/lib/firebase';

const unsubscribe = subscribeToMessages(conversationId, (messages) => {
  console.log('새 메시지:', messages);
});

// 읽음 처리
import { markConversationAsRead } from '@/lib/firebase';

await markConversationAsRead(conversationId, 'participant456');
```

#### 인덱스 요구사항

```
Composite Indexes:
- conversationId (ASC) + createdAt (ASC)
- receiverId (ASC) + isRead (ASC)
- senderId (ASC) + createdAt (DESC)
```

---

### 6. `matching_jobs` (AI 매칭 작업 큐)

AI 매칭 비동기 작업을 관리하는 큐 시스템입니다.

#### 필드 상세

| 필드명 | 타입 | 필수 | 설명 | 예시 값 |
|-------|------|------|------|--------|
| `id` | `string` (UUID) | ✅ | 문서 ID (UUID v4) | `"550e8400-e29b-41d4-a716-446655440000"` |
| `status` | `'pending' \| 'processing' \| 'completed' \| 'failed'` | ✅ | 작업 상태 | `"completed"` |
| `cohortId` | `string` | ✅ | 대상 기수 ID (FK: cohorts) | `cohort1` |
| `date` | `string` (YYYY-MM-DD) | ✅ | 매칭 대상 날짜 (어제) | `"2025-10-14"` |
| `result` | `DailyMatchingEntry \| null` | ❌ | 완료 시 매칭 결과 | 아래 참조 |
| `error` | `string \| null` | ❌ | 실패 시 에러 메시지 | `"OpenAI API 오류"` |
| `progress` | `number` | ❌ | 진행률 (0-100) | `75` |
| `createdAt` | `Timestamp` | ✅ | 생성 일시 | `Timestamp(2025-10-15)` |
| `completedAt` | `Timestamp \| null` | ❌ | 완료 일시 | `Timestamp(2025-10-15 01:30:00)` |

#### `result` 구조 (DailyMatchingEntry)

```typescript
// result가 null이 아닐 때 (status === 'completed')
result: {
  assignments: {
    "participant-id-1": {
      similar: ["participant-id-2", "participant-id-3"],
      opposite: ["participant-id-4", "participant-id-5"],
      reasons: {
        similar: "두 분 모두 자기계발서를 선호하시네요",
        opposite: "한 분은 소설, 한 분은 비문학을 선호하십니다",
        summary: "독서 성향을 고려한 매칭"
      }
    },
    // ... 다른 참가자들
  }
}
```

#### 작업 흐름

```
1. pending    → 작업 생성 (새벽 1시 cron)
2. processing → AI 매칭 진행 중
3. completed  → 매칭 완료 (result 저장)
4. failed     → 매칭 실패 (error 저장)
```

#### 코드 예시

```typescript
// Matching Job 생성 (관리자 전용)
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { getDb } from '@/lib/firebase';
import { v4 as uuidv4 } from 'uuid';

const db = getDb();
const jobId = uuidv4();

await addDoc(collection(db, 'matching_jobs'), {
  id: jobId,
  status: 'pending',
  cohortId: 'cohort1',
  date: '2025-10-14',
  result: null,
  error: null,
  progress: 0,
  createdAt: Timestamp.now(),
  completedAt: null,
});

// Job 상태 업데이트
import { doc, updateDoc } from 'firebase/firestore';

const jobRef = doc(db, 'matching_jobs', jobId);

await updateDoc(jobRef, {
  status: 'completed',
  result: matchingResult,
  completedAt: Timestamp.now(),
});
```

#### 인덱스 요구사항

```
Composite Indexes:
- cohortId (ASC) + date (DESC)
- status (ASC) + createdAt (ASC)
```

---

## 관계도 (ERD)

### 텍스트 기반 ERD

```
┌─────────────────┐
│    cohorts      │
│─────────────────│
│ id (PK)         │───┐
│ name            │   │
│ startDate       │   │ 1:N
│ endDate         │   │
│ isActive        │   │
│ daily...        │   │
└─────────────────┘   │
                      │
                      ▼
        ┌──────────────────────┐
        │    participants      │
        │──────────────────────│
        │ id (PK)              │───┐
        │ cohortId (FK)        │   │ 1:N
        │ name                 │   │
        │ phoneNumber          │   │
        │ currentBookTitle     │   │
        │ bookHistory[]        │   │
        │ firebaseUid          │   │
        └──────────────────────┘   │
                │                  │
                │ 1:N              │
                │                  │
                ▼                  │
    ┌────────────────────────┐    │
    │ reading_submissions    │    │
    │────────────────────────│    │
    │ id (PK)                │    │
    │ participantId (FK)     │    │
    │ bookTitle              │    │
    │ bookImageUrl           │    │
    │ review                 │    │
    │ dailyQuestion          │    │
    │ dailyAnswer            │    │
    └────────────────────────┘    │
                                  │
                                  │
                                  ▼
            ┌──────────────────────────┐
            │       notices            │
            │──────────────────────────│
            │ id (PK)                  │
            │ cohortId (FK)            │
            │ author                   │
            │ content                  │
            │ isPinned                 │
            └──────────────────────────┘

        ┌──────────────────────┐
        │    participants      │
        │──────────────────────│
        │ id (PK)              │───┐
        └──────────────────────┘   │
                │                  │
                │ N:M (self)       │
                │                  │
                ▼                  │
    ┌────────────────────────┐    │
    │      messages          │    │
    │────────────────────────│    │
    │ id (PK)                │    │
    │ conversationId         │    │
    │ senderId (FK)          │◄───┤
    │ receiverId (FK)        │◄───┘
    │ content                │
    │ isRead                 │
    └────────────────────────┘

        ┌──────────────────────┐
        │    matching_jobs     │
        │──────────────────────│
        │ id (PK, UUID)        │
        │ status               │
        │ cohortId (FK)        │
        │ date                 │
        │ result               │
        └──────────────────────┘
```

### 관계 요약

| 관계 | 설명 | Cardinality |
|------|------|-------------|
| `cohorts` ↔ `participants` | 기수는 여러 참가자를 포함 | 1:N |
| `cohorts` ↔ `notices` | 기수는 여러 공지를 가짐 | 1:N |
| `participants` ↔ `reading_submissions` | 참가자는 여러 인증을 제출 | 1:N |
| `participants` ↔ `messages` (sender) | 참가자는 여러 메시지를 발신 | 1:N |
| `participants` ↔ `messages` (receiver) | 참가자는 여러 메시지를 수신 | 1:N |
| `cohorts` ↔ `matching_jobs` | 기수는 여러 매칭 작업을 가짐 | 1:N |

---

## 인덱스 전략

Firestore는 모든 필드에 자동으로 단일 필드 인덱스를 생성하지만, 복합 쿼리를 위해서는 **Composite Index**가 필요합니다.

### 필수 복합 인덱스

#### 1. `participants` 컬렉션

```
Collection: participants
Fields:
  - cohortId: Ascending
  - createdAt: Ascending
```

**사용 쿼리**:
```typescript
// 기수별 참가자 조회 (생성일 오름차순)
query(
  collection(db, 'participants'),
  where('cohortId', '==', cohortId),
  orderBy('createdAt', 'asc')
);
```

#### 2. `reading_submissions` 컬렉션

```
Collection: reading_submissions
Fields:
  - participantId: Ascending
  - submittedAt: Descending
```

**사용 쿼리**:
```typescript
// 참가자별 제출물 조회 (최신순)
query(
  collection(db, 'reading_submissions'),
  where('participantId', '==', participantId),
  orderBy('submittedAt', 'desc')
);
```

```
Collection: reading_submissions
Fields:
  - participationCode: Ascending
  - submissionDate: Descending
```

**사용 쿼리**:
```typescript
// 기수별 제출물 조회 (날짜별)
query(
  collection(db, 'reading_submissions'),
  where('participationCode', '==', code),
  orderBy('submissionDate', 'desc')
);
```

#### 3. `messages` 컬렉션

```
Collection: messages
Fields:
  - conversationId: Ascending
  - createdAt: Ascending
```

**사용 쿼리**:
```typescript
// 대화별 메시지 조회 (시간순)
query(
  collection(db, 'messages'),
  where('conversationId', '==', conversationId),
  orderBy('createdAt', 'asc')
);
```

```
Collection: messages
Fields:
  - receiverId: Ascending
  - isRead: Ascending
```

**사용 쿼리**:
```typescript
// 읽지 않은 메시지 수 조회
query(
  collection(db, 'messages'),
  where('receiverId', '==', userId),
  where('isRead', '==', false)
);
```

#### 4. `notices` 컬렉션

```
Collection: notices
Fields:
  - cohortId: Ascending
  - createdAt: Descending
```

**사용 쿼리**:
```typescript
// 기수별 공지 조회 (최신순)
query(
  collection(db, 'notices'),
  where('cohortId', '==', cohortId),
  orderBy('createdAt', 'desc')
);
```

### 인덱스 생성 방법

Firebase Console에서 자동 생성되거나, `firestore.indexes.json` 파일로 관리할 수 있습니다.

**firestore.indexes.json 예시**:

```json
{
  "indexes": [
    {
      "collectionGroup": "participants",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "cohortId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "reading_submissions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "participantId", "order": "ASCENDING" },
        { "fieldPath": "submittedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "messages",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "conversationId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "ASCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

---

## 보안 규칙

Firestore 보안 규칙은 `firestore.rules` 파일에 정의되어 있습니다.

### 주요 보안 규칙 요약

| 컬렉션 | 읽기 (Read) | 쓰기 (Write) | 비고 |
|--------|------------|-------------|------|
| `cohorts` | 모든 인증 사용자 | 관리자만 (Custom Claims) | 공개 정보 |
| `participants` | 모든 인증 사용자 | 본인 + 관리자 | 프로필 수정 제한 |
| `reading_submissions` | 모든 인증 사용자 | 본인만 작성 | 자동 승인 |
| `notices` | 모든 인증 사용자 | 관리자만 | 공지 관리 |
| `messages` | 송신자/수신자만 | 송신자만 생성, 수신자만 읽음 처리 | 1:1 DM |
| `matching_jobs` | 관리자만 | 관리자만 | 비동기 작업 큐 |

### 보안 규칙 상세 (firestore.rules)

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // Helper Functions
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

    // Cohorts: 모든 인증 사용자 읽기, 관리자만 쓰기
    match /cohorts/{cohortId} {
      allow read: if true;              // 공개 (접근 코드 검증용)
      allow write: if isAdminClaim();
    }

    // Participants: 본인 정보 읽기/수정
    match /participants/{participantId} {
      allow read: if isSignedIn();
      allow create: if false;           // 시스템에서만 생성

      // 최초 firebaseUid 연결 또는 기존 소유자의 프로필 업데이트
      allow update: if isSignedIn() && (
        // 케이스 1: 최초 UID 연결
        (request.resource.data.firebaseUid == request.auth.uid &&
         request.resource.data.diff(resource.data).affectedKeys()
           .hasOnly(['firebaseUid', 'updatedAt'])) ||

        // 케이스 2: 기존 소유자의 프로필 업데이트
        (resource.data.firebaseUid == request.auth.uid &&
         request.resource.data.diff(resource.data).affectedKeys()
           .hasOnly(['name', 'profileImage', 'profileImageCircle', 'profileBookUrl',
                    'occupation', 'bio', 'currentBookTitle', 'currentBookAuthor',
                    'currentBookCoverUrl', 'bookHistory', 'pushToken', 'lastActivityAt', 'updatedAt']))
      );

      allow delete: if false;
    }

    // Notices: 읽기는 모두, 쓰기는 관리자만
    match /notices/{noticeId} {
      allow read: if isSignedIn();
      allow write: if isAdminClaim();
    }

    // Messages: 송신자/수신자만 읽기
    match /messages/{messageId} {
      allow read: if isSignedIn() && (
        isOwnParticipant(resource.data.senderId) ||
        isOwnParticipant(resource.data.receiverId)
      );

      // 생성: 본인의 participantId만 senderId로 사용
      allow create: if isSignedIn() &&
        isOwnParticipant(request.resource.data.senderId) &&
        request.resource.data.senderId is string &&
        request.resource.data.receiverId is string &&
        request.resource.data.conversationId is string &&
        ((request.resource.data.content is string && request.resource.data.content.size() > 0) ||
         (request.resource.data.imageUrl is string && request.resource.data.imageUrl.size() > 0));

      // 수정: 수신자만 isRead 변경 가능
      allow update: if isSignedIn() &&
        isOwnParticipant(resource.data.receiverId) &&
        request.resource.data.diff(resource.data).affectedKeys().hasOnly(['isRead']);

      allow delete: if false;
    }

    // Reading Submissions: 본인만 작성/수정/삭제
    match /reading_submissions/{submissionId} {
      allow read: if isSignedIn();

      // 생성: 본인의 participantId만 사용
      allow create: if isSignedIn() &&
        isOwnParticipant(request.resource.data.participantId) &&
        request.resource.data.participantId is string &&
        request.resource.data.participationCode is string &&
        request.resource.data.bookTitle is string &&
        request.resource.data.bookImageUrl is string &&
        request.resource.data.review is string &&
        request.resource.data.dailyQuestion is string &&
        request.resource.data.dailyAnswer is string &&
        request.resource.data.status == 'approved';

      // 수정/삭제: 본인이 작성한 것만
      allow update, delete: if isSignedIn() &&
        isOwnParticipant(resource.data.participantId);
    }
  }
}
```

### Custom Claims 설정

관리자 권한은 Firebase Functions에서 Custom Claims로 설정합니다.

```typescript
// Firebase Admin SDK
import { auth } from 'firebase-admin';

// 관리자 권한 부여
await auth().setCustomUserClaims(uid, { admin: true });

// 권한 확인
const user = await auth().getUser(uid);
console.log(user.customClaims); // { admin: true }
```

참고: [docs/setup/firebase-custom-claims.md](../setup/firebase-custom-claims.md)

---

## 데이터 타입 가이드

### Firestore 데이터 타입 매핑

| TypeScript 타입 | Firestore 타입 | 설명 | 예시 |
|----------------|----------------|------|------|
| `string` | String | 문자열 | `"홍길동"` |
| `number` | Number | 숫자 (정수/실수) | `42`, `3.14` |
| `boolean` | Boolean | 참/거짓 | `true`, `false` |
| `Date` | Timestamp | 날짜 및 시간 | `Timestamp.now()` |
| `string` (ISO 8601) | String | 날짜 문자열 | `"2025-10-15"` |
| `any[]` | Array | 배열 | `["a", "b", "c"]` |
| `Record<string, any>` | Map | 객체 | `{ key: "value" }` |
| `null` | Null | null 값 | `null` |

### Timestamp 사용법

```typescript
import { Timestamp } from 'firebase/firestore';

// 현재 시각
const now = Timestamp.now();

// Date 객체로 변환
const date = now.toDate();

// ISO 8601 문자열로 변환
const isoString = date.toISOString();

// 특정 시각으로 생성
const specificTime = Timestamp.fromDate(new Date('2025-10-15'));

// 비교
if (timestamp1.toMillis() > timestamp2.toMillis()) {
  // timestamp1이 더 최근
}
```

### 배열 및 객체 업데이트

```typescript
import { updateDoc, arrayUnion, arrayRemove, deleteField } from 'firebase/firestore';

// 배열에 항목 추가
await updateDoc(docRef, {
  interests: arrayUnion('독서')
});

// 배열에서 항목 제거
await updateDoc(docRef, {
  interests: arrayRemove('독서')
});

// 필드 삭제
await updateDoc(docRef, {
  bio: deleteField()
});

// 중첩 객체 업데이트
await updateDoc(docRef, {
  'metadata.source': 'mobile'
});
```

---

## 부록: 쿼리 패턴 예시

### 1. 기수별 참가자 조회 (캐싱 없이)

```typescript
import { getParticipantsByCohort } from '@/lib/firebase';

const participants = await getParticipantsByCohort('cohort1');
```

### 2. 오늘 인증한 참가자 실시간 구독

```typescript
import { subscribeTodayVerified } from '@/lib/firebase';

const unsubscribe = subscribeTodayVerified('cohort1', (verifiedIds) => {
  console.log('오늘 인증 완료한 참가자 ID:', verifiedIds);
});

// 구독 해제
unsubscribe();
```

### 3. 대화 ID로 메시지 실시간 구독

```typescript
import { subscribeToMessages, getConversationId } from '@/lib/firebase';

const conversationId = getConversationId('participant1', 'participant2');

const unsubscribe = subscribeToMessages(conversationId, (messages) => {
  console.log('메시지 목록:', messages);
});

// 구독 해제
unsubscribe();
```

### 4. 참가자 전화번호로 조회

```typescript
import { getParticipantByPhoneNumber } from '@/lib/firebase';

const participant = await getParticipantByPhoneNumber('010-1234-5678');
if (participant) {
  console.log('참가자 이름:', participant.name);
}
```

### 5. 책 정보 업데이트 (트랜잭션)

```typescript
import { updateParticipantBookInfo } from '@/lib/firebase';

// 책 제목이 다르면 bookHistory 업데이트 + 메타데이터 저장
await updateParticipantBookInfo(
  'participant123',
  '클린 코드',
  '로버트 C. 마틴',
  'https://cover-url.com/clean-code.jpg'
);
```

---

## 관련 문서

- [데이터베이스 최적화 가이드](../optimization/database.md)
- [Firebase 보안 규칙 퀵스타트](../setup/firebase-security-quickstart.md)
- [Firebase Custom Claims 설정](../setup/firebase-custom-claims.md)
- [TRD (Technical Requirements Document)](../architecture/trd.md)

---

**최종 업데이트**: 2025년 10월 16일
**문서 위치**: `docs/database/schema.md`
**문서 버전**: v1.0

*이 문서는 projectpns 프로젝트의 Firestore 데이터베이스 스키마에 대한 유일한 권위 있는 문서입니다.*
