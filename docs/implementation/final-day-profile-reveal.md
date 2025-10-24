# 마지막 날 전체 프로필북 공개 기능

**Last Updated**: 2025-10-24
**Status**: ✅ Completed
**Branch**: `feature/final-day-profile-reveal`

---

## 📋 목차

1. [개요](#개요)
2. [현재 상황](#현재-상황)
3. [요구사항](#요구사항)
4. [작업 계획](#작업-계획)
5. [Step 1: 날짜 체크 유틸리티](#step-1-날짜-체크-유틸리티)
6. [Step 2: 오늘의 서재 페이지 수정](#step-2-오늘의-서재-페이지-수정)
7. [Step 3: UI 레이아웃 확장](#step-3-ui-레이아웃-확장)
8. [Step 4: 테스트](#step-4-테스트)

---

## 개요

프로그램 마지막 날(14일차)에 모든 참가자의 프로필북을 공개하는 기능을 추가합니다.

---

## 현재 상황

**페이지**: `/app/chat/today-library` (오늘의 서재)

**현재 로직:**
- 매칭된 4명만 표시 (similar 2명 + opposite 2명)
- `dailyFeaturedParticipants[today]` 데이터 사용
- 2x2 그리드 레이아웃

**접근 경로:**
```
/app/chat → [오늘의 서재] 버튼 → /app/chat/today-library
```

---

## 요구사항

### 1. 날짜 조건
- **14일차 (마지막 날)**: 인증 필수 + 전체 프로필 공개
- **15일차 ~ 21일차**: 인증 없이도 전체 프로필 공개
- **공개 기간: 14일차 ~ 21일차 (총 8일간)**

**인증 조건**:
- **슈퍼관리자**: 1일차부터 항상 전체 프로필 공개 (인증 불필요)
- **일반 유저 14일차**: `canViewAllProfiles()` = true + 인증 필수 (`!isLocked`)
- **일반 유저 15일차~21일차**: `canViewAllProfilesWithoutAuth()` = true + 인증 불필요

### 2. 표시 대상
**포함:**
- ✅ 일반 참가자
- ✅ 일반 관리자 (isAdministrator: true)
- ✅ 본인

**제외:**
- ❌ 슈퍼관리자 (isSuperAdmin: true)

### 3. 레이아웃

**평소 (1-13일차):**
```
┌─────────────────────────────┐
│ 오늘의 서재                  │
├─────────────────────────────┤
│ [프로필북1] [프로필북2]      │
│ [프로필북3] [프로필북4]      │  ← 2x2 그리드
└─────────────────────────────┘
```

**마지막 날 (14일차):**
```
┌─────────────────────────────┐
│ 🎉 피날레 - 전체 프로필 공개 │
├──────────────┬──────────────┤
│   남자 (10명) │   여자 (11명) │
├──────────────┼──────────────┤
│ [프로필북1]   │ [프로필북1]   │
│ [프로필북2]   │ [프로필북2]   │
│ [프로필북3]   │ [프로필북3]   │
│      ↓       │      ↓       │  ← 세로 스크롤
│ (스크롤)     │ (스크롤)     │
└──────────────┴──────────────┘
```

### 4. 프로필북 데이터
- 최신 제출물 기준 (가장 최근 submission)
- 책 사진, 질문-답변 포함

---

## 작업 계획

### ✅ 체크리스트

- [x] Step 1-1: `isFinalDay(cohort)` 유틸리티 함수 생성
- [x] Step 1-2: `isAfterProgram(cohort)` 유틸리티 함수 생성
- [x] Step 2-1: 오늘의 서재 페이지에서 cohort 가져오기
- [x] Step 2-2: 날짜 체크 로직 추가
- [x] Step 2-3: 참가자 목록 분기 (평소 vs 마지막 날)
- [x] Step 2-4: 성별 분류 로직
- [x] Step 3-1: 마지막 날 UI 배너 추가
- [x] Step 3-2: 좌우 2열 레이아웃 구현
- [x] Step 3-3: 세로 스크롤 구현
- [x] Step 4-1: 빌드 및 타입 체크 통과
- [ ] Step 4-2: 실제 테스트 (날짜 변경 필요)

---

## Step 1: 날짜 체크 유틸리티

### 1-1. isFinalDay() 함수

**파일**: `src/lib/date-utils.ts`

```typescript
import { parseISO, isSameDay, isAfter } from 'date-fns';
import type { Cohort } from '@/types/database';

/**
 * 오늘이 프로그램 마지막 날인지 체크
 *
 * @param cohort - 기수 정보
 * @returns true if 오늘 = endDate
 */
export function isFinalDay(cohort: Cohort): boolean {
  if (!cohort.endDate) return false;

  const today = new Date();
  const endDate = parseISO(cohort.endDate);

  return isSameDay(today, endDate);
}

/**
 * 프로그램 종료 후인지 체크
 *
 * @param cohort - 기수 정보
 * @returns true if 오늘 > endDate
 */
export function isAfterProgram(cohort: Cohort): boolean {
  if (!cohort.endDate) return false;

  const today = new Date();
  const endDate = parseISO(cohort.endDate);

  return isAfter(today, endDate);
}

/**
 * 전체 프로필을 공개할 수 있는 날인지 체크
 * (마지막 날 또는 프로그램 종료 후)
 *
 * @param cohort - 기수 정보
 * @returns true if 전체 공개 가능
 */
export function canViewAllProfiles(cohort: Cohort): boolean {
  return isFinalDay(cohort) || isAfterProgram(cohort);
}
```

---

## Step 2: 오늘의 서재 페이지 수정

### 2-1. 현재 코드 구조 파악

**파일**: `src/app/app/chat/today-library/page.tsx`

**기존 로직:**
```typescript
// 매칭된 참가자 필터링
const featuredIds = [
  ...(todayFeatured?.similar || []),
  ...(todayFeatured?.opposite || []),
];

const featuredParticipants = participants.filter(p =>
  featuredIds.includes(p.id)
);
```

### 2-2. 수정된 로직

```typescript
import { canViewAllProfiles } from '@/lib/date-utils';

// cohort 정보 가져오기
const { data: cohort } = useCohort(cohortId);

// 마지막 날 체크
const showAllProfiles = cohort ? canViewAllProfiles(cohort) : false;

let displayParticipants;

if (showAllProfiles) {
  // 마지막 날: 전체 참가자 (본인 + 슈퍼관리자 제외)
  displayParticipants = participants.filter(p =>
    p.id !== currentUserId &&
    !p.isSuperAdmin
  );
} else {
  // 평소: 매칭된 4명
  const featuredIds = [
    ...(todayFeatured?.similar || []),
    ...(todayFeatured?.opposite || []),
  ];

  displayParticipants = participants.filter(p =>
    featuredIds.includes(p.id)
  );
}
```

### 2-3. 성별 분류

```typescript
// 성별로 분류 (마지막 날에만)
const maleParticipants = displayParticipants.filter(p => p.gender === 'male');
const femaleParticipants = displayParticipants.filter(p => p.gender === 'female');
const otherParticipants = displayParticipants.filter(p => !p.gender || p.gender === 'other');

console.log('성별 분류:', {
  male: maleParticipants.length,
  female: femaleParticipants.length,
  other: otherParticipants.length,
});
```

---

## Step 3: UI 레이아웃 확장

### 3-1. 마지막 날 배너

```tsx
{showAllProfiles && (
  <div className="mb-6 p-6 bg-gradient-to-r from-purple-50 via-pink-50 to-purple-50 border-2 border-purple-200 rounded-xl">
    <div className="text-center">
      <h2 className="text-2xl font-bold text-purple-800 mb-2">
        🎉 피날레 - 전체 프로필 공개!
      </h2>
      <p className="text-purple-600">
        14일간의 여정을 마치며, 모든 참가자의 프로필을 공개합니다
      </p>
      <p className="text-sm text-purple-500 mt-2">
        총 {displayParticipants.length}명의 이야기를 만나보세요
      </p>
    </div>
  </div>
)}
```

### 3-2. 좌우 2열 레이아웃

**기존 유지:**
```tsx
{!showAllProfiles && (
  <div className="grid grid-cols-2 gap-4">
    {displayParticipants.map(p => (
      <BookmarkCard key={p.id} participant={p} />
    ))}
  </div>
)}
```

**마지막 날 추가:**
```tsx
{showAllProfiles && (
  <div className="grid grid-cols-2 gap-6">
    {/* 왼쪽: 남자 */}
    <div>
      <h3 className="text-lg font-semibold mb-4 text-gray-700">
        남자 ({maleParticipants.length}명)
      </h3>
      <div className="space-y-4 max-h-[800px] overflow-y-auto pr-2">
        {maleParticipants.map(p => (
          <BookmarkCard key={p.id} participant={p} />
        ))}
      </div>
    </div>

    {/* 오른쪽: 여자 */}
    <div>
      <h3 className="text-lg font-semibold mb-4 text-gray-700">
        여자 ({femaleParticipants.length}명)
      </h3>
      <div className="space-y-4 max-h-[800px] overflow-y-auto pr-2">
        {femaleParticipants.map(p => (
          <BookmarkCard key={p.id} participant={p} />
        ))}
      </div>
    </div>
  </div>
)}

{/* 성별 미지정 참가자 (있는 경우만) */}
{showAllProfiles && otherParticipants.length > 0 && (
  <div className="mt-6">
    <h3 className="text-lg font-semibold mb-4 text-gray-700">
      기타 ({otherParticipants.length}명)
    </h3>
    <div className="grid grid-cols-2 gap-4">
      {otherParticipants.map(p => (
        <BookmarkCard key={p.id} participant={p} />
      ))}
    </div>
  </div>
)}
```

### 3-3. BookmarkCard 컴포넌트

**기존 그대로 사용** - 프로필북 카드 UI는 변경 없음

---

## Step 4: 테스트

### 4-1. 날짜 변경 테스트

**방법 1**: 시스템 날짜 변경 (비추천)

**방법 2**: 임시로 endDate 수정
```typescript
// 테스트용: 오늘을 마지막 날로 간주
const TEST_MODE = true;
const showAllProfiles = TEST_MODE || canViewAllProfiles(cohort);
```

**방법 3**: Firestore에서 cohort endDate를 오늘로 임시 변경

### 4-2. 검증 항목

- [ ] 마지막 날 배너 표시 확인
- [ ] 남자/여자 분류 정확한지 확인
- [ ] 전체 참가자 수 맞는지 (슈퍼관리자 제외)
- [ ] 스크롤 작동 확인
- [ ] 프로필 카드 클릭 시 정상 동작
- [ ] 평소엔 4명만 표시 (기존 로직 유지)

---

## 코드 변경 요약

### 새로 추가
1. `src/lib/date-utils.ts`
   - `isFinalDay()`
   - `isAfterProgram()`
   - `canViewAllProfiles()`

### 수정
1. `src/app/app/chat/today-library/page.tsx`
   - cohort 조회 추가
   - 날짜 체크 로직
   - 참가자 목록 분기
   - 성별 분류
   - UI 레이아웃 확장 (기존 유지 + 마지막 날 추가)

---

## 참고 사항

**기존 UI 유지:**
- BookmarkCard 컴포넌트는 그대로
- 2x2 그리드 레이아웃 유지 (평소)
- 클릭 동작 동일

**새로운 UI:**
- 마지막 날 배너
- 좌우 2열 성별 분류
- 세로 스크롤

---

**Last Updated**: 2025-10-24
