# 레거시 필드 전환 전략: "자연스러운 전환" (No Migration)

**작성일**: 2025-11-10
**전략**: 과거 데이터 보존 + 새 데이터만 신규 형식

---

## 🎯 핵심 원칙

### ✅ DO (해야 할 것)
1. **새 데이터는 `assigned` 필드만 생성**
2. **프런트엔드는 `assigned` 우선, 레거시는 fallback**
3. **타입은 레거시 필드를 `@deprecated` 표시**

### ❌ DON'T (하지 말아야 할 것)
1. **과거 데이터 마이그레이션 불필요**
2. **레거시 필드 완전 제거 금지** (과거 데이터 읽기 위해)
3. **급하게 모든 코드 수정 불필요**

---

## 📊 왜 마이그레이션이 불필요한가?

### 1. UI는 대부분 "오늘" 데이터만 사용
- **오늘의 서재**: 오늘/어제 매칭만
- **관리자 페이지**: 최신 매칭 조회
- **프로필 페이지**: 최근 매칭만

### 2. 자연스러운 전환
```
시간 경과에 따른 데이터 비율:

Day 0  (전환 시작): [v1: 100%] [v2: 0%]
Day 7  (일주일 후):  [v1: 70%]  [v2: 30%]
Day 30 (한달 후):    [v1: 10%]  [v2: 90%]
Day 60 (두달 후):    [v1: 0%]   [v2: 100%] ← 자연스럽게 완료
```

### 3. 안전성
- 롤백 가능 (과거 데이터 보존)
- 점진적 전환 (한 번에 모든 것 바꾸지 않음)
- 데이터 손실 위험 제로

---

## 🔧 구현 계획

### Phase 1: 백엔드 - 새 데이터 생성 경로 수정 (1일)

#### 수정 대상
1. **`functions/src/index.ts`** - `manualMatchingPreview`
   ```typescript
   // Before (AI 매칭)
   import { matchParticipantsByAI } from './lib/ai-matching';
   const matching = await matchParticipantsByAI(question, participants);

   // After (랜덤 매칭)
   import { matchParticipantsRandomly } from './lib/random-matching';
   const matching = await matchParticipantsRandomly(participants, options);
   ```

2. **응답 형식 확인**
   - `assigned` 필드만 포함
   - `matchingVersion: 'random'` 추가
   - 레거시 필드 (`similar`, `opposite`, `reasons`) 생성 중단

#### 검증
```bash
# 함수 재배포 후 테스트
curl -X POST https://your-function-url/manualMatchingPreview \
  -H "Content-Type: application/json" \
  -d '{"cohortId": "default"}'

# assigned 필드만 있는지 확인
```

---

### Phase 2: 프런트엔드 - Fallback 로직 추가 (1일)

#### 우선순위 로직
```typescript
// 유틸리티 함수 생성
function getAssignedProfiles(assignment: DailyParticipantAssignment): string[] {
  // v2.0 우선
  if (assignment.assigned && assignment.assigned.length > 0) {
    return assignment.assigned;
  }

  // v1.0 fallback (과거 데이터 호환)
  if (assignment.similar && assignment.opposite) {
    return [...assignment.similar, ...assignment.opposite];
  }

  return [];
}
```

#### 수정 위치
1. **오늘의 서재** (`src/app/app/chat/today-library/page.tsx`)
   - 이미 `assigned` 우선 로직 있음
   - Fallback만 명확히 정리

2. **관리자 매칭 페이지** (`src/app/app/admin/matching/page.tsx`)
   ```typescript
   const assignmentRows = participants.map(p => {
     const profileIds = getAssignedProfiles(assignment);
     return {
       viewerId: p.id,
       viewerName: p.name,
       assignedProfiles: profileIds.map(id => participants.find(x => x.id === id))
     };
   });
   ```

3. **프로필 페이지** (`src/app/app/profile/[participantId]/page.tsx`)
   - `reasons` 배너는 조건부 렌더링
   ```typescript
   // v2.0 (랜덤 매칭): 이유 없음
   if (!assignment.reasons) {
     return <SimpleProfileList profiles={getAssignedProfiles(assignment)} />;
   }

   // v1.0 (AI 매칭): 이유 표시 (레거시)
   return <LegacyMatchingReasonBanner reasons={assignment.reasons} />;
   ```

---

### Phase 3: 타입 정리 - Deprecation 표시 (30분)

#### `src/types/database.ts`
```typescript
export interface DailyParticipantAssignment {
  /** v2.0: 배정된 프로필 ID 목록 */
  assigned?: string[];

  /** @deprecated v1.0 전용 - 새 코드에서 사용 금지 */
  similar?: string[];

  /** @deprecated v1.0 전용 - 새 코드에서 사용 금지 */
  opposite?: string[];

  /** @deprecated v1.0 전용 - 새 코드에서 사용 금지 */
  reasons?: DailyMatchingReasons;
}
```

---

### Phase 4: AI 코드 정리 - 사용 중단 (30분)

#### 파일 이동 (삭제하지 않음)
```bash
# 나중에 재사용 가능성을 위해 보존
mkdir -p src/lib/deprecated
mv src/lib/ai-matching.ts src/lib/deprecated/

mkdir -p functions/src/lib/deprecated
mv functions/src/lib/ai-matching.ts functions/src/lib/deprecated/
```

#### README 업데이트
```markdown
## Deprecated Features

### AI 매칭 시스템 (2025-11-07 중단)
- 위치: `src/lib/deprecated/ai-matching.ts`
- 대체: 랜덤 매칭 시스템 (`random-matching.ts`)
- 사유: 운영 복잡도 감소, 성별 균형 보장
```

---

## 🎯 타임라인

| 단계 | 작업 | 소요 시간 | 누적 |
|-----|------|----------|------|
| 1️⃣ | 백엔드 함수 수정 | 1일 | 1일 |
| 2️⃣ | 프런트엔드 fallback | 1일 | 2일 |
| 3️⃣ | 타입 정리 | 0.5일 | 2.5일 |
| 4️⃣ | AI 코드 정리 | 0.5일 | 3일 |

**총 소요 시간**: 3일

---

## ✅ 검증 체크리스트

### 백엔드
- [ ] `manualMatchingPreview` 함수가 `assigned` 필드만 생성
- [ ] `matchingVersion: 'random'` 포함
- [ ] Functions 배포 성공

### 프런트엔드
- [ ] 오늘의 서재에서 새 데이터 정상 표시
- [ ] 관리자 페이지에서 새 데이터 정상 표시
- [ ] 과거 데이터 fallback으로 여전히 읽기 가능
- [ ] TypeScript 컴파일 에러 없음

### 데이터
- [ ] 새로 생성된 매칭 문서에 `assigned` 필드 존재
- [ ] 과거 매칭 문서 여전히 읽기 가능
- [ ] UI에서 데이터 깨짐 없음

---

## 🔄 롤백 계획

문제 발생 시:
1. Functions 이전 버전으로 롤백
2. 프런트엔드 이전 버전으로 롤백
3. 과거 데이터 보존되어 있으므로 데이터 손실 없음

---

## 📝 장기 계획 (선택 사항)

### 6개월 후 (2025-05-01)
- 모든 활성 데이터가 v2.0 형식
- 레거시 필드 fallback 로직 제거 검토
- `deprecated/` 폴더 파일 완전 삭제 검토

### 1년 후 (2025-11-01)
- 타입에서 레거시 필드 완전 제거
- v1.0 호환성 코드 완전 제거

---

**결론**: 마이그레이션 없이도 안전하고 점진적인 전환 가능! 🎉
