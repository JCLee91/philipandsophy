# 프로젝트 PnS 데이터센터 핵심 이슈 및 수정 방향

아래 항목들은 현재 서비스에 직접적인 오류를 일으키거나 체감 성능을 급격히 떨어뜨릴 수 있는 문제들입니다. 각 항목은 재현 상황과 함께 즉시 적용할 수 있는 수정 방향을 정리했습니다.

---

## 1. Firestore `IN` 제한으로 현황판 불능
- **파일:** `src/app/datacntr/board/page.tsx:95`
- **증상:** `where('submissionDate', 'in', dateStrings)` 에 프로그램 기간 전체(10일 초과)를 넣으면 Firestore 제약(최대 10개) 때문에 `FAILED_PRECONDITION` 오류가 발생해 페이지가 빈 화면으로 전환됩니다.
- **수정 방향:**
  - `submissionDate` 기반 범위 쿼리(`>=`, `<=`)로 교체하고, `cohortId + submissionDate` 복합 인덱스를 추가합니다.
  - 또는 날짜 배열을 10개 이하로 나눠 여러 번 질의한 뒤 결과를 병합합니다.

## 2. 제출 타임스탬프 누락 시 통계 API 장애
- **파일:** `src/app/api/datacntr/stats/activity/route.ts:122`
- **증상:** `safeTimestampToDate` 가 `null` 을 반환하면 `format(submittedAt, …)` 호출이 `RangeError` 를 발생시켜 API 응답이 500 으로 떨어집니다.
- **수정 방향:** `const submittedAt = safeTimestampToDate(...);` 이후 `if (!submittedAt) return;` 으로 방어하고, 필요하다면 이상 케이스를 로깅하거나 `submissionDate` 를 대체값으로 사용합니다.

## 3. 코호트별 제출 이력 잘림
- **파일:** `src/app/api/datacntr/submissions/route.ts:21-82`
- **증상:** 최신 200건만 가져온 뒤 코호트 필터를 적용하여, 오래된 제출만 있는 코호트는 항상 빈 결과가 반환됩니다.
- **수정 방향:**
  - Firestore 쿼리에서 먼저 `cohortId` 조건을 걸고 `submittedAt` 또는 `submissionDate` 기준으로 페이지네이션합니다.
  - 이미 조회한 참가자 ID 목록이 있다면 `where('participantId', 'in', chunkedIds)` 방식으로 나눠 질의한 뒤 병합합니다.

## 4. 참가자 API: N+1 쿼리 및 푸시 상태 오표시
- **파일:** `src/app/api/datacntr/participants/route.ts:30-101`, `:91`
- **증상:** 참가자 전체를 읽고 참가자마다 인증 횟수를 별도 쿼리(N+1)해 인원이 늘면 응답이 급격히 느려집니다. 또한 `pushNotificationEnabled === true` 만 검사해 실제 토큰이 없어도 "푸시 허용"으로 표시됩니다.
- **수정 방향:**
  - 인증 수 계산은 `reading_submissions` 를 한 번에 가져온 뒤 `Map` 으로 집계하거나 Cloud Functions 로 미리 카운트를 적재합니다.
  - `pushTokens`, `webPushSubscriptions`, 레거시 `pushToken` 을 모두 검사하는 `hasAnyPushSubscription` 로 교체합니다.

## 5. 개요 통계: 전체 스캔 + 잘못된 주간 참여율
- **파일:** `src/app/api/datacntr/stats/overview/route.ts:28-155`
- **증상:** 코호트 필터가 있어도 전체 컬렉션을 읽은 뒤 메모리에서 걸러 성능이 떨어집니다. 특히 주간 참여율 계산(125행)은 선택한 코호트와 무관하게 모든 제출을 사용해 수치가 잘못됩니다.
- **수정 방향:**
  - 코호트가 지정되면 `participants`, `reading_submissions`, `notices` 모두 `where('cohortId', '==', cohortId)` 를 적용합니다.
  - 주간 참여율 계산은 코호트 참가자 ID 세트로 `where('participantId','in', chunk)` 범위 쿼리를 수행하거나, 주간 참여 집계를 사전 저장합니다.

## 6. 제출 통계 API 전 컬렉션 스캔
- **파일:** `src/app/api/datacntr/stats/submissions/route.ts:25-167`
- **증상:** 참가자와 제출 컬렉션 전체를 읽은 뒤 필터링해 데이터가 늘면 응답시간과 비용이 폭증합니다.
- **수정 방향:** 코호트별 참가자 ID 집합을 먼저 만들고, 제출 쿼리를 해당 ID 들로 분할하여 수행합니다. 반복 사용되는 통계라면 Cloud Functions 등으로 사전 집계하는 방안도 고려합니다.

## 7. 메시지 목록 절단
- **파일:** `src/app/api/datacntr/messages/route.ts:21-62`
- **증상:** 최신 200건만 읽고 나서 코호트 필터를 적용하므로, 해당 기간에 메시지가 없으면 결과가 항상 빈 배열입니다.
- **수정 방향:** `where('cohortId', '==', cohortId)` 또는 `senderId/receiverId` IN 조건을 Firestore 쿼리 단계에 적용하고, `createdAt` 기반 페이지네이션을 구현합니다.

## 8. 코호트 활성 토글 권한 오류
- **파일:** `src/app/api/datacntr/cohorts/[cohortId]/toggle-active/route.ts:30-33`
- **증상:** Firebase 커스텀 클레임이 없는 관리자 계정은 403 이 발생해 토글이 작동하지 않습니다.
- **수정 방향:** `requireWebAppAdmin` 으로 권한 검증을 통일하거나, 로그인 시점에 커스텀 클레임을 동기화해 `admin` 플래그를 보장합니다.

## 9. AI 데이터 새로고침 400 오류
- **파일:** `src/components/datacntr/AIChatPanel.tsx:41`
- **증상:** 전역 스토어 기본값이 `'all'` 인 상태에서 "데이터 불러오기"를 누르면 `/api/datacntr/ai-chat/refresh?cohortId=all` 로 요청해 400 오류가 발생합니다.
- **수정 방향:** 버튼 클릭 전 유효한 `cohortId` 가 선택됐는지 확인하고, 없으면 활성 코호트 ID 를 자동으로 대입하거나 서버에서 `'all'` 케이스를 처리합니다.

---

### 우선순위 제안
1. **즉시 대응:** 1, 2, 3, 8, 9 – 오류로 기능이 동작하지 않거나 빈 화면을 유발합니다.
2. **성능·정확도 개선:** 4, 5, 6, 7 – 데이터가 쌓일수록 응답 지연과 지표 왜곡이 심해집니다. 인덱스 추가와 사전 집계를 병행해 해결하는 것이 좋습니다.

