# 레거시 필드 사용처 전수 조사 보고서

**작성일**: 2025-11-10
**목적**: AI 매칭 시스템 → 랜덤 매칭 시스템 전환을 위한 레거시 필드 정리

## 📊 요약

- **레거시 필드**: `similar`, `opposite`, `reasons`
- **발견된 파일 수**: 17개
- **영향 범위**: Functions, 프런트엔드, Scripts, 타입 정의

---

## 🔴 Critical: 즉시 수정 필요

### 1. Functions (백엔드)

#### `functions/src/index.ts`
- **위치**: 1533, 1614 라인
- **문제**: `manualMatchingPreview` 함수가 여전히 `matchParticipantsByAI` 호출
- **영향도**: ⚠️ **HIGH** - 관리자 매칭 미리보기 기능 전체
- **조치**: `matchParticipantsRandomly`로 교체 필요

```typescript
// 현재 (잘못됨)
const { matchParticipantsByAI } = await import("./lib/ai-matching");
const matching = await matchParticipantsByAI(submissionQuestion, participantAnswers);

// 수정 필요
const { matchParticipantsRandomly } = await import("./lib/random-matching");
const matching = await matchParticipantsRandomly(participants, options);
```

#### `functions/src/lib/ai-matching.ts`
- **상태**: @deprecated 표시됨 (2025-11-07)
- **문제**: 여전히 사용 중 (manualMatchingPreview에서 호출)
- **영향도**: ⚠️ **HIGH**
- **조치**: 완전 제거 또는 `deprecated/` 폴더로 이동

---

### 2. 프런트엔드 (UI 컴포넌트)

#### `src/app/app/admin/matching/page.tsx`
- **위치**: 333-382 라인
- **문제**: `assignmentRows` 생성 시 `similar`/`opposite` 필드 사용
- **영향도**: ⚠️ **HIGH** - 관리자 매칭 관리 UI
- **조치**: `assigned` 배열 기반으로 로직 재작성

```typescript
// 현재 구조 (추정)
assignmentRows = participants.map(p => ({
  viewerId: p.id,
  similarTargets: assignment.similar.map(id => ...),
  oppositeTargets: assignment.opposite.map(id => ...),
  reasons: assignment.reasons
}));

// 수정 필요
assignmentRows = participants.map(p => ({
  viewerId: p.id,
  assignedProfiles: assignment.assigned.map(id => ...)
}));
```

#### `src/components/admin/ParticipantAssignmentTable.tsx`
- **위치**: 89-125 라인
- **문제**: 테이블 렌더링 시 `similar`/`opposite` 컬럼 표시
- **영향도**: 🟡 **MEDIUM**
- **조치**: 단일 "배정된 프로필" 컬럼으로 변경

#### `src/app/app/profile/[participantId]/page.tsx`
- **위치**: 338-369 라인
- **문제**: 프로필 상세에서 `viewerAssignment.similar/opposite/reasons` 표시
- **영향도**: 🟡 **MEDIUM** - 사용자 프로필 페이지
- **조치**: "배정된 프로필북" 섹션으로 재설계 또는 비활성화

#### `src/components/MatchingReasonBanner.tsx`
- **문제**: `similar`/`opposite` 테마 기반 배너 컴포넌트
- **영향도**: 🟡 **MEDIUM**
- **조치**:
  - 옵션 1: 컴포넌트 완전 제거
  - 옵션 2: 범용 "프로필북 추천 이유" 배너로 변경

---

### 3. Scripts (유틸리티)

#### `scripts/check-today-matching.ts`
- **위치**: 94-104 라인
- **문제**: v1.0 필드(similar/opposite) 감지 로직 포함
- **영향도**: 🟢 **LOW** - 개발/디버깅 용도
- **조치**: v1.0 필드 검사 제거, v2.0(assigned) 기준으로 수정

#### `scripts/check-matching-field.ts`
- **영향도**: 🟢 **LOW**
- **조치**: 내용 확인 후 삭제 또는 업데이트

#### `scripts/check-recent-matching.ts`
- **영향도**: 🟢 **LOW**
- **조치**: 내용 확인 후 삭제 또는 업데이트

---

### 4. 타입 정의

#### `src/types/database.ts`
- **문제**: `DailyMatchingEntry`, `DailyParticipantAssignment` 타입에 레거시 필드 포함
- **영향도**: 🟡 **MEDIUM**
- **조치**: 타입 간소화

```typescript
// 현재
export interface DailyParticipantAssignment {
  similar?: string[];      // ❌ 제거
  opposite?: string[];     // ❌ 제거
  reasons?: DailyMatchingReasons; // ❌ 제거
  assigned?: string[];     // ✅ 유지
}

// 수정 후
export interface DailyParticipantAssignment {
  assigned: string[];
  isAdmin?: boolean;
  date: string;
}
```

