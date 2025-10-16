# Data Center B2B 대시보드 전문화 개선 계획

**버전**: 2.0.0
**최종 업데이트**: 2025-10-14
**예상 기간**: 4-6일
**리서치 기반**: Stripe, Amplitude, Mixpanel, Power BI 2025 트렌드

---

## 📊 리서치 요약

### 2025 B2B 대시보드 핵심 트렌드

1. **AI 인사이트 자동 발견**: 변화 자동 감지 및 경고
2. **Actionable > Real-time**: 실시간보다 행동 가능한 인사이트
3. **컨텍스트 필수**: 단순 숫자가 아닌 비교 데이터 (전주, 전월, 목표)
4. **시각적 계층**: 중요한 것 → 맥락 → 상세 순서
5. **5-10 KPI 최적**: 너무 많으면 집중력 저하

### Stripe/Amplitude/Mixpanel 공통 패턴

- ✅ 변화율 표시 (↑5%, ↓3%)
- ✅ 색상 코딩 (녹색/노란색/빨간색)
- ✅ 상태 뱃지 (활성/경고/위험)
- ✅ 코호트 리텐션 히트맵
- ✅ 인게이지먼트 점수
- ✅ Quick Actions (빠른 작업)

---

## 🎯 Phase A: 개요 대시보드 전문화 (1-2일)

### A1. 개선된 KPI 카드 (변화율 + 비교)

**현재**:
```
총 참가자
   42
```

**개선**:
```
총 참가자
   42     ↑ 5 (13%)
   ────────────────
   전주: 37명
```

**구현**:
- `EnhancedMetricCard.tsx` 생성
- 전주/전월 비교 데이터 API 추가
- TrendIndicator 통합

### A2. 위험 신호 패널 (AlertPanel)

```tsx
<AlertPanel>
  ⚠️ 주의 필요
  • 7일 미인증: 3명
  • 푸시 알림 미허용: 12명 (28%)
  • 이번 주 참여율: 68% (목표: 80%)

  → 휴면 참가자에게 DM 보내기
</AlertPanel>
```

**알고리즘**:
- 7일 이상 미인증 참가자 카운트
- 푸시 미허용 비율 계산
- 주간 참여율 계산 (이번 주 인증 / 총 참가자)

### A3. 활성/휴면 참가자 도넛 차트

```
참가자 상태 분포
───────────────
🟢 활성 (3일 이내): 28명 (67%)
🟡 보통 (4-7일): 10명 (24%)
🔴 휴면 (7일 이상): 4명 (9%)
```

**Recharts PieChart 사용**

### A4. 추가 핵심 지표

**신규 KPI**:
- **평균 인증 주기**: N일마다 1회
- **주간 참여율**: 이번 주 인증 참가자 / 총 참가자
- **완주율**: 마지막 주까지 참여한 비율

---

## 🔥 Phase B: 코호트 리텐션 분석 (1-2일)

### B1. 주차별 리텐션 히트맵

```
코호트별 주차별 참여율
─────────────────────────
        1주   2주   3주   4주   5주
1기    100%  85%   72%   68%   65%
2기    100%  90%   85%   82%   78%
3기    100%  88%   80%   75%   70%
```

**시각화**:
- 색상 그라데이션 (진한 녹색 100% → 연한 회색 0%)
- 클릭 시 드릴다운 (해당 주차 미인증 참가자 목록)

### B2. 코호트 비교 차트

**라인 차트**:
- X축: 주차 (1주, 2주, 3주...)
- Y축: 참여율 (0-100%)
- 각 코호트별 라인 (1기, 2기, 3기)
- 목표선 (80% 기준선)

### B3. 핵심 지표

- **평균 리텐션**: 전체 코호트 평균 참여율
- **최고/최저 코호트**: 참여율 기준
- **드롭오프 주차**: 가장 많이 이탈하는 주차

---

## 👤 Phase C: 참가자 인게이지먼트 (1일)

### C1. 인게이지먼트 점수 계산

```typescript
// 점수 = (실제 인증 횟수 / 운영 주차) * 10
// 예: 4주차에 8회 인증 = (8 / (4*7)) * 100 = 28.5점

function calculateEngagement(submissionCount: number, weeksPassed: number): number {
  const expectedDays = weeksPassed * 7;
  return Math.round((submissionCount / expectedDays) * 100);
}
```

**등급**:
- 🟢 80-100점: 우수
- 🟡 50-79점: 보통
- 🔴 0-49점: 저조

### C2. 테이블 컬럼 추가

| 이름 | 코호트 | 점수 | 상태 | 마지막 활동 | 알림 |
|------|--------|------|------|-------------|------|
| 김OO | 1기 | 85 🟢 | 활성 | 1일 전 | ✅ |
| 이OO | 1기 | 45 🔴 | 휴면 | 9일 전 | ❌ |

### C3. 필터 옵션

- 활동 상태: 전체 / 활성 / 보통 / 휴면
- 인게이지먼트: 전체 / 우수 / 보통 / 저조
- 푸시 알림: 전체 / 허용 / 거부

