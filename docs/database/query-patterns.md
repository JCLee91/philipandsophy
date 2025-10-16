# Firestore 쿼리 패턴 가이드

**최종 업데이트**: 2025년 10월 16일
**문서 버전**: v1.0

---

## 📋 목차

1. [개요](#개요)
2. [기본 쿼리 패턴](#기본-쿼리-패턴)
3. [실시간 구독 패턴](#실시간-구독-패턴)
4. [React Query 통합](#react-query-통합)
5. [성능 최적화 패턴](#성능-최적화-패턴)
6. [트랜잭션 패턴](#트랜잭션-패턴)
7. [페이지네이션 패턴](#페이지네이션-패턴)

---

## 개요

이 문서는 projectpns 프로젝트에서 사용하는 Firestore 쿼리 패턴과 모범 사례를 정리합니다.

### 쿼리 설계 원칙

1. **단순함 우선**: 복잡한 쿼리보다 단순한 쿼리 여러 개
2. **인덱스 최적화**: 복합 쿼리는 반드시 인덱스 생성
3. **실시간 구독 최소화**: 필요한 경우에만 `onSnapshot` 사용
4. **클라이언트 필터링 활용**: 간단한 필터링은 클라이언트에서 처리
5. **캐싱 전략**: React Query와 결합하여 네트워크 요청 최소화

---

## 기본 쿼리 패턴

### 1. 단일 문서 조회

```typescript
import { getParticipantById } from '@/lib/firebase';

// 참가자 ID로 조회
const participant = await getParticipantById('participant123');

if (participant) {
  console.log('참가자 이름:', participant.name);
} else {
  console.log('참가자를 찾을 수 없습니다');
}
```

### 2. 조건부 쿼리 (where)

```typescript
import { collection, query, where, getDocs } from 'firebase/firestore';
import { getDb } from '@/lib/firebase';

// 전화번호로 참가자 조회
const db = getDb();
const q = query(
  collection(db, 'participants'),
  where('phoneNumber', '==', '01012345678')
);

const snapshot = await getDocs(q);
const participants = snapshot.docs.map(doc => ({
  id: doc.id,
  ...doc.data()
}));
```

### 3. 정렬 쿼리 (orderBy)

```typescript
import { getParticipantsByCohort } from '@/lib/firebase';

// 기수별 참가자 조회 (생성일 오름차순)
const participants = await getParticipantsByCohort('cohort1');
```

**내부 구현**:
```typescript
const q = query(
  collection(db, 'participants'),
  where('cohortId', '==', cohortId),
  orderBy('createdAt', 'asc')
);
```

### 4. 복합 쿼리 (where + orderBy)

```typescript
import { getSubmissionsByParticipant } from '@/lib/firebase';

// 참가자별 제출물 조회 (최신순)
const submissions = await getSubmissionsByParticipant('participant123');
```

**내부 구현**:
```typescript
const q = query(
  collection(db, 'reading_submissions'),
  where('participantId', '==', participantId),
  orderBy('submittedAt', 'desc')
);
```

---

## 실시간 구독 패턴

### 1. 메시지 실시간 구독

```typescript
import { subscribeToMessages, getConversationId } from '@/lib/firebase';

const conversationId = getConversationId('participant1', 'participant2');

// 실시간 구독 시작
const unsubscribe = subscribeToMessages(conversationId, (messages) => {
  console.log('새 메시지:', messages);
});

// 컴포넌트 언마운트 시 구독 해제
useEffect(() => {
  return () => unsubscribe();
}, []);
```

**내부 구현** (`lib/firebase/messages.ts`):
```typescript
export function subscribeToMessages(
  conversationId: string,
  callback: (messages: DirectMessage[]) => void
): () => void {
  const db = getDb();
  const q = query(
    collection(db, COLLECTIONS.MESSAGES),
    where('conversationId', '==', conversationId),
    orderBy('createdAt', 'asc')
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as DirectMessage[];
    callback(messages);
  });

  return unsubscribe;
}
```

### 2. 오늘 인증한 참가자 실시간 구독

```typescript
import { subscribeTodayVerified } from '@/lib/firebase';

const unsubscribe = subscribeTodayVerified('cohort1', (verifiedIds) => {
  console.log('오늘 인증 완료한 참가자 ID:', verifiedIds);
  // UI 업데이트 (예: 아바타 애니메이션)
});
```

**내부 구현** (`lib/firebase/submissions.ts`):
```typescript
export function subscribeTodayVerified(
  participationCode: string,
  callback: (verifiedIds: string[]) => void
): () => void {
  const db = getDb();
  const today = format(new Date(), 'yyyy-MM-dd');

  const q = query(
    collection(db, COLLECTIONS.READING_SUBMISSIONS),
    where('participationCode', '==', participationCode),
    where('submissionDate', '==', today)
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const verifiedIds = snapshot.docs.map((doc) => doc.data().participantId);
    callback(verifiedIds);
  });

  return unsubscribe;
}
```

### 3. React 컴포넌트에서 실시간 구독

```typescript
'use client';

import { useEffect, useState } from 'react';
import { subscribeToMessages, DirectMessage } from '@/lib/firebase';

export function MessageList({ conversationId }: { conversationId: string }) {
  const [messages, setMessages] = useState<DirectMessage[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToMessages(conversationId, (newMessages) => {
      setMessages(newMessages);
    });

    return () => unsubscribe(); // 클린업
  }, [conversationId]);

  return (
    <div>
      {messages.map((msg) => (
        <div key={msg.id}>{msg.content}</div>
      ))}
    </div>
  );
}
```

---

## React Query 통합

### 1. 기본 React Query 훅

```typescript
// hooks/use-participants.ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { getParticipantsByCohort } from '@/lib/firebase';

export function useParticipants(cohortId: string) {
  return useQuery({
    queryKey: ['participants', cohortId],
    queryFn: () => getParticipantsByCohort(cohortId),
    staleTime: 5 * 60 * 1000, // 5분 (정적 데이터)
    cacheTime: 10 * 60 * 1000, // 10분
  });
}
```

**사용 예시**:
```typescript
'use client';

import { useParticipants } from '@/hooks/use-participants';

export function ParticipantList({ cohortId }: { cohortId: string }) {
  const { data: participants, isLoading, error } = useParticipants(cohortId);

  if (isLoading) return <div>로딩 중...</div>;
  if (error) return <div>에러 발생</div>;

  return (
    <ul>
      {participants?.map((p) => (
        <li key={p.id}>{p.name}</li>
      ))}
    </ul>
  );
}
```

### 2. 실시간 구독 + React Query

```typescript
// hooks/use-messages.ts
'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getMessagesByConversation, subscribeToMessages } from '@/lib/firebase';

export function useMessages(conversationId: string) {
  const queryClient = useQueryClient();

  // 초기 데이터 로드
  const query = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => getMessagesByConversation(conversationId),
    staleTime: 0, // 실시간 데이터
  });

  // 실시간 구독으로 자동 업데이트
  useEffect(() => {
    const unsubscribe = subscribeToMessages(conversationId, (messages) => {
      queryClient.setQueryData(['messages', conversationId], messages);
    });

    return () => unsubscribe();
  }, [conversationId, queryClient]);

  return query;
}
```

### 3. 캐시 무효화 (Mutation 후)

```typescript
// hooks/use-submit-reading.ts
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createSubmission } from '@/lib/firebase';

export function useSubmitReading() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSubmission,
    onSuccess: (_, variables) => {
      // 제출 후 관련 쿼리 캐시 무효화
      queryClient.invalidateQueries({
        queryKey: ['submissions', variables.participantId],
      });
      queryClient.invalidateQueries({
        queryKey: ['today-verified'],
      });
    },
  });
}
```

---

## 성능 최적화 패턴

### 1. 쿼리 결과 캐싱 (React Query)

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

### 2. 클라이언트 필터링

```typescript
// 서버에서 전체 데이터 가져오기
const participants = await getParticipantsByCohort('cohort1');

// 클라이언트에서 필터링 (간단한 조건)
const adminParticipants = participants.filter(p => p.isAdministrator);
const activeParticipants = participants.filter(p => p.lastActivityAt); // 활동 기록 있음
```

**언제 클라이언트 필터링을 사용할까?**
- ✅ 데이터 양이 적을 때 (< 100개)
- ✅ 이미 가져온 데이터를 재사용할 때
- ✅ 복잡한 인덱스를 만들기 어려울 때
- ❌ 데이터 양이 많을 때 (> 1000개)
- ❌ 네트워크 비용이 클 때

### 3. 선택적 구독 (포커스 기반)

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useIsDocumentVisible } from 'react-use';
import { subscribeToMessages } from '@/lib/firebase';

export function useMessagesWithFocus(conversationId: string) {
  const [messages, setMessages] = useState([]);
  const isVisible = useIsDocumentVisible(); // 탭 포커스 감지

  useEffect(() => {
    if (!isVisible) return; // 포커스 없으면 구독 중지

    const unsubscribe = subscribeToMessages(conversationId, setMessages);
    return () => unsubscribe();
  }, [conversationId, isVisible]);

  return messages;
}
```

### 4. 배치 읽기 (Multiple Documents)

```typescript
import { getDoc, doc, getFirestore } from 'firebase/firestore';

// ❌ 나쁜 예: N+1 쿼리
for (const id of participantIds) {
  const participant = await getParticipantById(id);
  // ...
}

// ✅ 좋은 예: 병렬 요청
const db = getFirestore();
const participants = await Promise.all(
  participantIds.map(id => getDoc(doc(db, 'participants', id)))
);
```

---

## 트랜잭션 패턴

### 1. 책 정보 업데이트 (원자적 읽기-수정-쓰기)

```typescript
// lib/firebase/participants.ts
export async function updateParticipantBookInfo(
  participantId: string,
  newBookTitle: string,
  newBookAuthor?: string,
  newBookCoverUrl?: string
): Promise<void> {
  const db = getDb();
  const docRef = doc(db, COLLECTIONS.PARTICIPANTS, participantId);

  // 트랜잭션으로 원자성 보장
  await runTransaction(db, async (transaction) => {
    const docSnap = await transaction.get(docRef);

    if (!docSnap.exists()) {
      throw new Error('Participant not found');
    }

    const participant = docSnap.data() as Participant;
    const currentBookTitle = participant.currentBookTitle;
    const bookHistory = participant.bookHistory || [];

    // 책 제목이 같으면 메타데이터만 업데이트
    if (currentBookTitle === newBookTitle) {
      transaction.update(docRef, {
        currentBookAuthor: newBookAuthor || undefined,
        currentBookCoverUrl: newBookCoverUrl || undefined,
        updatedAt: Timestamp.now(),
      });
      return;
    }

    // 이전 책 종료 처리
    const updatedHistory = bookHistory.map((entry, index) => {
      if (index === bookHistory.length - 1 && entry.endedAt === null) {
        return { ...entry, endedAt: Timestamp.now() };
      }
      return entry;
    });

    // 새 책 추가
    updatedHistory.push({
      title: newBookTitle,
      startedAt: Timestamp.now(),
      endedAt: null,
    });

    // 트랜잭션 업데이트
    transaction.update(docRef, {
      currentBookTitle: newBookTitle,
      currentBookAuthor: newBookAuthor || undefined,
      currentBookCoverUrl: newBookCoverUrl || undefined,
      bookHistory: updatedHistory,
      updatedAt: Timestamp.now(),
    });
  });
}
```

### 2. 재시도 로직 (Exponential Backoff)

```typescript
const MAX_RETRIES = 3;
let retries = 0;

while (retries < MAX_RETRIES) {
  try {
    await runTransaction(db, async (transaction) => {
      // 트랜잭션 로직
    });
    return; // 성공 시 종료
  } catch (error) {
    retries++;
    if (retries >= MAX_RETRIES) {
      logger.error('Transaction failed after retries:', error);
      throw error;
    }
    // Exponential backoff
    await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 100));
  }
}
```

---

## 페이지네이션 패턴

### 1. Cursor 기반 페이지네이션

```typescript
import { query, collection, orderBy, startAfter, limit, getDocs } from 'firebase/firestore';
import { getDb } from '@/lib/firebase';

export async function getSubmissionsPaginated(
  participantId: string,
  pageSize: number = 20,
  lastDocument?: any // 이전 페이지의 마지막 문서
) {
  const db = getDb();
  let q = query(
    collection(db, 'reading_submissions'),
    where('participantId', '==', participantId),
    orderBy('submittedAt', 'desc'),
    limit(pageSize)
  );

  // 다음 페이지 로드 시
  if (lastDocument) {
    q = query(q, startAfter(lastDocument));
  }

  const snapshot = await getDocs(q);
  const submissions = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  // 마지막 문서 반환 (다음 페이지 로드용)
  const lastDoc = snapshot.docs[snapshot.docs.length - 1];

  return {
    submissions,
    lastDocument: lastDoc,
    hasMore: submissions.length === pageSize,
  };
}
```

### 2. React Query Infinite Query

```typescript
// hooks/use-submissions-infinite.ts
'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { getSubmissionsPaginated } from '@/lib/firebase';

export function useSubmissionsInfinite(participantId: string) {
  return useInfiniteQuery({
    queryKey: ['submissions-infinite', participantId],
    queryFn: ({ pageParam = undefined }) =>
      getSubmissionsPaginated(participantId, 20, pageParam),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.lastDocument : undefined,
  });
}
```

**사용 예시**:
```typescript
'use client';

import { useSubmissionsInfinite } from '@/hooks/use-submissions-infinite';

export function SubmissionList({ participantId }: { participantId: string }) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useSubmissionsInfinite(participantId);

  return (
    <div>
      {data?.pages.map((page) =>
        page.submissions.map((submission) => (
          <div key={submission.id}>{submission.bookTitle}</div>
        ))
      )}
      {hasNextPage && (
        <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
          {isFetchingNextPage ? '로딩 중...' : '더 보기'}
        </button>
      )}
    </div>
  );
}
```

---

## 쿼리 성능 측정

### 1. 쿼리 실행 시간 측정

```typescript
import { logger } from '@/lib/logger';

async function measureQuery(queryName: string, queryFn: () => Promise<any>) {
  const startTime = performance.now();
  const result = await queryFn();
  const endTime = performance.now();

  logger.info(`[Query] ${queryName}: ${(endTime - startTime).toFixed(2)}ms`);
  return result;
}

// 사용 예시
const participants = await measureQuery(
  'getParticipantsByCohort',
  () => getParticipantsByCohort('cohort1')
);
```

### 2. Firebase Console 쿼리 분석

Firebase Console → Firestore → Usage 탭에서 다음 지표 확인:
- **Read/Write 횟수**: 과도한 읽기/쓰기 감지
- **Slow queries**: 느린 쿼리 식별
- **Missing indexes**: 인덱스 누락 경고

---

## 관련 문서

- [데이터베이스 스키마](./schema.md)
- [데이터베이스 최적화 가이드](../optimization/database.md)
- [React Query 설정](../setup/react-query.md)

---

**최종 업데이트**: 2025년 10월 16일
**문서 위치**: `docs/database/query-patterns.md`
**문서 버전**: v1.0

*이 문서는 projectpns 프로젝트의 Firestore 쿼리 패턴에 대한 유일한 권위 있는 문서입니다.*
