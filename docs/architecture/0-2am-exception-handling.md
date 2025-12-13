# 2AM Deadline Policy Documentation

**Last Updated**: 2025-11-05
**Document Version**: v2.0.0

## Overview

This document details how the system implements the 2AM submission deadline policy. The policy treats 2AM as the cutoff time for daily submissions, not midnight.

## Core Policy

**2AM Deadline Policy**:
- 00:00-01:59 KST: Submissions count towards the **previous day**
- 02:00-23:59 KST: Submissions count towards the **current day**

## Date Utility Functions

### 1. `getSubmissionDate()`
**Location**: `src/lib/date-utils.ts`
- Returns the date for submission tracking
- During 0-2AM: Returns previous day's date
- Used by: All submission-related operations

### 2. `getMatchingTargetDate()`
**Location**: `src/lib/date-utils.ts`
- Returns the date for matching targets (completed submissions)
- During 0-2AM: Returns **two days ago** (yesterday is still in progress)
- During 2AM-23:59: Returns **yesterday** (yesterday is completed)
- Used by: Matching operations only

### 3. `getYesterdayString()`
**Location**: `src/lib/date-utils.ts`
- Always returns yesterday's date (no special 0-2AM handling)
- Simple utility function for getting yesterday's date in KST

## Components with 0-2AM Handling

### 1. Daily Questions System
**Location**: `src/constants/daily-questions.ts`
```typescript
// Line 78-80: Special handling for 0-2AM
if (useSubmissionDate && !dateString) {
  const hour = new Date().getHours();
  if (hour >= 0 && hour < 2) {
    targetDate.setDate(targetDate.getDate() - 1);
  }
}
```
- `getDailyQuestion()` accepts `useSubmissionDate` parameter
- When `true`, applies 2AM policy to return previous day's question during 0-2AM

### 2. Yesterday Submission Count Hook
**Location**: `src/hooks/use-yesterday-submission-count.ts`
```typescript
// Line 36: Direct call - no exception handling needed
const targetDate = getMatchingTargetDate();
```
- Automatically handles 0-2AM through the updated `getMatchingTargetDate()`
- Shows two days ago during 0-2AM, yesterday after 2AM

### 3. Yesterday Verified Participants Hook
**Location**: `src/hooks/use-yesterday-verified-participants.ts`
```typescript
// Line 30: Direct call - no exception handling needed
const targetDate = getMatchingTargetDate();
```
- Simplified logic with the updated `getMatchingTargetDate()`
- No try-catch needed anymore

### 4. Today Submission Count Hook
**Location**: `src/hooks/use-today-submission-count.ts`
```typescript
// Line 35: Uses getSubmissionDate() directly
const submissionDate = getSubmissionDate();
```
- Automatically handles 0-2AM through `getSubmissionDate()`
- Shows previous day's submissions during 0-2AM

### 5. Chat Client View
**Location**: `src/components/chat/page/ChatClientView.tsx`
```typescript
// Line 143: Button text logic
const todaySubmissionDate = getSubmissionDate();
const todaySubmission = submissions.find((sub) =>
  sub.submissionDate === todaySubmissionDate
);
```
- Shows "수정하기" (Edit) button during 0-2AM for previous day's submission
- Shows "독서 인증하기" (Submit Reading) after 2AM

### 6. Submission Form
**Location**: `src/app/app/submit/step3/page.tsx`
```typescript
// Line 128: Gets submission date for daily question
const submissionDate = getSubmissionDate();
const question = await getDailyQuestion(cohortId, submissionDate);
```
- Loads previous day's question during 0-2AM
- Ensures consistency with submission date

### 7. Verified Today Store
**Location**: `src/stores/verified-today.ts`
```typescript
// Lines 31, 45, 88: Multiple uses
currentDate: getSubmissionDate(), // 새벽 2시 마감 정책 적용
```
- Zustand store tracks submissions with 2AM policy
- Real-time updates respect the deadline

## API Routes with 0-2AM Considerations

### 1. Admin Matching Page
**Location**: `src/app/app/admin/matching/page.tsx`
```typescript
// Line 61: Direct call - no exception handling needed
const submissionDate = useMemo(() => getMatchingTargetDate(), []);
```
- Automatically shows two days ago data during 0-2AM
- Shows yesterday's data after 2AM

### 2. Admin Matching Preview API
**Location**: `src/app/api/admin/matching/preview/route.ts`
```typescript
// Line 52: Direct call - works correctly now
const submissionDate = getMatchingTargetDate();
```
✅ **FIXED**: Now returns appropriate date without throwing errors

## Firebase Operations

### 1. Create Reading Submission
**Location**: `src/lib/firebase/submissions.ts`
```typescript
// Line 46: Submission date assignment
const submissionDate = getSubmissionDate(); // 새벽 2시 마감 정책 적용
```
- All submissions created during 0-2AM are dated to previous day

### 2. Save Draft Submission
**Location**: `src/lib/firebase/submissions.ts`
```typescript
// Lines 281, 322: Draft operations
const submissionDate = getSubmissionDate();
```
- Draft submissions also respect the 2AM deadline

## Issues Fixed in v2.0.0

### 1. ~~Missing Error Handling in Preview Route~~
**File**: `src/app/api/admin/matching/preview/route.ts`
**Resolution**: `getMatchingTargetDate()` no longer throws errors, returns appropriate date
**Impact**: API works correctly during all hours

## Summary

The 2AM deadline policy is now implemented as standard logic, not exception handling:

1. **Date utilities** provide consistent behavior with `getSubmissionDate()` and `getMatchingTargetDate()`
2. **UI components** use `getSubmissionDate()` for submission tracking
3. **Hooks** directly call `getMatchingTargetDate()` without try-catch
4. **Firebase operations** ensure data consistency with the 2AM policy
5. **Daily questions** can optionally apply the 2AM policy via parameter

All components now handle the 0-2AM window as part of normal operation.

## Key Changes in v2.0.0

1. ✅ **`getMatchingTargetDate()` refactored**: Returns two days ago during 0-2AM instead of throwing error
2. ✅ **Removed unnecessary try-catch blocks**: Simplified code throughout the application
3. ✅ **Consistent behavior**: All matching operations work correctly during 0-2AM
4. ✅ **Clear User Communication**: Button text changes appropriately ("수정하기" vs "독서 인증하기")

---
*This is the authoritative document for 0-2AM exception handling. For related topics, see:*
- [Date Logic](./date-logic.md)
- [Firebase Schema](../optimization/database.md)