---

## 📖 Phase D: 독서 인증 분석 (1일)

### D1. 시간대별 제출 분포 (Bar Chart)

```
시간대별 인증 제출
────────────────
06-09시: ████ 15%
09-12시: ██████ 25%
12-15시: ████ 15%
15-18시: ████ 15%
18-21시: ██████████ 40%
21-24시: ████ 15%
```

**인사이트**:
- "저녁 시간대(18-21시) 제출이 가장 많습니다"

### D2. 책 다양성 지표

```
책 통계
────────
총 책 종류: 127권
평균 중복도: 1.3회 (같은 책을 여러 명이 읽음)

📚 인기 책 Top 5
1. 데일 카네기의 인간관계론 (12명)
2. 사피엔스 (8명)
3. 미드나잇 라이브러리 (7명)
```

### D3. 리뷰 품질 분석

```
리뷰 품질
────────
평균 길이: 87자
긴 리뷰(200자 이상): 35%
책 표지 첨부율: 92%
```

---

## 🚀 Phase E: Quick Actions & 인사이트 (1일)

### E1. Quick Actions 패널

```tsx
<QuickActionsPanel>
  빠른 작업

  → 휴면 참가자 4명에게 DM 보내기
  → 푸시 미허용 12명 확인
  → 이번 주 미인증 참가자 보기
  → 코호트 리텐션 보고서 다운로드
</QuickActionsPanel>
```

### E2. AI 스타일 인사이트

```tsx
<InsightsPanel>
  💡 주요 인사이트

  • 1기 참여율이 지난 주 대비 12% 감소했습니다
  • 푸시 알림 허용 참가자의 인증률이 2.3배 높습니다
  • 저녁 시간대(18-21시) 인증이 40%를 차지합니다
  • 3명의 참가자가 7일간 활동이 없습니다
</InsightsPanel>
```

**계산 로직**:
- 주간 변화율 자동 계산
- 푸시 허용/거부 그룹 인증률 비교
- 시간대별 분포 분석
- 휴면 참가자 자동 감지

---

## 📁 생성될 파일 목록 (약 20개)

### 공통 컴포넌트 (6개)
- `src/components/datacntr/common/TrendIndicator.tsx` ✅
- `src/components/datacntr/common/StatusBadge.tsx` ✅
- `src/components/datacntr/common/EnhancedMetricCard.tsx`
- `src/components/datacntr/common/AlertPanel.tsx`
- `src/components/datacntr/common/InsightsPanel.tsx`
- `src/components/datacntr/common/QuickActionsPanel.tsx`

### 대시보드 컴포넌트 (4개)
- `src/components/datacntr/dashboard/ParticipantStatusChart.tsx` (도넛)
- `src/components/datacntr/dashboard/RetentionHeatmap.tsx`
- `src/components/datacntr/dashboard/SubmissionTimeChart.tsx` (시간대)
- `src/components/datacntr/dashboard/PopularBooksChart.tsx`

### API 확장 (5개)
- `src/app/api/datacntr/stats/overview/route.ts` (수정 - 변화율)
- `src/app/api/datacntr/stats/insights/route.ts` (신규)
- `src/app/api/datacntr/stats/participant-status/route.ts` (신규)
- `src/app/api/datacntr/cohorts/retention/route.ts` (신규)
- `src/app/api/datacntr/submissions/analytics/route.ts` (신규)

### 페이지 수정 (5개)
- `src/app/datacntr/page.tsx` (개요 - 대폭 개선)
- `src/app/datacntr/cohorts/page.tsx` (리텐션 히트맵 추가)
- `src/app/datacntr/cohorts/[id]/page.tsx` (차트 추가)
- `src/app/datacntr/participants/page.tsx` (점수, 상태 추가)
- `src/app/datacntr/submissions/page.tsx` (분석 차트 추가)

---

## 💻 구현 예상 시간

| Phase | 작업 | 예상 시간 |
|-------|------|-----------|
| A | 개요 대시보드 전문화 | 6-8시간 |
| B | 코호트 리텐션 분석 | 4-6시간 |
| C | 인게이지먼트 점수 | 3-4시간 |
| D | 독서 인증 분석 | 3-4시간 |
| E | Quick Actions | 2-3시간 |
| **합계** | **전체** | **18-25시간 (3-4일)** |

---

## 🎯 즉시 구현 vs 점진적 구현

### Option 1: 핵심만 빠르게 (6시간)
- ✅ Phase A (변화율 + 위험 신호)
- ✅ Phase C (상태 뱃지만)
- 나머지는 추후

### Option 2: 전체 구현 (3-4일)
- ✅ Phase A~E 모두
- 완벽한 전문 대시보드

---

**어떻게 진행할까요?**

현재 코드는 이미 커밋되었으므로:
1. 핵심만 빠르게 구현 후 테스트
2. 점진적으로 기능 추가
3. 각 Phase마다 커밋

이 방식으로 진행하겠습니다!

---

**Last Updated**: 2025-10-14
