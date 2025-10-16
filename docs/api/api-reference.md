# API Reference Documentation

**Last Updated**: 2025-10-16
**Document Version**: v1.0.0
**Category**: api

---

## 목차 (Table of Contents)

1. [개요 (Overview)](#개요-overview)
2. [Firebase Client SDK Operations](#firebase-client-sdk-operations)
   - [Cohorts API](#cohorts-api)
   - [Participants API](#participants-api)
   - [Submissions API](#submissions-api)
   - [Notices API](#notices-api)
   - [Messages API](#messages-api)
   - [Storage API](#storage-api)
   - [Auth API](#auth-api)
3. [External APIs](#external-apis)
   - [Naver Book Search API](#naver-book-search-api)
   - [OpenAI API (AI Matching)](#openai-api-ai-matching)
4. [Next.js API Routes](#nextjs-api-routes)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)

---

## 개요 (Overview)

이 문서는 필립앤소피 플랫폼에서 사용하는 모든 API에 대한 레퍼런스를 제공합니다.

### API 카테고리

| 카테고리 | 위치 | 용도 |
|----------|------|------|
| **Firebase Client SDK** | `src/lib/firebase/*.ts` | Firestore, Storage, Auth 작업 |
| **External APIs** | `src/lib/*.ts` | 네이버 책 검색, OpenAI 매칭 |
| **Next.js API Routes** | `src/app/api/*/route.ts` | 서버 사이드 API 엔드포인트 |

### 타입 정의 위치

모든 데이터베이스 타입은 `src/types/database.ts`에 정의되어 있습니다:

```typescript
import type {
  Cohort,
  Participant,
  ReadingSubmission,
  Notice,
  DirectMessage,
} from '@/types/database';
```

---

## Firebase Client SDK Operations

### Cohorts API

**위치**: `src/lib/firebase/cohorts.ts`

기수(cohort) 관리를 위한 CRUD 작업을 제공합니다.

#### `createCohort(data)`

새로운 기수를 생성합니다.

**Parameters**:
```typescript
data: {
  name: string;        // 기수 이름 (예: '1기')
  startDate: string;   // 시작일 (ISO 8601: '2025-01-01')
  endDate: string;     // 종료일 (ISO 8601: '2025-03-31')
  isActive: boolean;   // 활성화 여부
}
```

**Returns**: `Promise<string>` - 생성된 문서 ID

**Example**:
```typescript
import { createCohort } from '@/lib/firebase/cohorts';

const cohortId = await createCohort({
  name: '1기',
  startDate: '2025-01-01',
  endDate: '2025-03-31',
  isActive: true,
});

console.log('Created cohort:', cohortId);
```

**Error Handling**:
```typescript
try {
  const cohortId = await createCohort(data);
} catch (error) {
  logger.error('Failed to create cohort:', error);
  // Firestore 에러 처리
}
```

---

#### `createCohortWithId(id, data)`

지정된 ID로 기수를 생성합니다 (시딩 스크립트용).

**Parameters**:
```typescript
id: string;          // 커스텀 문서 ID
data: {
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}
```

**Returns**: `Promise<void>`

**Example**:
```typescript
await createCohortWithId('cohort1', {
  name: '1기',
  startDate: '2025-01-01',
  endDate: '2025-03-31',
  isActive: true,
});
```

---

#### `getCohortById(id)`

ID로 특정 기수를 조회합니다.

**Parameters**:
- `id: string` - 기수 ID

**Returns**: `Promise<Cohort | null>`

**Example**:
```typescript
const cohort = await getCohortById('cohort1');

if (cohort) {
  console.log('Cohort name:', cohort.name);
  console.log('Start date:', cohort.startDate);
} else {
  console.log('Cohort not found');
}
```

---

#### `getAllCohorts()`

모든 기수를 조회합니다.

**Parameters**: 없음

**Returns**: `Promise<Cohort[]>`

**Example**:
```typescript
const cohorts = await getAllCohorts();

cohorts.forEach(cohort => {
  console.log(`${cohort.name}: ${cohort.isActive ? '활성' : '비활성'}`);
});
```

---

#### `getActiveCohorts()`

활성화된 기수만 조회합니다.

**Parameters**: 없음

**Returns**: `Promise<Cohort[]>`

**Example**:
```typescript
const activeCohorts = await getActiveCohorts();
// isActive === true인 기수만 반환
```

**Firestore Query**:
```typescript
query(cohortsRef, where('isActive', '==', true))
```

---

#### `updateCohort(id, data)`

기수 정보를 업데이트합니다.

**Parameters**:
```typescript
id: string;
data: Partial<Omit<Cohort, 'id' | 'createdAt' | 'updatedAt'>>;
```

**Returns**: `Promise<void>`

**Example**:
```typescript
await updateCohort('cohort1', {
  name: '1기 (수정됨)',
  isActive: false,
});
```

**Note**: `updatedAt` 필드는 자동으로 현재 시각으로 업데이트됩니다.

---

#### `deleteCohort(id)`

기수를 삭제합니다.

**Parameters**:
- `id: string`

**Returns**: `Promise<void>`

**Example**:
```typescript
await deleteCohort('cohort1');
```

**Warning**: 참가자 데이터가 남아있는 기수를 삭제하면 무결성 문제가 발생할 수 있습니다. 삭제 전에 참가자 확인 권장.

---

#### `updateDailyFeaturedParticipants(cohortId, date, matching)`

AI 매칭 결과를 저장합니다.

**Parameters**:
```typescript
cohortId: string;     // 기수 ID
date: string;         // 날짜 (YYYY-MM-DD)
matching: DailyMatchingEntry; // 매칭 결과
```

**Returns**: `Promise<void>`

**Example**:
```typescript
import type { DailyMatchingEntry } from '@/types/database';

const matching: DailyMatchingEntry = {
  assignments: {
    'participant1': {
      similar: ['participant2', 'participant3'],
      opposite: ['participant4'],
      reasons: {
        similar: '같은 장르를 선호합니다',
        opposite: '독서 스타일이 상반됩니다',
      },
    },
  },
};

await updateDailyFeaturedParticipants('cohort1', '2025-10-15', matching);
```

**Data Structure**:
```typescript
// Firestore 문서 구조
cohorts/{cohortId} {
  dailyFeaturedParticipants: {
    '2025-10-15': {
      assignments: {
        'participant1': {
          similar: ['participant2'],
          opposite: ['participant3'],
          reasons: { ... }
        }
      }
    }
  }
}
```

---

### Participants API

**위치**: `src/lib/firebase/participants.ts`

참가자 관리를 위한 CRUD 작업을 제공합니다.

#### `createParticipant(data)`

새로운 참가자를 생성합니다.

**Parameters**:
```typescript
data: Omit<Participant, 'id' | 'createdAt' | 'updatedAt'> {
  cohortId: string;              // 기수 ID
  name: string;                  // 이름
  phoneNumber: string;           // 전화번호 (하이픈 제거된 형식)
  gender?: 'male' | 'female' | 'other';
  profileImage?: string;         // 프로필 이미지 URL
  profileImageCircle?: string;   // 원형 프로필 이미지 URL
  profileBookUrl?: string;       // 프로필북 URL
  isAdministrator?: boolean;     // 관리자 여부
  occupation?: string;           // 직업/하는 일
  bio?: string;                  // 한 줄 소개
  currentBookTitle?: string;     // 현재 읽는 책
  currentBookAuthor?: string;    // 현재 읽는 책 저자
  currentBookCoverUrl?: string;  // 현재 읽는 책 표지
  firebaseUid?: string;          // Firebase Auth UID
  pushToken?: string;            // FCM 푸시 토큰
}
```

**Returns**: `Promise<string>` - 생성된 참가자 ID

**Example**:
```typescript
const participantId = await createParticipant({
  cohortId: 'cohort1',
  name: '홍길동',
  phoneNumber: '01012345678', // 하이픈 없음
  gender: 'male',
  occupation: '개발자',
  bio: '독서를 좋아하는 개발자입니다.',
});
```

---

#### `getParticipantById(id)`

ID로 참가자를 조회합니다.

**Parameters**:
- `id: string`

**Returns**: `Promise<Participant | null>`

**Example**:
```typescript
const participant = await getParticipantById('abc123');

if (participant) {
  console.log('Name:', participant.name);
  console.log('Current book:', participant.currentBookTitle);
}
```

---

#### `getParticipantByPhoneNumber(phoneNumber)`

전화번호로 참가자를 조회합니다.

**Parameters**:
- `phoneNumber: string` - 전화번호 (하이픈 포함/미포함 모두 가능)

**Returns**: `Promise<Participant | null>`

**Example**:
```typescript
// 하이픈 포함/미포함 모두 작동
const participant1 = await getParticipantByPhoneNumber('010-1234-5678');
const participant2 = await getParticipantByPhoneNumber('01012345678');
```

**Note**: 내부적으로 하이픈을 제거하여 검색합니다.

---

#### `getParticipantByFirebaseUid(firebaseUid)`

Firebase Auth UID로 참가자를 조회합니다.

**Parameters**:
- `firebaseUid: string`

**Returns**: `Promise<Participant | null>`

**Example**:
```typescript
import { getAuth } from 'firebase/auth';

const auth = getAuth();
const user = auth.currentUser;

if (user) {
  const participant = await getParticipantByFirebaseUid(user.uid);
}
```

---

#### `linkFirebaseUid(participantId, firebaseUid)`

참가자에 Firebase UID를 연결합니다.

**Parameters**:
```typescript
participantId: string;  // 참가자 ID
firebaseUid: string;    // Firebase Auth UID
```

**Returns**: `Promise<void>`

**Example**:
```typescript
// Phone Auth 로그인 후
await linkFirebaseUid('participant123', user.uid);
```

**Use Case**: 접근 코드 로그인 후 Phone Auth로 업그레이드 시 사용

---

#### `getParticipantsByCohort(cohortId)`

기수별 참가자 목록을 조회합니다.

**Parameters**:
- `cohortId: string`

**Returns**: `Promise<Participant[]>`

**Example**:
```typescript
const participants = await getParticipantsByCohort('cohort1');

console.log(`Total participants: ${participants.length}`);
participants.forEach(p => {
  console.log(`${p.name} - ${p.currentBookTitle || '책 미설정'}`);
});
```

**Firestore Query**:
```typescript
query(
  collection(db, 'participants'),
  where('cohortId', '==', cohortId),
  orderBy('createdAt', 'asc')
)
```

---

#### `getAllParticipants()`

모든 참가자를 조회합니다.

**Parameters**: 없음

**Returns**: `Promise<Participant[]>`

**Example**:
```typescript
const allParticipants = await getAllParticipants();
// 최신순으로 정렬됨 (createdAt desc)
```

---

#### `updateParticipant(id, data)`

참가자 정보를 업데이트합니다.

**Parameters**:
```typescript
id: string;
data: Partial<Omit<Participant, 'id' | 'createdAt'>>;
```

**Returns**: `Promise<void>`

**Example**:
```typescript
await updateParticipant('participant123', {
  bio: '새로운 소개입니다.',
  occupation: '작가',
  currentBookTitle: '해리포터와 마법사의 돌',
});
```

---

#### `deleteParticipant(id)`

참가자를 삭제합니다.

**Parameters**:
- `id: string`

**Returns**: `Promise<void>`

**Warning**: 참가자 삭제 시 연관된 독서 인증, 메시지도 함께 정리 필요

---

#### `updateParticipantBookInfo(participantId, newBookTitle, newBookAuthor?, newBookCoverUrl?)`

참가자의 책 정보를 업데이트하고 이력을 관리합니다.

**Parameters**:
```typescript
participantId: string;      // 참가자 ID
newBookTitle: string;       // 새 책 제목
newBookAuthor?: string;     // 새 책 저자 (선택)
newBookCoverUrl?: string;   // 새 책 표지 URL (선택)
```

**Returns**: `Promise<void>`

**동작 방식**:
1. 현재 책 제목과 같으면 메타데이터(저자, 표지)만 업데이트
2. 다르면:
   - 이전 책의 `endedAt`을 현재 시각으로 설정
   - 새 책을 `bookHistory`에 추가 (endedAt: null)
   - `currentBookTitle`, `currentBookAuthor`, `currentBookCoverUrl` 업데이트

**Example**:
```typescript
// 새 책 시작
await updateParticipantBookInfo(
  'participant123',
  '1984',
  '조지 오웰',
  'https://image.url/1984.jpg'
);

// 같은 책 메타데이터 업데이트 (제목 같음)
await updateParticipantBookInfo(
  'participant123',
  '1984', // 제목 동일
  '조지 오웰 (수정)',
  'https://new-image.url/1984.jpg'
);
```

**Transaction 사용**:
- Firebase `runTransaction()`을 사용하여 원자적 업데이트 보장
- 최대 3번 재시도 (동시성 충돌 방지)

---

### Submissions API

**위치**: `src/lib/firebase/submissions.ts`

독서 인증 제출물 관리를 위한 CRUD 작업과 실시간 구독을 제공합니다.

#### `createSubmission(data)`

독서 인증을 제출합니다.

**Parameters**:
```typescript
data: Omit<ReadingSubmission, 'id' | 'createdAt' | 'updatedAt' | 'submissionDate'> {
  participantId: string;       // 참가자 ID
  participationCode: string;   // 참여 코드
  bookTitle: string;           // 책 제목 (필수)
  bookAuthor?: string;         // 책 저자
  bookCoverUrl?: string;       // 책 표지 URL (네이버 API)
  bookDescription?: string;    // 책 소개 (네이버 API)
  bookImageUrl: string;        // 인증 사진 URL (필수)
  review: string;              // 간단 감상평 (필수)
  dailyQuestion: string;       // 오늘의 질문 (필수)
  dailyAnswer: string;         // 질문 답변 (필수)
  submittedAt: Timestamp;      // 제출 시각
  status: 'approved';          // 항상 자동 승인
}
```

**Returns**: `Promise<string>` - 생성된 제출물 ID

**Example**:
```typescript
import { Timestamp } from 'firebase/firestore';
import { createSubmission } from '@/lib/firebase/submissions';

const submissionId = await createSubmission({
  participantId: 'participant123',
  participationCode: 'abc123',
  bookTitle: '해리포터와 마법사의 돌',
  bookAuthor: 'J.K. 롤링',
  bookCoverUrl: 'https://image.url/harry-potter.jpg',
  bookImageUrl: 'https://storage.url/my-photo.jpg',
  review: '마법의 세계로 빠져들게 하는 책입니다!',
  dailyQuestion: '오늘 책에서 가장 인상 깊었던 구절은?',
  dailyAnswer: '"해리, 넌 마법사야"라는 대사가 가장 기억에 남습니다.',
  submittedAt: Timestamp.now(),
  status: 'approved', // 자동 승인
});
```

**Note**: `submissionDate`는 자동으로 `YYYY-MM-DD` 형식으로 생성됩니다.

---

#### `getSubmissionById(id)`

ID로 제출물을 조회합니다.

**Parameters**:
- `id: string`

**Returns**: `Promise<ReadingSubmission | null>`

---

#### `getSubmissionsByParticipant(participantId)`

참가자별 제출물을 조회합니다.

**Parameters**:
- `participantId: string`

**Returns**: `Promise<ReadingSubmission[]>`

**Example**:
```typescript
const submissions = await getSubmissionsByParticipant('participant123');

submissions.forEach(s => {
  console.log(`${s.bookTitle} - ${s.submissionDate}`);
});
```

**Firestore Query**:
```typescript
query(
  collection(db, 'reading_submissions'),
  where('participantId', '==', participantId),
  orderBy('submittedAt', 'desc')
)
```

---

#### `getSubmissionsByCode(participationCode)`

참여 코드별 제출물을 조회합니다.

**Parameters**:
- `participationCode: string`

**Returns**: `Promise<ReadingSubmission[]>`

---

#### `getAllSubmissions()`

모든 제출물을 조회합니다.

**Parameters**: 없음

**Returns**: `Promise<ReadingSubmission[]>`

---

#### `getSubmissionsByStatus(status)`

**⚠️ DEPRECATED**: 승인 프로세스가 제거되어 더 이상 사용되지 않습니다. 모든 제출물은 자동 승인됩니다.

---

#### `updateSubmission(id, data)`

제출물을 업데이트합니다.

**Parameters**:
```typescript
id: string;
data: Partial<Omit<ReadingSubmission, 'id' | 'createdAt'>>;
```

**Returns**: `Promise<void>`

---

#### `deleteSubmission(id)`

제출물을 삭제합니다.

**Parameters**:
- `id: string`

**Returns**: `Promise<void>`

---

#### `subscribeParticipantSubmissions(participantId, callback)`

**실시간 구독**: 참가자의 제출물을 실시간으로 감지합니다.

**Parameters**:
```typescript
participantId: string;
callback: (submissions: ReadingSubmission[]) => void;
```

**Returns**: `() => void` - unsubscribe 함수

**Example**:
```typescript
import { subscribeParticipantSubmissions } from '@/lib/firebase/submissions';

// 구독 시작
const unsubscribe = subscribeParticipantSubmissions(
  'participant123',
  (submissions) => {
    console.log('Real-time update:', submissions.length);
    // UI 업데이트
    setSubmissions(submissions);
  }
);

// 컴포넌트 언마운트 시 구독 해제
return () => {
  unsubscribe();
};
```

**Use Case**: 프로필북에서 실시간으로 독서 인증 표시

**React Component Example**:
```typescript
'use client';

import { useEffect, useState } from 'react';
import { subscribeParticipantSubmissions } from '@/lib/firebase/submissions';
import type { ReadingSubmission } from '@/types/database';

export function ProfileBook({ participantId }: { participantId: string }) {
  const [submissions, setSubmissions] = useState<ReadingSubmission[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeParticipantSubmissions(
      participantId,
      setSubmissions
    );

    return unsubscribe; // 클린업
  }, [participantId]);

  return (
    <div>
      {submissions.map(s => (
        <div key={s.id}>{s.bookTitle}</div>
      ))}
    </div>
  );
}
```

---

#### `subscribeTodayVerified(callback, targetDate)`

**실시간 구독**: 특정 날짜에 인증한 참가자 ID 목록을 실시간으로 감지합니다.

**Parameters**:
```typescript
callback: (participantIds: Set<string>) => void;
targetDate: string; // YYYY-MM-DD 형식 (필수)
```

**Returns**: `() => void` - unsubscribe 함수

**Example**:
```typescript
import { format } from 'date-fns';

const today = format(new Date(), 'yyyy-MM-dd');

const unsubscribe = subscribeTodayVerified(
  (participantIds) => {
    console.log('Today verified:', Array.from(participantIds));
    // UI에서 인증 배지 표시
  },
  today
);
```

**Firestore Query**:
```typescript
query(
  collection(db, 'reading_submissions'),
  where('submissionDate', '==', targetDate),
  where('status', 'in', ['pending', 'approved'])
)
```

**Use Case**: Today's Library, 참가자 목록에서 오늘 인증한 사람 표시

---

### Notices API

**위치**: `src/lib/firebase/notices.ts`

공지사항 관리를 위한 CRUD 작업을 제공합니다.

#### `createNotice(data)`

공지사항을 생성합니다.

**Parameters**:
```typescript
data: Omit<Notice, 'id' | 'createdAt' | 'updatedAt'> {
  cohortId: string;    // 기수 ID
  author: string;      // 작성자 (보통 '운영자')
  content: string;     // 공지 내용 (최대 5000자)
  imageUrl?: string;   // 이미지 URL (선택)
  isPinned?: boolean;  // 상단 고정 (기본값: false)
}
```

**Returns**: `Promise<string>` - 생성된 공지 ID

**Example**:
```typescript
const noticeId = await createNotice({
  cohortId: 'cohort1',
  author: '운영자',
  content: '오늘부터 독서 인증이 시작됩니다! 매일 책을 읽고 인증해주세요.',
  isPinned: true, // 상단 고정
});
```

---

#### `getNoticeById(id)`

ID로 공지사항을 조회합니다.

---

#### `getNoticesByCohort(cohortId)`

기수별 공지사항을 조회합니다.

**Parameters**:
- `cohortId: string`

**Returns**: `Promise<Notice[]>`

**Example**:
```typescript
const notices = await getNoticesByCohort('cohort1');

// 고정 공지 먼저 표시
const pinnedNotices = notices.filter(n => n.isPinned);
const regularNotices = notices.filter(n => !n.isPinned);
```

**Firestore Query**:
```typescript
query(
  collection(db, 'notices'),
  where('cohortId', '==', cohortId),
  orderBy('createdAt', 'asc')
)
```

---

#### `getAllNotices()`

모든 공지사항을 조회합니다.

---

#### `updateNotice(id, data)`

공지사항을 업데이트합니다.

**Parameters**:
```typescript
id: string;
data: Partial<Omit<Notice, 'id' | 'createdAt'>>;
```

**Example**:
```typescript
await updateNotice('notice123', {
  content: '수정된 공지 내용입니다.',
  isPinned: false, // 고정 해제
});
```

---

#### `toggleNoticePin(id)`

공지사항 고정 상태를 토글합니다.

**Parameters**:
- `id: string`

**Returns**: `Promise<void>`

**Example**:
```typescript
// 고정 ↔ 고정 해제 전환
await toggleNoticePin('notice123');
```

---

#### `deleteNotice(id)`

공지사항을 삭제합니다.

---

### Messages API

**위치**: `src/lib/firebase/messages.ts`

다이렉트 메시지 관리를 위한 CRUD 작업과 실시간 구독을 제공합니다.

#### `createMessage(data)`

다이렉트 메시지를 생성합니다.

**Parameters**:
```typescript
data: {
  conversationId: string;  // 대화 ID (userId-admin 형식)
  senderId: string;        // 발신자 ID
  receiverId: string;      // 수신자 ID
  content: string;         // 메시지 내용
  imageUrl?: string;       // 이미지 URL (선택)
}
```

**Returns**: `Promise<string>` - 생성된 메시지 ID

**Example**:
```typescript
const messageId = await createMessage({
  conversationId: 'participant123-admin',
  senderId: 'participant123',
  receiverId: 'admin',
  content: '안녕하세요! 질문이 있습니다.',
});
```

---

#### `getMessagesByConversation(conversationId)`

대화별 메시지를 조회합니다.

**Parameters**:
- `conversationId: string`

**Returns**: `Promise<DirectMessage[]>`

**Firestore Query**:
```typescript
query(
  messagesRef,
  where('conversationId', '==', conversationId),
  orderBy('createdAt', 'asc') // 오래된 순
)
```

---

#### `getMessagesBySender(senderId)`

발신자별 메시지를 조회합니다.

---

#### `getMessagesByReceiver(receiverId)`

수신자별 메시지를 조회합니다.

---

#### `getUnreadCount(conversationId, userId)`

대화별 읽지 않은 메시지 개수를 조회합니다.

**Parameters**:
```typescript
conversationId: string;
userId: string;
```

**Returns**: `Promise<number>`

**Example**:
```typescript
const unreadCount = await getUnreadCount('participant123-admin', 'admin');
console.log(`Unread messages: ${unreadCount}`);
```

**Firestore Query**:
```typescript
query(
  messagesRef,
  where('conversationId', '==', conversationId),
  where('receiverId', '==', userId),
  where('isRead', '==', false)
)
```

---

#### `getTotalUnreadCount(userId)`

사용자의 전체 읽지 않은 메시지 개수를 조회합니다.

**Parameters**:
- `userId: string`

**Returns**: `Promise<number>`

---

#### `markConversationAsRead(conversationId, userId)`

대화의 모든 메시지를 읽음 처리합니다.

**Parameters**:
```typescript
conversationId: string;
userId: string;
```

**Returns**: `Promise<void>`

**Example**:
```typescript
// 사용자가 채팅방에 들어왔을 때
await markConversationAsRead('participant123-admin', 'admin');
```

**Batch Update**:
- `writeBatch()`를 사용하여 여러 메시지를 한 번에 업데이트
- 읽지 않은 메시지가 없으면 early return (빈 배치 방지)

---

#### `markMessageAsRead(messageId)`

특정 메시지를 읽음 처리합니다.

---

#### `deleteMessage(messageId)`

메시지를 삭제합니다.

---

#### `getAdminConversations()`

관리자가 볼 수 있는 모든 대화 ID를 조회합니다.

**Returns**: `Promise<string[]>`

**Example**:
```typescript
const conversationIds = await getAdminConversations();
// ['participant1-admin', 'participant2-admin', ...]
```

---

#### `subscribeToMessages(conversationId, callback)`

**실시간 구독**: 대화의 메시지를 실시간으로 감지합니다.

**Parameters**:
```typescript
conversationId: string;
callback: (messages: DirectMessage[]) => void;
```

**Returns**: `() => void` - unsubscribe 함수

**Example**:
```typescript
const unsubscribe = subscribeToMessages(
  'participant123-admin',
  (messages) => {
    console.log('New messages:', messages.length);
    setMessages(messages);
  }
);

// 클린업
return () => {
  unsubscribe();
};
```

---

#### `getConversationId(participantId)`

참가자와 관리자 간의 대화 ID를 생성합니다.

**Parameters**:
- `participantId: string`

**Returns**: `string` - 대화 ID (`{participantId}-admin` 형식)

**Example**:
```typescript
const conversationId = getConversationId('participant123');
// 'participant123-admin'
```

---

### Storage API

**위치**: `src/lib/firebase/storage.ts`

Firebase Storage 파일 업로드/삭제를 제공합니다.

#### `uploadFile(file, path)`

파일을 업로드합니다 (간단한 버전).

**Parameters**:
```typescript
file: File;      // 업로드할 파일
path: string;    // Storage 경로
```

**Returns**: `Promise<string>` - 다운로드 URL

**Example**:
```typescript
const downloadURL = await uploadFile(file, 'profile_images/user123.jpg');
console.log('Image URL:', downloadURL);
```

---

#### `uploadFileWithProgress(file, path, onProgress?)`

파일을 업로드합니다 (진행률 추적 가능).

**Parameters**:
```typescript
file: File;
path: string;
onProgress?: (progress: number) => void; // 0-100 진행률
```

**Returns**: `Promise<string>`

**Example**:
```typescript
const downloadURL = await uploadFileWithProgress(
  file,
  'reading_submissions/abc123/image.jpg',
  (progress) => {
    console.log(`Upload progress: ${progress}%`);
    setUploadProgress(progress);
  }
);
```

---

#### `uploadMultipleFiles(files, basePath)`

여러 파일을 한 번에 업로드합니다.

**Parameters**:
```typescript
files: File[];
basePath: string;
```

**Returns**: `Promise<string[]>` - 다운로드 URL 배열

---

#### `uploadReadingImage(file, participationCode, onProgress?)`

독서 인증 이미지를 업로드합니다.

**Parameters**:
```typescript
file: File;
participationCode: string;
onProgress?: (progress: number) => void;
```

**Returns**: `Promise<string>`

**Storage Path**: `reading_submissions/{participationCode}/{timestamp}_{filename}`

**Example**:
```typescript
const imageUrl = await uploadReadingImage(
  file,
  'abc123',
  (progress) => console.log(`${progress}%`)
);
```

---

#### `uploadNoticeImage(file, cohortId)`

공지사항 이미지를 업로드합니다.

**Storage Path**: `notices/{cohortId}/{timestamp}_{filename}`

---

#### `uploadDMImage(file, userId)`

DM 이미지를 업로드합니다.

**Storage Path**: `direct_messages/{userId}/{timestamp}_{filename}`

---

#### `deleteFile(fileUrl)`

파일을 삭제합니다.

**Parameters**:
- `fileUrl: string` - 삭제할 파일 URL 또는 경로

**Returns**: `Promise<void>`

---

#### `deleteMultipleFiles(fileUrls)`

여러 파일을 삭제합니다.

---

### Auth API

**위치**: `src/lib/firebase/auth.ts`

Firebase Phone Authentication을 제공합니다.

#### `initRecaptcha(containerId, size?)`

reCAPTCHA Verifier를 초기화합니다.

**Parameters**:
```typescript
containerId?: string;        // DOM 요소 ID (기본값: 'recaptcha-container')
size?: 'invisible' | 'normal'; // 크기 (기본값: 'invisible')
```

**Returns**: `RecaptchaVerifier`

**Example**:
```typescript
import { initRecaptcha } from '@/lib/firebase/auth';

// Invisible reCAPTCHA
const recaptchaVerifier = initRecaptcha('recaptcha-container', 'invisible');
```

**HTML Setup**:
```html
<div id="recaptcha-container"></div>
```

---

#### `sendSmsVerification(phoneNumber, recaptchaVerifier)`

SMS 인증 코드를 전송합니다.

**Parameters**:
```typescript
phoneNumber: string;             // 전화번호 (E.164 형식 자동 변환)
recaptchaVerifier: RecaptchaVerifier;
```

**Returns**: `Promise<ConfirmationResult>`

**Example**:
```typescript
import { initRecaptcha, sendSmsVerification } from '@/lib/firebase/auth';

const recaptchaVerifier = initRecaptcha('recaptcha-container');

try {
  const confirmationResult = await sendSmsVerification(
    '010-1234-5678', // 또는 '01012345678'
    recaptchaVerifier
  );

  // confirmationResult를 저장하여 다음 단계에서 사용
  setConfirmationResult(confirmationResult);
} catch (error) {
  console.error('SMS 전송 실패:', error.message);
}
```

**전화번호 형식**:
- 입력: `010-1234-5678` 또는 `01012345678`
- 내부 변환: `+821012345678` (E.164 형식)

---

#### `confirmSmsCode(confirmationResult, verificationCode)`

SMS 인증 코드를 확인하고 로그인합니다.

**Parameters**:
```typescript
confirmationResult: ConfirmationResult;
verificationCode: string; // 6자리 인증 코드
```

**Returns**: `Promise<UserCredential>`

**Example**:
```typescript
try {
  const userCredential = await confirmSmsCode(
    confirmationResult,
    '123456' // 사용자가 입력한 코드
  );

  console.log('로그인 성공:', userCredential.user.uid);

  // Participant에 firebaseUid 연결
  await linkFirebaseUid(participantId, userCredential.user.uid);
} catch (error) {
  console.error('인증 코드 확인 실패:', error.message);
}
```

**Validation**:
- 코드 길이: 6자리 (숫자만)
- 잘못된 코드 입력 시 `Error` throw

---

#### `signInWithPhoneCredential(verificationId, verificationCode)`

고급 사용자를 위한 직접 로그인 (verificationId 사용).

---

#### `signOut()`

로그아웃합니다.

**Returns**: `Promise<void>`

**Example**:
```typescript
await signOut();
console.log('로그아웃 완료');
```

---

## External APIs

### Naver Book Search API

**위치**: `src/lib/naver-book-api.ts` (클라이언트), `src/app/api/search-books/route.ts` (서버)

네이버 책 검색 API를 통해 책 정보를 조회합니다.

#### 아키텍처

```
클라이언트 (searchNaverBooks)
       ↓
Next.js API Route (/api/search-books)
       ↓
Naver Book Search API (https://openapi.naver.com)
```

**보안**: API 키는 서버 사이드에서만 사용됩니다.

---

#### `searchNaverBooks(params)`

책을 검색합니다.

**Parameters**:
```typescript
params: {
  query: string;        // 검색어 (필수)
  display?: number;     // 검색 결과 개수 (기본값: 10, 최대: 100)
  start?: number;       // 검색 시작 위치 (기본값: 1, 최대: 1000)
  sort?: 'sim' | 'date'; // 정렬 (sim: 유사도순, date: 출간일순)
}
```

**Returns**: `Promise<NaverBookSearchResponse>`

**Response Type**:
```typescript
interface NaverBookSearchResponse {
  lastBuildDate: string;  // 검색 결과 생성 시간
  total: number;          // 총 검색 결과 개수
  start: number;          // 검색 시작 위치
  display: number;        // 검색 결과 출력 개수
  items: NaverBook[];     // 검색 결과 배열
}

interface NaverBook {
  title: string;          // 책 제목 (HTML 태그 제거됨)
  author: string;         // 저자 (HTML 태그 제거됨)
  publisher: string;      // 출판사
  description: string;    // 책 소개 (HTML 태그 제거됨)
  isbn: string;           // ISBN
  image: string;          // 표지 이미지 URL
  link: string;           // 네이버 책 상세 페이지 URL
  pubdate: string;        // 출간일 (YYYYMMDD)
  discount: string;       // 정가
}
```

**Example**:
```typescript
import { searchNaverBooks } from '@/lib/naver-book-api';

const response = await searchNaverBooks({
  query: '해리포터',
  display: 10,
  sort: 'sim',
});

console.log(`총 ${response.total}개의 결과`);
response.items.forEach(book => {
  console.log(`${book.title} - ${book.author}`);
});
```

**Error Handling**:
```typescript
try {
  const response = await searchNaverBooks({ query: '해리포터' });
} catch (error) {
  console.error('책 검색 실패:', error.message);
  // 'Book search failed with status 429' (Rate limit exceeded)
  // 'Query parameter is required' (입력 검증 실패)
}
```

---

#### `stripHtmlTags(html)`

HTML 태그를 제거하고 순수 텍스트를 반환합니다.

**Parameters**:
- `html: string`

**Returns**: `string`

**Example**:
```typescript
const cleanTitle = stripHtmlTags('<b>해리포터</b>와 마법사의 돌');
// '해리포터와 마법사의 돌'
```

---

#### `cleanBookData(book)`

네이버 책 정보에서 HTML 태그를 제거합니다.

**Parameters**:
- `book: NaverBook`

**Returns**: `NaverBook`

---

#### API Route: `/api/search-books`

**Method**: `GET`

**Query Parameters**:
- `query` (required): 검색어
- `display` (optional): 검색 결과 개수 (1-100)
- `start` (optional): 검색 시작 위치 (1-1000)
- `sort` (optional): 정렬 방법 (`sim` | `date`)

**Example Request**:
```
GET /api/search-books?query=해리포터&display=10&sort=sim
```

**Response**:
```json
{
  "lastBuildDate": "Mon, 16 Oct 2025 10:00:00 +0900",
  "total": 235,
  "start": 1,
  "display": 10,
  "items": [
    {
      "title": "해리포터와 마법사의 돌",
      "author": "J.K. 롤링",
      "publisher": "문학수첩",
      "description": "마법의 세계로 떠나는 첫 번째 이야기",
      "isbn": "9788983920683",
      "image": "https://...",
      "link": "https://...",
      "pubdate": "19990101",
      "discount": "15000"
    }
  ]
}
```

**Error Responses**:
```json
// 400 Bad Request
{ "error": "Query parameter is required" }

// 500 Internal Server Error
{ "error": "Server configuration error. Please contact administrator." }

// 429 Too Many Requests
{ "error": "Failed to fetch from Naver Book API", "details": "Rate limit exceeded" }
```

---

### OpenAI API (AI Matching)

**위치**: `src/app/api/admin/matching/route.ts`

OpenAI GPT-4를 사용하여 참가자 간 AI 매칭을 수행합니다.

#### API Route: `/api/admin/matching`

**Method**: `POST`

**Request Body**:
```typescript
{
  cohortId: string;  // 기수 ID
  date: string;      // 매칭 대상 날짜 (YYYY-MM-DD, 보통 어제)
}
```

**Response**:
```typescript
{
  success: boolean;
  data: DailyMatchingEntry; // 매칭 결과
}
```

**Example Request**:
```typescript
const response = await fetch('/api/admin/matching', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    cohortId: 'cohort1',
    date: '2025-10-15',
  }),
});

const result = await response.json();
console.log('Matching result:', result.data);
```

---

#### AI 매칭 프로세스

```
1. 어제 독서 인증한 참가자 조회
       ↓
2. 참가자별 독서 데이터 수집
   - 책 제목, 저자, 리뷰
   - 오늘의 질문 및 답변
       ↓
3. OpenAI GPT-4 API 호출
   - Model: 'gpt-4' 또는 'gpt-4-turbo'
   - 프롬프트에 참가자 데이터 포함
       ↓
4. AI 응답 파싱 (JSON 형식)
   - 참가자별 similar/opposite 매칭
   - 매칭 이유 설명
       ↓
5. Firestore에 저장
   - cohorts/{cohortId}/dailyFeaturedParticipants/{date}
       ↓
6. 클라이언트에 결과 반환
```

---

#### OpenAI 요청 예시

**Prompt Template**:
```typescript
const systemPrompt = `당신은 독서 소셜클럽의 AI 매칭 전문가입니다.
참가자들의 독서 데이터를 분석하여 서로 비슷한 성향의 참가자 2명(similar)과
반대 성향의 참가자 1명(opposite)을 매칭해주세요.

매칭 기준:
- similar: 같은 장르, 비슷한 독서 취향, 비슷한 리뷰 톤
- opposite: 다른 장르, 상반된 독서 스타일, 다른 관점

응답 형식 (JSON):
{
  "assignments": {
    "participant1": {
      "similar": ["participant2", "participant3"],
      "opposite": ["participant4"],
      "reasons": {
        "similar": "같은 판타지 장르를 선호하며 리뷰 스타일이 비슷합니다.",
        "opposite": "인문학을 선호하여 독서 방향성이 상반됩니다."
      }
    }
  }
}
`;

const userPrompt = JSON.stringify(participantsData);

const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ],
  temperature: 0.7,
  response_format: { type: 'json_object' },
});
```

---

#### 매칭 결과 구조

```typescript
interface DailyMatchingEntry {
  assignments: Record<string, DailyParticipantAssignment>;
}

interface DailyParticipantAssignment {
  similar: string[];     // 비슷한 성향 참가자 ID 배열 (2명)
  opposite: string[];    // 반대 성향 참가자 ID 배열 (1명)
  reasons?: {
    similar?: string;    // similar 매칭 이유
    opposite?: string;   // opposite 매칭 이유
    summary?: string;    // 전체 매칭 요약
  };
}
```

---

#### 관련 API Routes

**매칭 미리보기** (`GET /api/admin/matching/preview`):
- Firestore에 저장하지 않고 매칭 결과만 반환
- 테스트용

**매칭 확정** (`POST /api/admin/matching/confirm`):
- 미리보기 결과를 Firestore에 저장
- 실제 운영에 반영

**매칭 상태 조회** (`GET /api/admin/matching/status`):
- 특정 날짜의 매칭 결과 존재 여부 확인

---

## Next.js API Routes

### 주요 API 엔드포인트

| 엔드포인트 | Method | 설명 |
|------------|--------|------|
| `/api/search-books` | GET | 네이버 책 검색 프록시 |
| `/api/admin/matching` | POST | AI 매칭 실행 |
| `/api/admin/matching/preview` | GET | 매칭 미리보기 |
| `/api/admin/matching/confirm` | POST | 매칭 확정 |
| `/api/admin/matching/status` | GET | 매칭 상태 조회 |
| `/api/admin/add-backdated-submission` | POST | 과거 날짜 독서 인증 추가 (관리자) |
| `/api/notices/[noticeId]` | GET/PUT/DELETE | 공지사항 개별 작업 |

### 인증 확인 패턴

```typescript
// API Route에서 관리자 권한 확인
import { getAuth } from 'firebase-admin/auth';

export async function POST(request: NextRequest) {
  // 1. Authorization 헤더에서 토큰 추출
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. 토큰 검증
  const decodedToken = await getAuth().verifyIdToken(token);

  // 3. Custom Claims 확인
  if (decodedToken.isAdministrator !== true) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 4. 권한 확인 완료, 작업 수행
  // ...
}
```

---

## Error Handling

### 에러 타입

#### Firebase Errors

```typescript
try {
  await createParticipant(data);
} catch (error: any) {
  if (error.code === 'permission-denied') {
    console.error('권한이 없습니다.');
  } else if (error.code === 'not-found') {
    console.error('문서를 찾을 수 없습니다.');
  } else {
    console.error('Firebase 에러:', error.message);
  }
}
```

**주요 Firebase 에러 코드**:
- `permission-denied`: Security Rules 위반
- `not-found`: 문서가 존재하지 않음
- `already-exists`: 문서가 이미 존재
- `unavailable`: 네트워크 오류
- `resource-exhausted`: 할당량 초과

---

#### Phone Auth Errors

```typescript
// src/constants/auth.ts
export const FIREBASE_ERROR_CODE_MAP: Record<string, string> = {
  'auth/invalid-phone-number': '유효하지 않은 전화번호 형식입니다.',
  'auth/too-many-requests': '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.',
  'auth/invalid-verification-code': '인증 코드가 올바르지 않습니다.',
  'auth/code-expired': '인증 코드가 만료되었습니다. 다시 시도해주세요.',
  'auth/quota-exceeded': '일일 SMS 전송 한도를 초과했습니다.',
  'auth/network-request-failed': '네트워크 연결을 확인해주세요.',
};
```

---

#### API Route Errors

```typescript
// 표준 HTTP 상태 코드
return NextResponse.json(
  { error: 'Not Found' },
  { status: 404 }
);

// 상태 코드별 의미
// 400: Bad Request (입력 검증 실패)
// 401: Unauthorized (인증 실패)
// 403: Forbidden (권한 없음)
// 404: Not Found (리소스 없음)
// 429: Too Many Requests (Rate Limit)
// 500: Internal Server Error (서버 에러)
```

---

### 에러 처리 베스트 프랙티스

```typescript
import { logger } from '@/lib/logger';

async function safeApiCall() {
  try {
    const data = await riskyOperation();
    return { success: true, data };
  } catch (error) {
    // 1. 에러 로깅 (프로덕션에서 Sentry로 전송 가능)
    logger.error('Operation failed:', error);

    // 2. 사용자 친화적 메시지
    const userMessage = error instanceof Error
      ? error.message
      : '알 수 없는 오류가 발생했습니다.';

    // 3. 에러 객체 반환
    return { success: false, error: userMessage };
  }
}
```

---

## Rate Limiting

### Naver API Rate Limits

- **일일 한도**: 25,000 요청/일
- **초당 한도**: 10 요청/초

**대응 전략**:
```typescript
// 캐싱으로 요청 수 감소
const response = await fetch(url, {
  next: {
    revalidate: 3600, // 1시간 캐싱
  },
});
```

---

### Firebase Firestore Quotas

- **읽기**: 50,000 reads/day (무료 플랜)
- **쓰기**: 20,000 writes/day (무료 플랜)
- **문서 크기**: 최대 1MB/문서

**최적화 전략**:
```typescript
// 1. React Query 캐싱으로 읽기 감소
staleTime: 60 * 1000, // 60초 동안 재요청 안 함

// 2. 배치 쓰기로 쓰기 작업 최소화
import { writeBatch } from 'firebase/firestore';

const batch = writeBatch(db);
// ... 여러 작업 추가
await batch.commit(); // 한 번에 커밋
```

---

### OpenAI API Rate Limits

- **모델별 한도**: GPT-4는 분당 3 요청 (Tier 1)
- **토큰 한도**: 분당 10,000 토큰

**대응 전략**:
```typescript
// 비동기 작업으로 처리 (백그라운드)
// 사용자는 즉시 응답 받고, AI 매칭은 백그라운드에서 처리
```

---

## 요약 (Summary)

이 API Reference는 필립앤소피 플랫폼의 모든 API 작업을 포괄합니다:

### ✅ Firebase Client SDK
- **7개 모듈**: Cohorts, Participants, Submissions, Notices, Messages, Storage, Auth
- **CRUD 작업**: 생성, 조회, 업데이트, 삭제
- **실시간 구독**: onSnapshot을 통한 실시간 데이터 동기화

### 🌐 External APIs
- **Naver Book Search**: 책 검색 및 메타데이터 자동 완성
- **OpenAI GPT-4**: AI 기반 참가자 매칭

### 🛣️ Next.js API Routes
- **프록시 서버**: 클라이언트 API 키 보호
- **관리자 전용 엔드포인트**: 권한 기반 접근 제어

### 🔒 보안 및 에러 처리
- **4계층 보안**: 입력 검증 → API 검증 → Security Rules → 암호화
- **포괄적 에러 처리**: Firebase, Phone Auth, HTTP 에러 처리

---

*이 문서는 필립앤소피 프로젝트의 API에 대한 단일 권위 문서입니다.*

**관련 문서**:
- [System Architecture](../architecture/system-architecture.md)
- [Development Setup & Workflow Guide](../development/setup-guide.md)
- [Database Optimization](../optimization/database.md)
