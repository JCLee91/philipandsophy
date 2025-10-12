# 버그 수정 계획

**작성일**: 2025-10-12
**대상 파일**: `src/app/app/chat/today-library/page.tsx`

## 🎯 수정 목표

1. **Critical Bug #1**: 날짜 정렬 오류 수정 (순차 읽기 로직)
2. **Critical Bug #2**: submissionDate 형식 검증 추가
3. **Critical Bug #3**: 빈 배열 Edge Case 처리
4. **Issue #7**: React Query 캐싱 정책 일관성
5. **Issue #8**: 에러 핸들링 강화

---

## 📝 수정 상세

### 1. 독서 인증 기록 쿼리 개선 (Line 45-68)

**변경 사항**:
- submissionDate 형식 검증 (YYYY-MM-DD)
- null/undefined 필터링
- 에러 핸들링 추가
- 캐싱 정책 통일 (gcTime: 0, staleTime: 0)

```typescript
// ✅ 개선된 코드
const {
  data: userSubmissions = [],
  isError: submissionsError,
  error: submissionsErrorObj
} = useQuery({
  queryKey: ['user-submissions', currentUserId, cohortId],
  queryFn: async () => {
    if (!currentUserId || !cohortId) return [];

    try {
      const db = getDb();
      const submissionsRef = collection(db, 'reading_submissions');
      const q = query(
        submissionsRef,
        where('participantId', '==', currentUserId),
        where('cohortId', '==', cohortId)
      );
      const snapshot = await getDocs(q);

      return snapshot.docs
        .map(doc => {
          const data = doc.data();
          const rawDate = data.submissionDate;

          // 날짜 검증 및 정규화
          if (!rawDate || typeof rawDate !== 'string') {
            logger.warn('Invalid submissionDate', { docId: doc.id, rawDate });
            return null;
          }

          // YYYY-MM-DD 형식 검증
          if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
            logger.warn('Invalid date format', { docId: doc.id, rawDate });
            return null;
          }

          return {
            id: doc.id,
            submissionDate: rawDate,
          };
        })
        .filter((item): item is { id: string; submissionDate: string } => item !== null);
    } catch (error) {
      logger.error('Failed to fetch user submissions', error);
      throw error;
    }
  },
  enabled: !!currentUserId && !!cohortId,
  gcTime: 0,      // 캐시 지속성 방지 (세션 간 캐시 문제 해결)
  staleTime: 0,   // 항상 신선한 데이터 fetch
  retry: 2,       // 최대 2번 재시도
});
```

---

### 2. 못 본 프로필북 로직 개선 (Line 71-90)

**변경 사항**:
- Set 사용으로 O(n) 성능 개선
- 명시적 시간순 정렬 (localeCompare)
- 순차 읽기 로직 (가장 오래된 못 본 것 선택)
- 빈 배열 Edge Case 처리 (null 반환)
- 모두 봤을 때 가장 최근 프로필북 반환

```typescript
// ✅ 개선된 코드
const submissionDate = useMemo(() => {
  // 모든 가용한 매칭 날짜들 (명시적 시간순 정렬)
  const allMatchingDates = cohort?.dailyFeaturedParticipants
    ? Object.keys(cohort.dailyFeaturedParticipants).sort((a, b) => a.localeCompare(b))
    : [];

  // 매칭 데이터가 없는 경우
  if (allMatchingDates.length === 0) {
    logger.info('No matching data available', { cohortId });
    return null;  // null 반환하여 명시적으로 처리
  }

  // 사용자가 본 프로필북 날짜들 (Set으로 O(1) 조회)
  const viewedDatesSet = new Set(userSubmissions.map(s => s.submissionDate));

  // 못 본 매칭 날짜들
  const unseenDates = allMatchingDates.filter(date => !viewedDatesSet.has(date));

  // 못 본 것 중 가장 오래된 것 (순차 읽기)
  if (unseenDates.length > 0) {
    logger.info('Found unseen profile book', { date: unseenDates[0], total: unseenDates.length });
    return unseenDates[0];
  }

  // 모두 봤다면 가장 최근 프로필북 (재방문 허용)
  const latestDate = allMatchingDates[allMatchingDates.length - 1];
  logger.info('All profile books viewed, showing latest', { date: latestDate });
  return latestDate;
}, [cohort, userSubmissions]);
```

---

### 3. 매칭 결과 조회 개선 (Line 92-100)

**변경 사항**:
- null 체크 강화
- 명시적 검증 로직

```typescript
// ✅ 개선된 코드
const rawMatching = useMemo(() => {
  if (!cohort || !submissionDate) {
    logger.warn('Missing cohort or submissionDate', { cohortId, submissionDate });
    return null;
  }

  if (!cohort.dailyFeaturedParticipants) {
    logger.info('No dailyFeaturedParticipants', { cohortId });
    return null;
  }

  const matching = cohort.dailyFeaturedParticipants[submissionDate];
  if (!matching) {
    logger.info('No matching for date', { cohortId, submissionDate });
    return null;
  }

  return matching;
}, [cohort, submissionDate]);

const todayMatching = useMemo(() => {
  // 매칭 데이터가 없으면 null 반환
  if (!rawMatching) return null;

  // v1.0/v2.0 형식 모두 처리
  return normalizeMatchingData(rawMatching);
}, [rawMatching]);
```

---

### 4. 에러 UI 추가 (Line 196 이후)

**변경 사항**:
- submissionsError 체크 추가
- 사용자 친화적 에러 메시지

