# 코드 리뷰: 데이터센터 코호트 및 유저 추가 로직 (Archive)

이 문서는 특정 시점의 코드 리뷰 기록입니다.

## 1. 분석 대상
-   **Frontend:** `src/app/datacntr/cohorts/new/page.tsx` (기수 생성 UI)
-   **Backend API:** `src/app/api/datacntr/cohorts/route.ts` (기수 생성 및 참가자 일괄 등록)

## 2. 핵심 발견 사항 (Missing Link)

### 🚨 마이그레이션 로직 부재
`src/app/api/datacntr/cohorts/route.ts`의 148번째 라인을 보면:
```typescript
firebaseUid: null, // 첫 로그인 시 자동 연결
```
새로운 참가자를 생성할 때 `firebaseUid`를 명시적으로 `null`로 설정하고 있습니다.
이는 **"유저가 스스로 로그인해서 연결되기를 기다리겠다"**는 수동적인 접근 방식입니다.

하지만 현재 시스템 구조상, 유저가 로그인하면 `getParticipantByFirebaseUid`가 호출되는데, 이 함수는 **이미 `firebaseUid`가 있는 문서**만 찾습니다.
즉, **새로 만든 문서에 `firebaseUid`가 없으면, 유저는 영원히 새 문서를 찾을 수 없습니다.** (닭과 달걀의 문제)

### ✅ 결론: 자동화가 "선택"이 아닌 "필수"인 상황
현재 로직대로라면, 운영자가 기수를 생성한 후 **반드시** 수동으로 마이그레이션 스크립트를 돌려줘야만 유저들이 로그인할 수 있습니다.

## 3. 상세 코드 품질 리뷰

### 👍 잘된 점 (Good Practices)
1.  **ID 생성 규칙의 일관성:**
    -   `cohort{기수}-{이름}` 형식을 사용하여 사람이 읽기 쉽고 예측 가능한 ID를 생성합니다.
    -   동명이인 처리를 위해 알파벳 Suffix (A, B, C...)를 붙이는 로직이 꼼꼼하게 구현되어 있습니다.
2.  **배치 처리 (Batch Processing):**
    -   참가자가 100명이든 200명이든 `db.batch()`를 사용하여 한 번의 트랜잭션으로 처리합니다. 중간에 실패해서 데이터가 꼬일 확률을 최소화했습니다.
3.  **입력값 검증:**
    -   전화번호 정규화(`phoneFormatUtils`)를 통해 `010-1234-5678`, `01012345678` 등 다양한 포맷을 통일된 형태로 저장합니다.

### ⚠️ 개선이 필요한 점 (Risks)

1.  **마이그레이션 누락 (Critical):**
    -   위에서 언급했듯, 기존 유저의 `firebaseUid`를 가져오는 로직이 빠져 있습니다.

2.  **질문 복사 로직의 하드코딩:**
    -   `sourceCohortId = '1'`로 고정되어 있습니다. 나중에 2기 질문을 3기로 복사하고 싶어도 무조건 1기 질문만 복사됩니다.
    -   *제안:* UI에서 "복사할 원본 기수"를 선택할 수 있게 하거나, 직전 기수를 자동으로 찾도록 개선 필요.

## 4. 구체적인 해결 제안 (Action Plan)

`src/app/api/datacntr/cohorts/route.ts` 파일을 수정하여 **"생성 시점 마이그레이션"**을 구현해야 합니다.

### 변경 전
```typescript
firebaseUid: null,
```

### 변경 후 (의사 코드)
```typescript
// 1. 해당 전화번호를 가진 기존 유저 검색
const existingUsers = await db.collection('participants')
  .where('phoneNumber', '==', p.phone)
  .get();

// 2. UID 찾기
const uid = existingUsers.docs.find(doc => doc.data().firebaseUid)?.data().firebaseUid || null;

// 3. 새 문서에 UID 즉시 할당
firebaseUid: uid,
```

이렇게 수정하면 운영자가 "기수 생성" 버튼을 누르는 순간, 모든 유저의 로그인 정보가 새 기수로 즉시 연결됩니다.
