# Firestore 데이터베이스 Best Practices

**최종 업데이트**: 2025년 10월 16일
**문서 버전**: v1.0

---

## 📋 목차

1. [개요](#개요)
2. [데이터 모델링](#데이터-모델링)
3. [쿼리 최적화](#쿼리-최적화)
4. [보안 규칙](#보안-규칙)
5. [에러 처리](#에러-처리)
6. [성능 모니터링](#성능-모니터링)
7. [비용 최적화](#비용-최적화)
8. [개발 워크플로우](#개발-워크플로우)

---

## 개요

이 문서는 projectpns 프로젝트에서 Firestore를 안전하고 효율적으로 사용하기 위한 모범 사례를 정리합니다.

---

## 데이터 모델링

### 1. 플랫 구조 선호 (서브컬렉션 최소화)

**✅ 권장: 플랫 구조**
```typescript
// 참가자와 제출물을 분리된 컬렉션으로 관리
participants/{participantId}
reading_submissions/{submissionId} { participantId: "..." }
```

**❌ 지양: 서브컬렉션**
```typescript
// 서브컬렉션은 쿼리가 복잡하고 비용이 높음
participants/{participantId}/submissions/{submissionId}
```

**이유**:
- 플랫 구조는 쿼리가 단순하고 빠름
- 인덱스 관리가 용이함
- 여러 참가자의 제출물을 한 번에 조회 가능
- 보안 규칙 작성이 간단함

### 2. 비정규화 (Denormalization) 활용

**✅ 권장: 자주 사용하는 데이터 중복 저장**
```typescript
// reading_submissions 컬렉션
{
  participantId: "participant123",
  bookTitle: "클린 코드",           // 중복 저장
  bookAuthor: "로버트 C. 마틴",     // 중복 저장
  bookCoverUrl: "https://...",     // 중복 저장
}
```

**이유**:
- 조인(join) 없이 단일 쿼리로 완전한 데이터 조회 가능
- 읽기 횟수 감소 → 비용 절감
- NoSQL의 장점 활용

**주의사항**:
- 중복 데이터는 일관성 관리 필요
- 업데이트 빈도가 낮은 데이터만 중복 저장
- 참조 무결성은 앱 레벨에서 관리

### 3. 배열 사용 시 주의사항

**✅ 권장: 작은 배열 (< 100개)**
```typescript
// bookHistory: 참가자당 읽은 책 이력 (보통 < 10권)
{
  bookHistory: [
    { title: "책1", startedAt: Timestamp, endedAt: Timestamp },
    { title: "책2", startedAt: Timestamp, endedAt: null }
  ]
}
```

**❌ 지양: 큰 배열 (> 100개)**
```typescript
// ❌ 배열이 너무 크면 문서 크기 제한 (1MB) 초과 위험
{
  submissions: [submission1, submission2, ..., submission500] // 별도 컬렉션으로 분리 필요
}
```

**이유**:
- Firestore 문서 크기 제한: 1MB
- 배열 전체를 읽어야 하므로 성능 저하
- 배열 인덱스는 제한적 (arrayContains만 지원)

### 4. Timestamp vs String (날짜)

**✅ 권장: Timestamp + String 병용**
```typescript
{
  submittedAt: Timestamp.now(),           // 정확한 시각 (정렬, 비교용)
  submissionDate: "2025-10-15",          // 날짜만 (인덱싱, 그룹화용)
}
```

**이유**:
- `Timestamp`: 정렬, 시간 비교에 유리
- `string` (YYYY-MM-DD): 날짜별 그룹화, 인덱싱에 유리
- 두 가지 모두 사용하여 각 용도에 최적화

---

## 쿼리 최적화

### 1. 인덱스 생성 전략

**✅ 복합 쿼리는 반드시 인덱스 생성**
```typescript
// ❌ 인덱스 없으면 에러 발생
query(
  collection(db, 'participants'),
  where('cohortId', '==', 'cohort1'),
  orderBy('createdAt', 'asc')
);

// ✅ firestore.indexes.json에 인덱스 정의 필요
{
  "collectionGroup": "participants",
  "fields": [
    { "fieldPath": "cohortId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "ASCENDING" }
  ]
}
```

**자동 인덱스 vs 복합 인덱스**:
- **단일 필드**: 자동 인덱스 생성 (별도 설정 불필요)
- **복합 필드**: 수동 인덱스 생성 필요 (Firebase Console 또는 CLI)

### 2. 쿼리 제한 (limit) 사용

**✅ 권장: 항상 limit 설정**
```typescript
// ✅ 최대 100개만 가져오기
const q = query(
  collection(db, 'reading_submissions'),
  where('participantId', '==', participantId),
  orderBy('submittedAt', 'desc'),
  limit(100)
);
```

**❌ 지양: limit 없이 전체 조회**
```typescript
// ❌ 참가자가 1000개 제출물을 가지면 모두 읽어옴 (비용 증가)
const q = query(
  collection(db, 'reading_submissions'),
  where('participantId', '==', participantId),
  orderBy('submittedAt', 'desc')
);
```

**권장 limit 값**:
- 리스트 UI: 20-50개
- 무한 스크롤: 20개 (페이지네이션)
- 전체 조회가 필요한 경우: 200-500개 (주의)

### 3. 불필요한 실시간 구독 피하기

**✅ 권장: 정적 데이터는 getDocs 사용**
```typescript
// ✅ 참가자 목록은 자주 변하지 않음 → 일반 쿼리
const participants = await getParticipantsByCohort('cohort1');
```

**❌ 지양: 모든 것을 실시간 구독**
```typescript
// ❌ 참가자 목록을 실시간으로 구독하면 비용 낭비
onSnapshot(query(collection(db, 'participants')), (snapshot) => {
  // 매 변경마다 읽기 비용 발생
});
```

**실시간 구독이 필요한 경우만 사용**:
- ✅ 메시지 (즉시 전달 필요)
- ✅ 오늘의 인증 현황 (실시간 업데이트 필요)
- ❌ 참가자 목록 (거의 변하지 않음)
- ❌ 기수 정보 (정적 데이터)

### 4. 클라이언트 필터링 활용

**언제 클라이언트 필터링을 사용할까?**

```typescript
// ✅ 이미 가져온 데이터에서 필터링 (네트워크 비용 0)
const participants = await getParticipantsByCohort('cohort1');
const admins = participants.filter(p => p.isAdministrator);

// ❌ 서버 쿼리로 필터링 (네트워크 비용 발생)
const q = query(
  collection(db, 'participants'),
  where('cohortId', '==', 'cohort1'),
  where('isAdministrator', '==', true)
);
```

**클라이언트 필터링 권장 상황**:
- 데이터 양이 적을 때 (< 100개)
- 복잡한 인덱스를 만들기 어려울 때
- 이미 가져온 데이터를 재사용할 때

---

## 보안 규칙

### 1. 최소 권한 원칙 (Principle of Least Privilege)

**✅ 권장: 필요한 권한만 부여**
```javascript
// ✅ 본인의 제출물만 수정/삭제
match /reading_submissions/{submissionId} {
  allow update, delete: if isSignedIn() &&
    isOwnParticipant(resource.data.participantId);
}
```

**❌ 지양: 모든 권한 부여**
```javascript
// ❌ 모든 사용자에게 쓰기 권한
match /reading_submissions/{submissionId} {
  allow read, write: if true;
}
```

### 2. Custom Claims 활용

**✅ 권장: Firebase Custom Claims로 관리자 권한 관리**
```javascript
// firestore.rules
function isAdminClaim() {
  return isSignedIn() && request.auth.token.admin == true;
}

match /notices/{noticeId} {
  allow write: if isAdminClaim(); // 관리자만 공지 작성
}
```

```typescript
// Firebase Admin SDK (서버 사이드)
import { auth } from 'firebase-admin';

// 관리자 권한 부여
await auth().setCustomUserClaims(uid, { admin: true });
```

**이유**:
- Firestore 문서에 `isAdmin` 필드를 저장하면 사용자가 임의로 수정 가능
- Custom Claims는 서버에서만 설정 가능하므로 안전

### 3. 입력 검증 (Validation)

**✅ 권장: 보안 규칙에서 입력 검증**
```javascript
// 제출물 생성 시 필수 필드 검증
allow create: if isSignedIn() &&
  request.resource.data.bookTitle is string &&
  request.resource.data.bookTitle.size() > 0 &&
  request.resource.data.review.size() >= 40 && // 최소 40자
  request.resource.data.status == 'approved';
```

**이유**:
- 클라이언트 검증만으로는 불충분 (우회 가능)
- 서버 사이드 검증으로 데이터 무결성 보장

---

## 에러 처리

### 1. Try-Catch 패턴

**✅ 권장: 모든 Firestore 작업에 try-catch**
```typescript
import { logger } from '@/lib/logger';

async function getParticipant(id: string) {
  try {
    const participant = await getParticipantById(id);
    return participant;
  } catch (error) {
    logger.error('참가자 조회 실패:', error);
    throw new Error('참가자를 찾을 수 없습니다');
  }
}
```

### 2. 사용자 친화적 에러 메시지

**✅ 권장: 비즈니스 로직 에러 메시지**
```typescript
try {
  await createSubmission(data);
} catch (error) {
  if (error.code === 'permission-denied') {
    toast.error('독서 인증 제출 권한이 없습니다');
  } else if (error.code === 'not-found') {
    toast.error('참가자 정보를 찾을 수 없습니다');
  } else {
    toast.error('제출 중 오류가 발생했습니다');
  }
}
```

**❌ 지양: 시스템 에러 노출**
```typescript
// ❌ 사용자에게 Firebase 내부 에러 노출
toast.error(error.message); // "PERMISSION_DENIED: Missing or insufficient permissions"
```

### 3. 재시도 로직 (Exponential Backoff)

**✅ 권장: 트랜잭션 실패 시 재시도**
```typescript
const MAX_RETRIES = 3;
let retries = 0;

while (retries < MAX_RETRIES) {
  try {
    await runTransaction(db, async (transaction) => {
      // 트랜잭션 로직
    });
    return; // 성공
  } catch (error) {
    retries++;
    if (retries >= MAX_RETRIES) throw error;
    await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 100));
  }
}
```

---

## 성능 모니터링

### 1. 쿼리 실행 시간 측정

**✅ 권장: 개발 환경에서 성능 측정**
```typescript
import { logger } from '@/lib/logger';

async function measureQuery(queryName: string, queryFn: () => Promise<any>) {
  const startTime = performance.now();
  const result = await queryFn();
  const endTime = performance.now();

  if (endTime - startTime > 1000) {
    logger.warn(`[Slow Query] ${queryName}: ${(endTime - startTime).toFixed(2)}ms`);
  }

  return result;
}
```

### 2. Firebase Console 모니터링

**주요 지표**:
- **Read/Write 횟수**: 일일 50,000 reads 무료
- **Storage 사용량**: 1GB 무료
- **Network 사용량**: 10GB/월 무료
- **Slow queries**: 1초 이상 걸리는 쿼리

**Firebase Console 경로**:
```
Firebase Console → Firestore → Usage 탭 → Performance
```

---

## 비용 최적화

### 1. 읽기 횟수 최소화

**✅ 권장: React Query 캐싱 활용**
```typescript
// 5분간 캐싱 → 5분 내 재요청 시 네트워크 비용 0
const { data } = useQuery({
  queryKey: ['participants', cohortId],
  queryFn: () => getParticipantsByCohort(cohortId),
  staleTime: 5 * 60 * 1000,
});
```

**비용 예시**:
- 1일 100명 접속 × 10번 참가자 목록 조회 = 1,000 reads
- React Query 캐싱 (5분) 적용 시: 100 reads (10배 절감)

### 2. 불필요한 실시간 구독 제거

**✅ 권장: 포커스 기반 구독**
```typescript
// 탭이 활성화되어 있을 때만 실시간 구독
useEffect(() => {
  if (!isVisible) return; // 백그라운드 탭에서는 구독 중지

  const unsubscribe = subscribeToMessages(conversationId, setMessages);
  return () => unsubscribe();
}, [conversationId, isVisible]);
```

### 3. 문서 크기 최소화

**✅ 권장: 큰 데이터는 Firebase Storage 사용**
```typescript
// ❌ 이미지를 Base64로 Firestore에 저장 (비효율)
{
  imageData: "data:image/png;base64,iVBORw0KGgoAAAANSUhE..." // 수십 KB
}

// ✅ Firebase Storage에 저장 후 URL만 Firestore에 저장
{
  imageUrl: "https://storage.firebase.com/..." // 수십 bytes
}
```

---

## 개발 워크플로우

### 1. 로컬 개발 환경

**✅ 권장: Firebase Emulator Suite 사용**
```bash
# Firebase Emulator 설치
npm install -g firebase-tools

# Emulator 시작
firebase emulators:start

# Emulator UI
http://localhost:4000
```

**이유**:
- 프로덕션 데이터 보호
- 무제한 읽기/쓰기 (비용 0)
- 빠른 개발 사이클

### 2. 시드 데이터 관리

**✅ 권장: 스크립트로 시드 데이터 생성**
```bash
# 기수 및 참가자 시드
npm run seed:cohorts

# 공지사항 시드
npm run seed:notices

# 전체 시드
npm run seed:all
```

**시드 스크립트 예시** (`scripts/seed-cohorts.ts`):
```typescript
import { createCohortWithId, createParticipant } from '@/lib/firebase';

async function seedCohorts() {
  // 기수 생성
  await createCohortWithId('cohort1', {
    name: '1기',
    startDate: '2025-01-01',
    endDate: '2025-03-31',
    isActive: true,
  });

  // 참가자 생성
  await createParticipant({
    cohortId: 'cohort1',
    name: '테스트 참가자',
    phoneNumber: '01012345678',
  });
}

seedCohorts();
```

### 3. 데이터 마이그레이션

**✅ 권장: 마이그레이션 스크립트 작성**
```typescript
// scripts/migrate-add-gender-field.ts
import { getAllParticipants, updateParticipant } from '@/lib/firebase';

async function migrateAddGenderField() {
  const participants = await getAllParticipants();

  for (const p of participants) {
    if (!p.gender) {
      await updateParticipant(p.id, {
        gender: 'other', // 기본값 설정
      });
    }
  }

  console.log('Migration complete');
}

migrateAddGenderField();
```

**실행**:
```bash
npx tsx src/scripts/migrate-add-gender-field.ts
```

---

## 체크리스트

### 새로운 쿼리 작성 시

- [ ] 복합 쿼리인가? → 인덱스 생성 확인
- [ ] `limit` 설정했는가?
- [ ] 에러 처리 (`try-catch`) 추가했는가?
- [ ] 실시간 구독이 정말 필요한가?
- [ ] React Query로 캐싱하는가?

### 새로운 필드 추가 시

- [ ] 보안 규칙 업데이트 필요한가?
- [ ] 기존 문서에 마이그레이션 필요한가?
- [ ] TypeScript 타입 정의 업데이트했는가?
- [ ] 문서 크기 제한 (1MB) 초과하지 않는가?

### 프로덕션 배포 전

- [ ] Firebase Console에서 사용량 확인
- [ ] 느린 쿼리 (> 1초) 개선
- [ ] 보안 규칙 테스트 완료
- [ ] 인덱스 생성 완료
- [ ] 에러 로깅 설정 완료 (Sentry 등)

---

## 관련 문서

- [데이터베이스 스키마](./schema.md)
- [쿼리 패턴 가이드](./query-patterns.md)
- [데이터베이스 최적화](../optimization/database.md)
- [Firebase 보안 규칙 퀵스타트](../setup/firebase-security-quickstart.md)

---

**최종 업데이트**: 2025년 10월 16일
**문서 위치**: `docs/database/best-practices.md`
**문서 버전**: v1.0

*이 문서는 projectpns 프로젝트의 Firestore 사용 모범 사례에 대한 유일한 권위 있는 문서입니다.*