#### `src/types/matching.ts`
- **문제**: `MatchingReasons`, `ParticipantAssignment` 인터페이스에 레거시 필드
- **영향도**: 🟡 **MEDIUM**
- **조치**: API 응답 타입 재정의

#### `src/types/schemas.ts`
- **문제**: Zod 스키마에 레거시 필드 검증 로직
- **영향도**: 🟢 **LOW**
- **조치**: 간소화

---

### 5. 라이브러리/유틸리티

#### `src/lib/ai-matching.ts`
- **문제**: AI 매칭 알고리즘 전체 (OpenAI/Anthropic/Google 통합)
- **영향도**: ⚠️ **HIGH**
- **조치**: 파일 삭제 또는 `src/lib/deprecated/` 이동

#### `src/lib/matching-utils.ts`
- **문제**: `normalizeMatchingData` 함수에 v1.0/v2.0 호환성 로직
- **영향도**: 🟡 **MEDIUM**
- **조치**:
  - v1.0 처리 로직 제거
  - v2.0(assigned) 전용으로 간소화

#### `src/app/app/chat/today-library/page.tsx`
- **위치**: 100-131 라인
- **문제**: `similar`/`opposite` fallback 로직 포함
- **영향도**: 🟡 **MEDIUM**
- **조치**: fallback 제거, `assigned` 전용

---

## 📁 영향받는 Firestore 컬렉션

1. **`cohorts/{cohortId}/dailyFeaturedParticipants/{date}`**
   - 레거시 필드: `assignments.{id}.similar`, `assignments.{id}.opposite`, `assignments.{id}.reasons`
   - 신규 필드: `assignments.{id}.assigned`

2. **`matching_previews`** (확인 필요)
   - 관리자 미리보기 문서 저장소
   - 레거시 구조 사용 중일 가능성

---

## 🎯 우선순위별 작업 계획

### Phase 1: Critical (1-2일)
1. ✅ **레거시 필드 사용처 조사 완료** (현재 문서)
2. ⬜ `functions/src/index.ts` - `manualMatchingPreview` 함수 수정
3. ⬜ `functions/src/lib/ai-matching.ts` - 파일 제거
4. ⬜ 데이터 마이그레이션 스크립트 작성

### Phase 2: High Priority (3-5일)
1. ⬜ `src/app/app/admin/matching/page.tsx` - UI 로직 재작성
2. ⬜ `src/components/admin/ParticipantAssignmentTable.tsx` - 테이블 구조 변경
3. ⬜ `src/types/database.ts` - 타입 정의 간소화
4. ⬜ `src/lib/ai-matching.ts` - 프런트엔드 AI 코드 제거

### Phase 3: Medium Priority (1주)
1. ⬜ `src/app/app/profile/[participantId]/page.tsx` - 프로필 UI 재설계
2. ⬜ `src/components/MatchingReasonBanner.tsx` - 컴포넌트 결정 (제거/변경)
3. ⬜ `src/app/app/chat/today-library/page.tsx` - fallback 로직 제거
4. ⬜ 스크립트 파일들 업데이트

### Phase 4: Cleanup (1-2일)
1. ⬜ 타입 파일들 최종 정리
2. ⬜ 환경변수 정리 (`AI_PROVIDER`, `AI_MODEL` 등)
3. ⬜ 문서 업데이트 (CLAUDE.md, README.md)

---

## 🧪 검증 체크리스트

### 백엔드
- [ ] manualMatchingPreview 함수가 랜덤 매칭 사용
- [ ] matching_previews 문서가 v2.0 구조로 저장
- [ ] 환경변수에서 AI 관련 설정 제거 가능

### 프런트엔드
- [ ] 관리자 매칭 페이지에서 assigned 기반 UI 정상 작동
- [ ] 프로필 페이지에서 레거시 필드 참조 없음
- [ ] 오늘의 서재에서 fallback 없이 작동
- [ ] TypeScript 컴파일 에러 없음

### 데이터
- [ ] 모든 과거 문서가 assigned 필드 보유
- [ ] similar/opposite 필드가 더 이상 생성되지 않음
- [ ] 마이그레이션 스크립트 실행 완료

---

## 📝 관련 문서

- [랜덤 매칭 시스템 문서](./scheduled-random-matching.md)
- [데이터베이스 마이그레이션 가이드](./database-migration.md) (작성 예정)
- [API 변경 사항](./api-changelog.md) (작성 예정)

---

**Last Updated**: 2025-11-10
**Author**: AI Assistant (Claude Code)
**Status**: ✅ Phase 1 완료
