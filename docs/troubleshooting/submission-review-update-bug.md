# 독서 인증 수정 버그 - Review 필드 업데이트 실패

**Last Updated**: 2025-11-01
**Severity**: High (데이터 손실)
**Status**: ✅ Resolved

## 🐛 현상 (Symptom)

### 사용자 보고
"독서인증 수정해도 반영이 안된다"

### 구체적 증상
독서 인증 제출물을 수정할 때:
- ✅ `dailyAnswer` (가치관 답변): 정상적으로 수정됨
- ❌ `review` (독서감상): 수정되지 않고 기존 값 유지

**재현 시나리오**:
1. 기존 독서 인증 제출물 편집 모드 진입
2. Step2에서 `review` 필드를 "444444"로 수정
3. Step3에서 `dailyAnswer` 필드를 "555555"로 수정
4. 최종 제출
5. Firestore 확인 결과:
   - `dailyAnswer`: "555555" ✅ (정상 반영)
   - `review`: 이전 값 그대로 ❌ (수정 실패)

---

## 🔍 문제 (Problem)

### 멀티스텝 폼 구조
독서 인증 제출 플로우는 3단계로 구성:

```
Step1 (/app/submit/step1)
  → 책 이미지 업로드
  → Zustand Store 저장

Step2 (/app/submit/step2)
  → 책 선택 + 리뷰(review) 작성
  → Zustand Store 저장

Step3 (/app/submit/step3)
  → 가치관 질문 답변(dailyAnswer) 작성
  → 모든 데이터 최종 제출
```

### 상태 관리
- **전역 상태**: Zustand store (`useSubmissionStore`)
- **로컬 상태**: 각 Step의 useState
- **데이터베이스**: Firebase Firestore

### 문제 발생 지점
**Step3의 `loadExistingSubmission` useEffect**가 Step2에서 수정한 Store 값을 DB의 이전 값으로 덮어쓰는 문제 발생.

---

## 🔬 원인 (Root Cause)

### 데이터 흐름 추적

```
[사용자] Step2에서 리뷰 수정: "444444"
   ↓
[Store] setReview("444444") 호출
   ↓
✅ Zustand Store 업데이트: review = "444444"
   ↓
[사용자] Step3로 이동 (다음 버튼 클릭)
   ↓
[Step3] useEffect 실행 (컴포넌트 마운트)
   ↓
[Step3] getDraftSubmission() 호출
   ↓
[Firestore] 기존 제출물 로드: { review: "이전값", ... }
   ↓
❌ [Step3] setReview("이전값") 호출
   ↓
❌ [Store] Store의 "444444"가 "이전값"으로 덮어써짐
   ↓
[사용자] Step3에서 dailyAnswer 작성 후 제출
   ↓
[Step3] 제출 시 Store의 값 사용
   ↓
❌ [Firestore] review: "이전값" 저장 (사용자 수정 손실)
```

### 문제 코드 위치

**파일**: `src/app/app/submit/step3/page.tsx`
**라인**: 186-192 (수정 전)

```typescript
// ❌ 문제 코드: 항상 DB 값으로 덮어쓰기
const loadExistingSubmission = async () => {
  if (!existingSubmissionId) return;

  const submission = await getSubmissionById(existingSubmissionId);
  if (!submission) return;

  // ... 다른 필드 로드 ...

  // 🔴 문제: review가 있으면 무조건 Store에 덮어쓰기
  if (submission.review) {
    setReview(submission.review);  // ← Store의 수정된 값을 DB 값으로 덮어씀!
  }

  // dailyAnswer는 Step3에서 입력하므로 항상 DB 값 로드 (정상)
  if (submission.dailyAnswer) {
    setDailyAnswer(submission.dailyAnswer);
  }
};

useEffect(() => {
  loadExistingSubmission();
}, [existingSubmissionId]);
```

### 왜 dailyAnswer는 정상 작동했나?

`dailyAnswer`는 **Step3에서만 입력**하므로:
- Step2에서 Store에 값이 저장되지 않음
- Step3에서 DB 값을 로드해도 문제없음
- 사용자가 Step3에서 직접 입력 → 정상 저장

반면, `review`는 **Step2에서 입력**하므로:
- Step2에서 Store에 값 저장
- Step3 진입 시 DB 값으로 덮어써짐 ← 🔴 문제 발생
- 사용자의 수정사항 손실

---

## ✅ 해결 방법 (Solution)

### 수정 전략
**Store에 값이 있으면 DB 로드를 건너뛰기** - Store 우선 정책

### 수정 코드

**파일**: `src/app/app/submit/step3/page.tsx`
**라인**: 186-189 (수정 후)

```typescript
// ✅ 해결: Store 값이 있으면 DB 로드 건너뛰기
const loadExistingSubmission = async () => {
  if (!existingSubmissionId) return;

  const submission = await getSubmissionById(existingSubmissionId);
  if (!submission) return;

  // ... 다른 필드 로드 ...

  // review는 Step2에서 이미 수정했을 수 있으므로,
  // store에 값이 없을 때만 로드
  if (submission.review && !review) {
    setReview(submission.review);  // ← Store가 비어있을 때만 DB에서 로드
  }
  // Store에 값이 있으면 → 아무것도 하지 않음 (Store 값 유지)

  // dailyAnswer는 Step3에서 입력하므로 항상 DB 값 로드
  if (submission.dailyAnswer) {
    setDailyAnswer(submission.dailyAnswer);
  }
};
```