```typescript
// ✅ 새로운 에러 UI (로딩 상태 체크 전에 삽입)
if (submissionsError) {
  return (
    <PageTransition>
      <div className="app-shell flex flex-col overflow-hidden">
        <HeaderNavigation title="오늘의 서재" />
        <main className="flex-1 overflow-y-auto bg-background flex items-center justify-center">
          <div className="text-center space-y-6 p-6">
            {/* Error Icon */}
            <div className="flex justify-center">
              <div className="size-20 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="size-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>

            {/* Error Message */}
            <div className="space-y-3">
              <h3 className="font-bold text-lg text-gray-900">
                데이터를 불러오는 중<br />오류가 발생했습니다
              </h3>
              <p className="text-sm text-gray-600">
                네트워크 연결을 확인하고<br />다시 시도해주세요
              </p>
            </div>

            {/* Retry Button */}
            <button
              type="button"
              onClick={() => router.refresh()}
              className="bg-black text-white rounded-lg px-6 py-3 font-semibold text-base transition-colors hover:bg-gray-800 active:bg-gray-900"
            >
              다시 시도
            </button>
          </div>
        </main>
      </div>
    </PageTransition>
  );
}
```

---

## 🧪 Verification Steps

### 1. 타입 체크
```bash
npx tsc --noEmit
```

### 2. 테스트 시나리오

#### 시나리오 A: 신규 사용자
```
입력:
- userSubmissions = []
- allMatchingDates = ['2025-10-08', '2025-10-09', '2025-10-10']

기대 출력:
- submissionDate = '2025-10-08' (가장 오래된 것)
- rawMatching = cohort.dailyFeaturedParticipants['2025-10-08']
```

#### 시나리오 B: 일부 본 사용자
```
입력:
- userSubmissions = [{ submissionDate: '2025-10-08' }]
- allMatchingDates = ['2025-10-08', '2025-10-09', '2025-10-10']

기대 출력:
- submissionDate = '2025-10-09' (못 본 것 중 가장 오래된 것)
```

#### 시나리오 C: 모두 본 사용자
```
입력:
- userSubmissions = [
    { submissionDate: '2025-10-08' },
    { submissionDate: '2025-10-09' },
    { submissionDate: '2025-10-10' }
  ]
- allMatchingDates = ['2025-10-08', '2025-10-09', '2025-10-10']

기대 출력:
- submissionDate = '2025-10-10' (가장 최근 프로필북)
```

#### 시나리오 D: 매칭 데이터 없음
```
입력:
- userSubmissions = []
- dailyFeaturedParticipants = {}

기대 출력:
- submissionDate = null
- allFeaturedIds.length = 0
- Empty State UI 표시
```

#### 시나리오 E: 잘못된 날짜 형식
```
입력:
- Firestore 데이터: { submissionDate: '2025-10-7' }  // 0 패딩 없음

기대 출력:
- userSubmissions = []  // 필터링됨
- logger.warn 호출
```

---

## 🔒 Prevention

### 1. 데이터 품질 체크
- Firestore 스키마 검증 강화
- submissionDate 필드에 대한 보안 규칙 추가:
  ```
  // firestore.rules
  match /reading_submissions/{submissionId} {
    allow create: if request.resource.data.submissionDate.matches('^\\d{4}-\\d{2}-\\d{2}$');
  }
  ```

### 2. 단위 테스트 추가
```typescript
// src/app/app/chat/today-library/__tests__/page.test.tsx
describe('TodayLibraryPage - Date Logic', () => {
  test('신규 사용자는 가장 오래된 프로필북을 봄', () => {
    const allMatchingDates = ['2025-10-08', '2025-10-09', '2025-10-10'];
    const userSubmissions = [];

    const result = selectSubmissionDate(allMatchingDates, userSubmissions);
    expect(result).toBe('2025-10-08');
  });

  test('모두 본 사용자는 가장 최근 프로필북을 봄', () => {
    const allMatchingDates = ['2025-10-08', '2025-10-09', '2025-10-10'];
    const userSubmissions = [
      { submissionDate: '2025-10-08' },
      { submissionDate: '2025-10-09' },
      { submissionDate: '2025-10-10' }
    ];

    const result = selectSubmissionDate(allMatchingDates, userSubmissions);
    expect(result).toBe('2025-10-10');
  });
});
```

### 3. 모니터링 추가
- Sentry에 날짜 형식 오류 리포팅
- 매칭 데이터 누락 알림
- 사용자 독서 인증 패턴 분석

---

## 📊 Impact Summary

| 항목 | 변경 전 | 변경 후 |
|-----|--------|--------|
| 날짜 정렬 | 사전순 (암묵적) | 시간순 (명시적) |
| 성능 | O(m × n) | O(m + n) |
| 에러 핸들링 | 없음 | try-catch + 에러 UI |
| 날짜 검증 | 없음 | 정규식 검증 |
| 빈 배열 처리 | fallback 부정확 | null 반환 (명시적) |
| 캐싱 정책 | 불일치 | 통일 (gcTime: 0) |
| 로깅 | 부족 | 상세 로깅 |

---

## ✅ Checklist

수정 후 반드시 확인:

- [ ] TypeScript 타입 에러 없음 (`npx tsc --noEmit`)
- [ ] ESLint 경고 없음 (`npm run lint`)
- [ ] 빌드 성공 (`npm run build`)
- [ ] 신규 사용자 시나리오 테스트
- [ ] 모두 본 사용자 시나리오 테스트
- [ ] 매칭 데이터 없는 경우 테스트
- [ ] 네트워크 오류 시나리오 테스트 (DevTools에서 Offline 모드)
- [ ] 로그 확인 (개발자 도구 Console)
- [ ] Firestore 보안 규칙 업데이트 (선택)

---

**수정 완료 후 이 파일을 삭제하고 커밋하세요.**
