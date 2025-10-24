# 기수별 운영 시스템 구현 계획

**Last Updated**: 2025-10-24
**Status**: ✅ Completed (Ready for Testing)
**Branch**: `feature/multi-cohort-support`

## 📋 목차

1. [개요](#개요)
2. [현재 문제점](#현재-문제점)
3. [목표](#목표)
4. [Phase 1: Firestore 스키마 설계](#phase-1-firestore-스키마-설계)
5. [Phase 2: Firebase 유틸리티 구현](#phase-2-firebase-유틸리티-구현)
6. [Phase 3: 관리자 기수 생성 UI](#phase-3-관리자-기수-생성-ui)
7. [Phase 4: Daily Questions 관리 UI](#phase-4-daily-questions-관리-ui)
8. [Phase 5: 동적 로딩 함수](#phase-5-동적-로딩-함수)
9. [Phase 6: 하드코딩 제거](#phase-6-하드코딩-제거)
10. [Phase 7: 테스트 & 검증](#phase-7-테스트--검증)

---

## 개요

현재 필립앤소피는 1기 운영에 최적화되어 있으며, 많은 부분이 하드코딩되어 있습니다. 2기 시작을 앞두고 기수별로 독립적으로 운영할 수 있는 시스템으로 전환합니다.

---

## 현재 문제점

### 1. 하드코딩된 날짜

**파일**: `src/constants/daily-questions.ts`

```typescript
// ❌ 문제: 1기 날짜에 고정
const PROGRAM_START_DATE = new Date(2025, 9, 11); // 2025-10-11
const DAILY_QUESTIONS_SCHEDULE = [
  // Oct 11
  { category: '생활 패턴', question: '...' },
  // Oct 12 ~ Oct 24
  // ... 14개 질문
];
```

**영향**:
- 2기 시작 시 질문 순서가 틀어짐
- 날짜 범위가 다르면 작동 안 함

### 2. 하드코딩된 기수 ID (스크립트)

**파일**: 9개 스크립트

```typescript
// ❌ 문제: 기수 1에 고정
const COHORT_ID = '1';
const TARGET_DATE = '2025-10-20';
```

**영향 받는 파일**:
- `src/scripts/random-matching.ts`
- `src/scripts/add-backdated-submissions-yesterday.ts`
- `src/scripts/execute-backdated-submissions.ts`
- 기타 7개 스크립트

### 3. Auth ↔ DB 연동 타이밍 이슈

**현재 흐름**:
```
1. 사용자 핸드폰 인증 → Firebase Auth User 생성 (uid)
2. ⚠️ 하지만 Firestore participants에 firebaseUid 필드 없음
3. AuthContext가 5번 재시도하지만 실패
4. 관리자가 수동으로 UID 업데이트 필요
```

**문제**:
- 참가자가 로그인할 수 없음
- 관리자가 매번 수동 처리 필요

---

## 목표

### 1. 관리자가 기수 생성 시 모든 것을 설정
- 기수명, 날짜 범위
- 참가자 일괄 추가 (CSV/수동)
- Daily Questions 14개 설정

### 2. 참가자는 핸드폰 번호만 입력
- 자동으로 해당 기수 배정
- 해당 기수의 날짜/질문 자동 적용

### 3. UID 자동 연결
- 첫 로그인 시 자동으로 firebaseUid 연결
- 관리자 개입 불필요

---

## Phase 1: Firestore 스키마 설계

### ✅ 체크리스트

- [x] 1-1. Cohort 인터페이스에 `programStartDate` 필드 추가
- [x] 1-2. DailyQuestion 인터페이스 정의
- [x] 1-3. Participant 인터페이스에 `firebaseUid: string | null` 추가
- [x] 1-4. 타입 정의 파일 업데이트 완료

### 1-1. Cohort 스키마 개선

**파일**: `src/types/database.ts`

```typescript
export interface Cohort {
  id: string;
  name: string;                    // 기존: "1기", "2기"
  startDate: string;               // 기존: "2025-10-11"
  endDate: string;                 // 기존: "2025-10-24"
  programStartDate: string;        // 🆕 Daily Questions 시작일
  isActive: boolean;               // 기존
  createdAt: Timestamp;            // 기존
  updatedAt: Timestamp;            // 기존

  // 🆕 선택 필드 (계산 가능)
  participantCount?: number;       // 참가자 수
  totalDays?: number;              // 프로그램 일수
}
```

**변경 사항**:
- `programStartDate` 추가: Daily Questions의 Day 1 시작일

### 1-2. DailyQuestion 서브컬렉션

**파일**: `src/types/database.ts`

```typescript
export interface DailyQuestion {
  id: string;                      // Firestore 문서 ID (dayNumber와 동일)
  dayNumber: number;               // 1, 2, 3, ..., 14
  date: string;                    // "2025-10-11" (자동 계산)
  category: string;                // "생활 패턴", "가치관 & 삶" 등
  question: string;                // "아침형 인간인가요, 저녁형 인간인가요?"
  order: number;                   // 정렬용 (dayNumber와 동일)
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Firestore 경로**:
```
cohorts/{cohortId}/daily_questions/{dayNumber}
```

**예시**:
```
cohorts/1/daily_questions/1
{
  id: "1",
  dayNumber: 1,
  date: "2025-10-11",
  category: "생활 패턴",
  question: "아침형 인간인가요, 저녁형 인간인가요?",
  order: 1,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### 1-3. Participant 스키마 (UID 연결)

**파일**: `src/types/database.ts`

```typescript
export interface Participant {
  id: string;
  name: string;
  phone: string;
  cohortId: string;
  firebaseUid: string | null;     // 🆕 null 허용 (첫 로그인 전)
  isAdministrator: boolean;
  isSuperAdmin?: boolean;
  role: 'admin' | 'participant';
  // ... 기존 필드들
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**변경 사항**:
- `firebaseUid: string | null` - null 허용으로 변경
- 첫 로그인 시 자동으로 uid 채워짐

---

## Phase 2: Firebase 유틸리티 구현

### ✅ 체크리스트

- [x] 2-1. `getParticipantByPhoneNumber()` 함수 이미 구현됨 (68번 줄)
- [x] 2-2. `linkFirebaseUid()` 함수 이미 구현됨 (124번 줄)
- [x] 2-3. PhoneAuthCard에서 UID 자동 연결 로직 이미 구현됨 (214-258번 줄)
- [x] 2-4. 에러 핸들링 이미 구현됨

### 2-1. 핸드폰 번호로 참가자 조회

**파일**: `src/lib/firebase/participants.ts`

```typescript
import { collection, query, where, limit, getDocs } from 'firebase/firestore';
import { getDb } from './client';
import { Participant } from '@/types/database';
import { logger } from '@/lib/logger';

/**
 * 핸드폰 번호로 참가자 조회
 *
 * @param phone - 핸드폰 번호 (E.164 또는 로컬 포맷)
 * @returns Participant 또는 null
 */
export async function getParticipantByPhone(
  phone: string
): Promise<Participant | null> {
  try {
    const db = getDb();
    const q = query(
      collection(db, 'participants'),
      where('phone', '==', phone),
      limit(1)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      logger.warn('Participant not found for phone:', phone);
      return null;
    }

    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as Participant;

  } catch (error) {
    logger.error('Failed to get participant by phone:', error);
    throw error;
  }
}
```

### 2-2. Firebase UID 연결

**파일**: `src/lib/firebase/participants.ts`

```typescript
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Firebase UID 연결 (자동)
 *
 * @param participantId - 참가자 문서 ID
 * @param firebaseUid - Firebase Auth UID
 */
export async function linkFirebaseUid(
  participantId: string,
  firebaseUid: string
): Promise<void> {
  try {
    const db = getDb();
    await updateDoc(doc(db, 'participants', participantId), {
      firebaseUid,
      updatedAt: serverTimestamp(),
    });

    logger.info('Firebase UID 연결 완료', { participantId, firebaseUid });

  } catch (error) {
    logger.error('Failed to link Firebase UID:', error);
    throw error;
  }
}
```

### 2-3. PhoneAuthCard 수정

**파일**: `src/features/auth/components/PhoneAuthCard.tsx`

**현재 코드 (handleVerify 함수)**:
```typescript
const handleVerify = async () => {
  try {
    setIsVerifying(true);
    const userCredential = await confirmSmsCode(confirmationResult!, code);
    // ✅ 로그인 성공
  } catch (error) {
    // 에러 처리
  }
};
```

**수정 후**:
```typescript
import { getParticipantByPhone, linkFirebaseUid } from '@/lib/firebase/participants';

const handleVerify = async () => {
  try {
    setIsVerifying(true);

    // 1. 인증 코드 확인
    const userCredential = await confirmSmsCode(confirmationResult!, code);
    const { user } = userCredential;

    // 2. 🆕 핸드폰 번호로 참가자 찾기
    const participant = await getParticipantByPhone(phoneNumber);

    if (!participant) {
      throw new Error('등록되지 않은 핸드폰 번호입니다. 관리자에게 문의하세요.');
    }

    // 3. 🆕 firebaseUid가 없으면 자동 연결
    if (!participant.firebaseUid) {
      await linkFirebaseUid(participant.id, user.uid);
      logger.info('UID 자동 연결 완료', {
        participantId: participant.id,
        phone: phoneNumber,
        uid: user.uid,
      });
    }

    // 4. AuthContext가 자동으로 participant 로드
    // (onAuthStateChanged 트리거)

  } catch (error) {
    logger.error('인증 실패:', error);
    setError(error instanceof Error ? error.message : '인증에 실패했습니다.');
  } finally {
    setIsVerifying(false);
  }
};
```

---

## Phase 3: 관리자 기수 생성 UI

### ✅ 체크리스트

- [x] 3-1. 기수 생성 페이지 UI 구현 (`/datacntr/cohorts/new`)
- [x] 3-2. 참가자 수동 입력 폼
- [x] 3-3. CSV 업로드 기능
- [x] 3-4. CSV 템플릿 다운로드
- [x] 3-5. 유효성 검사 (중복 핸드폰 확인)
- [x] 3-6. 기수 생성 API 엔드포인트 (POST /api/datacntr/cohorts)

### 3-1. UI 레이아웃

**경로**: `/datacntr/cohorts/new`

**컴포넌트 구조**:
```
CohortCreatePage
├─ CohortBasicInfoForm
│  ├─ 기수명 입력
│  ├─ 시작일/종료일 선택
│  └─ 프로그램 시작일 선택
│
├─ ParticipantBulkAddForm
│  ├─ 수동 입력 테이블
│  ├─ CSV 업로드
│  └─ CSV 템플릿 다운로드
│
└─ DailyQuestionsForm
   ├─ 1기 복사 버튼
   ├─ 직접 입력
   └─ 나중에 설정
```

**UI 스크린샷** (텍스트 형식):
```
┌────────────────────────────────────────────────┐
│ 데이터센터 > 기수 관리 > 새 기수 생성           │
├────────────────────────────────────────────────┤
│                                                │
│ 기본 정보                                       │
│ ┌────────────────────────────────────────────┐ │
│ │ 기수명 *                                    │ │
│ │ [2기_____________________________]         │ │
│ │                                            │ │
│ │ 프로그램 기간 *                             │ │
│ │ 시작일: [2025-11-01 📅]                    │ │
│ │ 종료일: [2025-11-14 📅]                    │ │
│ │                                            │ │
│ │ Daily Questions 시작일 *                   │ │
│ │ [2025-11-01 📅]                            │ │
│ │ ℹ️ 프로그램 시작일과 동일하게 설정하는 것을    │ │
│ │    권장합니다.                               │ │
│ └────────────────────────────────────────────┘ │
│                                                │
│ 참가자 추가                                     │
│ ┌────────────────────────────────────────────┐ │
│ │ [수동 입력] [CSV 업로드] [템플릿 다운로드]   │ │
│ │                                            │ │
│ │ ┌────────────────────────────────────────┐ │ │
│ │ │ 이름      핸드폰번호         역할       │ │ │
│ │ ├────────────────────────────────────────┤ │ │
│ │ │ 홍길동   010-1234-5678   participant   │ │ │
│ │ │ 김철수   010-8765-4321   participant   │ │ │
│ │ │ [+ 행 추가]                             │ │ │
│ │ └────────────────────────────────────────┘ │ │
│ │                                            │ │
│ │ 총 2명                                      │ │
│ └────────────────────────────────────────────┘ │
│                                                │
│ Daily Questions 설정                           │
│ ┌────────────────────────────────────────────┐ │
│ │ ○ 1기 질문 복사                             │ │
│ │ ○ 직접 입력                                 │ │
│ │ ○ 나중에 설정                               │ │
│ └────────────────────────────────────────────┘ │
│                                                │
│                        [취소] [생성하기]        │
└────────────────────────────────────────────────┘
```

### 3-2. CSV 템플릿

**파일명**: `participants_template.csv`

```csv
이름,핸드폰번호,역할
홍길동,010-1234-5678,participant
김철수,010-8765-4321,participant
이영희,010-1111-2222,admin
```

**주의사항**:
- 첫 행은 헤더 (이름,핸드폰번호,역할)
- 역할: `participant` 또는 `admin`
- 핸드폰 번호: 하이픈 포함/미포함 모두 허용

### 3-3. 컴포넌트 코드

**파일**: `src/app/datacntr/cohorts/new/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

export default function CohortCreatePage() {
  const router = useRouter();
  const { toast } = useToast();

  // 기본 정보
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [programStartDate, setProgramStartDate] = useState('');

  // 참가자 목록
  const [participants, setParticipants] = useState<{
    name: string;
    phone: string;
    role: 'participant' | 'admin';
  }[]>([]);

  // Daily Questions 옵션
  const [questionsOption, setQuestionsOption] = useState<'copy' | 'manual' | 'later'>('later');

  const handleSubmit = async () => {
    try {
      // 유효성 검사
      if (!name || !startDate || !endDate || !programStartDate) {
        throw new Error('모든 필수 항목을 입력해주세요.');
      }

      if (participants.length === 0) {
        throw new Error('최소 1명의 참가자를 추가해주세요.');
      }

      // API 호출 (구현 예정)
      const response = await fetch('/api/datacntr/cohorts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          startDate,
          endDate,
          programStartDate,
          participants,
          questionsOption,
        }),
      });

      if (!response.ok) throw new Error('기수 생성 실패');

      toast({
        title: '기수 생성 완료',
        description: `${name}이(가) 생성되었습니다.`,
      });

      router.push('/datacntr/cohorts');

    } catch (error) {
      logger.error('기수 생성 실패:', error);
      toast({
        title: '오류',
        description: error instanceof Error ? error.message : '기수 생성에 실패했습니다.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">새 기수 생성</h1>

      {/* 기본 정보 폼 */}
      <Card className="p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">기본 정보</h2>
        {/* 입력 필드들 */}
      </Card>

      {/* 참가자 추가 폼 */}
      <Card className="p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">참가자 추가</h2>
        {/* 참가자 테이블 */}
      </Card>

      {/* Daily Questions 옵션 */}
      <Card className="p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Daily Questions 설정</h2>
        {/* 라디오 버튼 */}
      </Card>

      {/* 액션 버튼 */}
      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={() => router.back()}>
          취소
        </Button>
        <Button onClick={handleSubmit}>
          생성하기
        </Button>
      </div>
    </div>
  );
}
```

---

## Phase 4: Daily Questions 관리 UI

### ✅ 체크리스트

- [x] 4-1. Daily Questions 관리 페이지 UI
- [x] 4-2. 1기 질문 복사 기능
- [x] 4-3. 직접 입력/수정 기능
- [x] 4-4. 저장 API 엔드포인트 (GET/POST /api/datacntr/cohorts/[cohortId]/daily-questions)

### 4-1. UI 레이아웃

**경로**: `/datacntr/cohorts/[cohortId]/daily-questions`

```
┌────────────────────────────────────────────────┐
│ 데이터센터 > 기수 관리 > 2기 > Daily Questions  │
├────────────────────────────────────────────────┤
│ [1기에서 복사] [일괄 저장]                      │
│                                                │
│ Day 1 (2025-11-01)                             │
│ ┌────────────────────────────────────────────┐ │
│ │ 카테고리: [생활 패턴____________▼]          │ │
│ │ 질문:     [아침형 인간인가요, 저녁형 인간   │ │
│ │           인가요?_______________________]  │ │
│ └────────────────────────────────────────────┘ │
│                                                │
│ Day 2 (2025-11-02)                             │
│ ┌────────────────────────────────────────────┐ │
│ │ 카테고리: [가치관 & 삶_________▼]           │ │
│ │ 질문:     [인생에서 가장 중요하게 생각하는  │ │
│ │           가치는?______________________]   │ │
│ └────────────────────────────────────────────┘ │
│                                                │
│ ...                                            │
│                                                │
│ Day 14 (2025-11-14)                            │
│ ┌────────────────────────────────────────────┐ │
│ │ 카테고리: [독서 습관___________▼]           │ │
│ │ 질문:     [하루 평균 독서 시간은?________]  │ │
│ └────────────────────────────────────────────┘ │
│                                                │
│                                [저장하기]       │
└────────────────────────────────────────────────┘
```

### 4-2. 카테고리 옵션

```typescript
const DAILY_QUESTION_CATEGORIES = [
  '생활 패턴',
  '가치관 & 삶',
  '독서 습관',
  '관계 & 소통',
  '취미 & 여가',
  '일 & 커리어',
  '자기계발',
  '기타',
] as const;
```

---

## Phase 5: 동적 로딩 함수

### ✅ 체크리스트

- [x] 5-1. `getDailyQuestion()` 함수 구현
- [x] 5-2. `getAllDailyQuestions()` 함수 구현
- [x] 5-3. `createDailyQuestions()` 함수 구현 (일괄 생성)
- [x] 5-4. `copyDailyQuestions()` 함수 구현 (기수 간 복사)
- [x] 5-5. Firebase index.ts에 export 추가

### 5-1. 특정 날짜의 질문 조회

**파일**: `src/lib/firebase/daily-questions.ts` (새 파일)

```typescript
import { doc, getDoc, collection, query, orderBy, getDocs, setDoc, serverTimestamp } from 'firebase/firestore';
import { parseISO, differenceInDays, addDays, format } from 'date-fns';
import { getDb } from './client';
import { getCohort } from './cohorts';
import { DailyQuestion } from '@/types/database';
import { logger } from '@/lib/logger';

/**
 * 특정 날짜의 Daily Question 조회
 *
 * @param cohortId - 기수 ID
 * @param date - 날짜 (ISO: "2025-10-11")
 * @returns DailyQuestion 또는 null
 */
export async function getDailyQuestion(
  cohortId: string,
  date: string
): Promise<DailyQuestion | null> {
  try {
    const db = getDb();

    // 1. Cohort 정보 가져오기
    const cohort = await getCohort(cohortId);
    if (!cohort) {
      logger.error('Cohort not found:', cohortId);
      return null;
    }

    // 2. programStartDate 기준으로 Day 계산
    const startDate = parseISO(cohort.programStartDate);
    const currentDate = parseISO(date);
    const dayNumber = differenceInDays(currentDate, startDate) + 1;

    // 3. 범위 체크 (1-14일)
    if (dayNumber < 1 || dayNumber > 14) {
      logger.warn('Day out of range:', { date, dayNumber });
      return null;
    }

    // 4. 해당 Day의 질문 조회
    const questionDoc = await getDoc(
      doc(db, `cohorts/${cohortId}/daily_questions`, dayNumber.toString())
    );

    if (!questionDoc.exists()) {
      logger.warn('Daily question not found:', { cohortId, dayNumber });
      return null;
    }

    return { id: questionDoc.id, ...questionDoc.data() } as DailyQuestion;

  } catch (error) {
    logger.error('Failed to get daily question:', error);
    return null;
  }
}
```

### 5-2. 모든 질문 조회

```typescript
/**
 * 기수의 모든 Daily Questions 조회
 *
 * @param cohortId - 기수 ID
 * @returns DailyQuestion 배열 (dayNumber 순으로 정렬)
 */
export async function getAllDailyQuestions(
  cohortId: string
): Promise<DailyQuestion[]> {
  try {
    const db = getDb();
    const q = query(
      collection(db, `cohorts/${cohortId}/daily_questions`),
      orderBy('dayNumber', 'asc')
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as DailyQuestion[];

  } catch (error) {
    logger.error('Failed to get all daily questions:', error);
    return [];
  }
}
```

### 5-3. 질문 일괄 생성

```typescript
/**
 * Daily Questions 일괄 생성
 *
 * @param cohortId - 기수 ID
 * @param questions - 질문 배열 (14개)
 */
export async function createDailyQuestions(
  cohortId: string,
  questions: Array<{
    category: string;
    question: string;
  }>
): Promise<void> {
  try {
    const db = getDb();
    const cohort = await getCohort(cohortId);

    if (!cohort) {
      throw new Error('Cohort not found');
    }

    if (questions.length !== 14) {
      throw new Error('Must provide exactly 14 questions');
    }

    // 각 Day별로 문서 생성
    const promises = questions.map(async (q, index) => {
      const dayNumber = index + 1;
      const date = format(
        addDays(parseISO(cohort.programStartDate), index),
        'yyyy-MM-dd'
      );

      const questionData: Omit<DailyQuestion, 'id'> = {
        dayNumber,
        date,
        category: q.category,
        question: q.question,
        order: dayNumber,
        createdAt: serverTimestamp() as any,
        updatedAt: serverTimestamp() as any,
      };

      await setDoc(
        doc(db, `cohorts/${cohortId}/daily_questions`, dayNumber.toString()),
        questionData
      );
    });

    await Promise.all(promises);

    logger.info('Daily questions created', { cohortId, count: 14 });

  } catch (error) {
    logger.error('Failed to create daily questions:', error);
    throw error;
  }
}
```

### 5-4. 기수 간 질문 복사

```typescript
/**
 * 다른 기수의 질문 복사
 *
 * @param sourceCohortId - 원본 기수 ID
 * @param targetCohortId - 대상 기수 ID
 */
export async function copyDailyQuestions(
  sourceCohortId: string,
  targetCohortId: string
): Promise<void> {
  try {
    // 1. 원본 질문 조회
    const sourceQuestions = await getAllDailyQuestions(sourceCohortId);

    if (sourceQuestions.length === 0) {
      throw new Error('Source cohort has no daily questions');
    }

    // 2. 대상 기수에 생성
    await createDailyQuestions(
      targetCohortId,
      sourceQuestions.map(q => ({
        category: q.category,
        question: q.question,
      }))
    );

    logger.info('Daily questions copied', {
      from: sourceCohortId,
      to: targetCohortId,
    });

  } catch (error) {
    logger.error('Failed to copy daily questions:', error);
    throw error;
  }
}
```

---

## Phase 6: 하드코딩 제거

### ✅ 체크리스트

- [x] 6-1. ReadingSubmissionDialog에 cohortId props 추가
- [x] 6-2. getDailyQuestion() 동적 로딩으로 변경
- [x] 6-3. chat/page.tsx에서 cohortId 전달
- [x] 6-4. today-library/page.tsx에서 cohortId 전달
- [ ] 6-5. `constants/daily-questions.ts` 파일 삭제 (보류 - 스크립트 호환성)
- [ ] 6-6. 스크립트에 CLI 인자 추가 (별도 작업)

### 6-1. 삭제할 파일

**파일**: `src/constants/daily-questions.ts`

```typescript
// ❌ 전체 삭제
// - PROGRAM_START_DATE
// - DAILY_QUESTIONS_SCHEDULE
// - getDailyQuestionText()
```

### 6-2. 프로필 페이지 수정

**파일**: `src/app/app/profile/[participantId]/page.tsx`

**변경 전**:
```typescript
import { getDailyQuestionText } from '@/constants/daily-questions';

// ...
const questionText = getDailyQuestionText(today);
```

**변경 후**:
```typescript
import { getDailyQuestion } from '@/lib/firebase/daily-questions';

// ...
const question = await getDailyQuestion(participant.cohortId, today);
const questionText = question?.question || '오늘의 질문이 없습니다';
```

### 6-3. 스크립트 CLI 인자 추가

**파일**: `src/scripts/random-matching.ts`

**변경 전**:
```typescript
const COHORT_ID = '1'; // ❌ 하드코딩
```

**변경 후**:
```typescript
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    cohort: { type: 'string', short: 'c', default: '1' },
  },
});

const COHORT_ID = values.cohort!;
```

**실행 방법**:
```bash
# 1기 (기본)
npm run random-matching

# 2기
npm run random-matching -- --cohort=2
```

---

## Phase 7: 테스트 & 검증

### ✅ 체크리스트

- [x] 7-1. TypeScript 타입 체크 통과
- [x] 7-2. ESLint 체크 (경고만 존재, 에러 수정 완료)
- [ ] 7-3. Production Build 테스트
- [ ] 7-4. 기수 생성 기능 테스트 (수동)
- [ ] 7-5. Daily Questions 관리 테스트 (수동)
- [ ] 7-6. 참가자 로그인 & UID 연결 테스트 (수동)

### 7-1. 기수 생성 테스트

**시나리오**:
1. Data Center → 기수 관리 → 새 기수 생성
2. 2기 정보 입력:
   - 기수명: "2기"
   - 시작일: 2025-11-01
   - 종료일: 2025-11-14
   - 프로그램 시작일: 2025-11-01
3. 참가자 5명 CSV 업로드
4. 1기 질문 복사 선택
5. 생성하기 클릭

**검증**:
- [ ] Firestore `cohorts` 컬렉션에 2기 문서 생성
- [ ] `participants` 컬렉션에 5명 추가 (cohortId: "2")
- [ ] `cohorts/2/daily_questions` 서브컬렉션에 14개 문서 생성
- [ ] 날짜 자동 계산 확인 (Day 1 = 2025-11-01)

### 7-2. 참가자 로그인 테스트

**시나리오**:
1. 2기 참가자 중 1명의 핸드폰 번호로 로그인 시도
2. SMS 인증 코드 입력
3. 로그인 성공

**검증**:
- [ ] Firebase Auth User 생성
- [ ] `participants` 문서에 `firebaseUid` 자동 연결
- [ ] AuthContext에서 participant 정상 조회
- [ ] `/app/chat?cohort=2` 자동 리다이렉트
- [ ] 2기 데이터만 표시 (공지, 제출, 프로필)

### 7-3. Daily Questions 조회 테스트

**시나리오**:
1. 2기 참가자로 로그인
2. 프로필 페이지 접속
3. 오늘 날짜 확인 (예: 2025-11-05 = Day 5)

**검증**:
- [ ] Day 5에 해당하는 질문 표시
- [ ] 카테고리와 질문 텍스트 정확함
- [ ] 날짜 계산 오류 없음

### 7-4. 기수 전환 테스트

**시나리오**:
1. 1기 참가자로 로그인
2. `/app/chat?cohort=1` 접속 → 1기 데이터 표시
3. 로그아웃
4. 2기 참가자로 로그인
5. `/app/chat?cohort=2` 접속 → 2기 데이터 표시

**검증**:
- [ ] 각 기수의 참가자만 해당 기수 데이터 조회
- [ ] 공지사항 필터링 정상
- [ ] 오늘의 서재 필터링 정상
- [ ] 프로필 카드 필터링 정상

### 7-5. 에지 케이스 테스트

**시나리오**:
- [ ] 프로그램 기간 외 날짜 접속 (Day < 1 또는 Day > 14)
- [ ] Daily Questions 없는 기수 접속
- [ ] 중복 핸드폰 번호로 참가자 추가 시도
- [ ] 잘못된 CSV 포맷 업로드

**검증**:
- [ ] 적절한 에러 메시지 표시
- [ ] 앱 크래시 없음
- [ ] 로그 정상 기록

---

## 완료 기준

모든 Phase의 체크리스트가 완료되고, Phase 7 테스트를 통과하면 구현 완료로 간주합니다.

---

## 참고 자료

- [Firestore 서브컬렉션 가이드](https://firebase.google.com/docs/firestore/data-model#subcollections)
- [Firebase Auth 전화번호 인증](https://firebase.google.com/docs/auth/web/phone-auth)
- [date-fns 문서](https://date-fns.org/)

---

**Last Updated**: 2025-10-24