### 수정 논리 흐름

```
[Step3] useEffect 실행
   ↓
[Check] Store의 review 값 확인
   ↓
Store에 값이 있는가?
   ↓
YES (Step2에서 수정함)
   ↓
   → DB 로드 건너뛰기
   → Store 값 유지: "444444" ✅
   ↓
NO (첫 진입 또는 임시저장)
   ↓
   → DB에서 로드
   → Store 업데이트
```

---

## 📊 수정 전후 비교

### Before (버그 있음)
```
사용자 액션:
  Step2에서 review 수정: "444444"
    ↓
  Step3로 이동
    ↓
  dailyAnswer 작성: "555555"
    ↓
  제출 버튼 클릭

데이터 흐름:
  [Step2] Store.review = "444444" ✅
    ↓
  [Step3] DB에서 로드: review = "이전값"
    ↓
  [Step3] Store.review = "이전값" ❌ (덮어쓰기)
    ↓
  [Step3] Store.dailyAnswer = "555555" ✅
    ↓
  [Firestore] 최종 저장:
    - review: "이전값" ❌
    - dailyAnswer: "555555" ✅
```

### After (수정 완료)
```
사용자 액션:
  Step2에서 review 수정: "444444"
    ↓
  Step3로 이동
    ↓
  dailyAnswer 작성: "555555"
    ↓
  제출 버튼 클릭

데이터 흐름:
  [Step2] Store.review = "444444" ✅
    ↓
  [Step3] Store.review 확인: 값 있음
    ↓
  [Step3] DB 로드 건너뛰기 (Store 유지)
    ↓
  [Step3] Store.review = "444444" ✅ (유지)
    ↓
  [Step3] Store.dailyAnswer = "555555" ✅
    ↓
  [Firestore] 최종 저장:
    - review: "444444" ✅
    - dailyAnswer: "555555" ✅
```

---

## 🧪 테스트 결과

### 검증 로그 (수정 후)

```
🔍 [Step2] Review changed: 444444
🔍 [Step3] Keeping existing review from store: 444444
🔍 [Step3] submissionPayload: {
  "review": "444444",
  "dailyAnswer": "555555"
}
🔍 [updateSubmission] After update - Firestore actual values: {
  review: '444444',
  dailyAnswer: '555555'
}
✅ Submission updated successfully
```

### 테스트 시나리오
1. ✅ 신규 제출 (정상 작동)
2. ✅ 기존 제출 수정 - review만 변경 (정상 작동)
3. ✅ 기존 제출 수정 - dailyAnswer만 변경 (정상 작동)
4. ✅ 기존 제출 수정 - 둘 다 변경 (정상 작동)
5. ✅ 임시저장 후 이어서 작성 (정상 작동)

---

## 🎯 핵심 교훈

### 1. 멀티스텝 폼 상태 관리 원칙
**Store 우선 정책**: 이전 단계에서 수정한 값을 다음 단계에서 존중해야 함

```typescript
// ❌ Bad: 항상 DB 값으로 덮어쓰기
if (dbValue) {
  setStoreValue(dbValue);
}

// ✅ Good: Store 값이 없을 때만 DB에서 로드
if (dbValue && !storeValue) {
  setStoreValue(dbValue);
}
```

### 2. useEffect 의존성 관리
- DB 로딩 로직이 Store 값을 덮어쓰지 않도록 조건 체크 필수
- Store 값의 출처를 고려 (어느 단계에서 입력되는가?)

### 3. 디버깅 전략
- **데이터 흐름 추적**: 각 단계별 console.log로 값 변화 추적
- **타이밍 확인**: useEffect 실행 시점과 Store 업데이트 순서 파악
- **비교 분석**: 정상 작동하는 필드(dailyAnswer)와 버그 있는 필드(review) 비교

---

## 🔗 관련 파일

### 수정된 파일
- `src/app/app/submit/step3/page.tsx` (line 186-189)
  - `loadExistingSubmission` 함수의 review 로드 로직 수정

### 관련 파일
- `src/app/app/submit/step2/page.tsx` - review 입력 단계
- `src/stores/submissionStore.ts` - Zustand 전역 상태
- `src/lib/firebase/submissions.ts` - Firestore 업데이트 로직
- `src/types/database.ts` - ReadingSubmission 타입 정의

---

## 📝 추가 개선 사항

### 권장 사항
1. **타입 안전성 강화**: Store 값의 출처를 명시하는 타입 추가
2. **상태 동기화 로직**: Step 간 이동 시 Store 동기화 검증 로직 추가
3. **단위 테스트**: 멀티스텝 폼 상태 관리 테스트 케이스 작성

### 참고 문서
- [Multi-step Form Best Practices](../architecture/form-patterns.md)
- [Zustand State Management Guide](../setup/state-management.md)

---

**Resolved by**: Claude Code
**Date Fixed**: 2025-11-01
**Impact**: 사용자 데이터 손실 방지, 편집 기능 정상화
