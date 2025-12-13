# 배포 전 최종 검증 체크리스트 (Archive)

이 문서는 특정 시점/브랜치의 배포 검증 기록입니다. 현재 운영 체크는 `docs/setup/internal-service-secret.md` 및 `docs/setup/firebase.md` 등을 기준으로 진행하세요.

**작성일**: 2025-11-10
**브랜치**: refactor/random-matching-v2

---

## ✅ 1. Functions 배포 상태

### 배포 완료
```
✅ manualMatchingPreview
   - Version: v2
   - Region: asia-northeast3 (Seoul)
   - Memory: 1024 MB
   - Timeout: 900s (15분)
   - URL: https://manualmatchingpreview-vliq2xsjqa-du.a.run.app
   - 상태: 배포됨 (2025-11-10)

✅ scheduledMatchingPreview
   - Version: v2
   - Region: asia-northeast3 (Seoul)
   - Memory: 1024 MB
   - Schedule: 0 14 * * * (매일 14:00 KST)
   - 상태: 배포됨 (2025-11-10)
```

### 사용 중인 Helper
- `functions/src/lib/matching-inputs.ts`:
  - `loadProviders()` - Providers/Viewers 수집
  - `loadRecentMatchings()` - 최근 3일 이력
- `functions/src/lib/random-matching.ts`:
  - `matchParticipantsRandomly()` - 랜덤 매칭 엔진

---

## ✅ 2. 환경변수 설정

### Functions (.env)
```bash
✅ INTERNAL_SERVICE_SECRET=vDnfEPF...
✅ DEFAULT_COHORT_ID=2
```

### Next.js (.env.local)
```bash
✅ FUNCTIONS_BASE_URL=https://manualmatchingpreview-vliq2xsjqa-du.a.run.app
✅ INTERNAL_SERVICE_SECRET=vDnfEPF...
```

### Vercel Production (.env.vercel.production)
```bash
✅ FUNCTIONS_BASE_URL=https://manualmatchingpreview-vliq2xsjqa-du.a.run.app
✅ INTERNAL_SERVICE_SECRET=vDnfEPF...
```

### ⚠️ Vercel 대시보드 확인 필요
배포 후 Vercel 대시보드에서 환경변수 확인:
1. https://vercel.com/jclees-projects-c1bb6dfd/pslanding/settings/environment-variables
2. FUNCTIONS_BASE_URL 추가
3. INTERNAL_SERVICE_SECRET 추가
4. Production 환경 선택

---

## ✅ 3. Lint/Build 검증

### Next.js
```
✅ ESLint: 성공 (Error 0개, Warning 7개만)
✅ TypeScript: 성공 (tsc --noEmit)
✅ Build: 미실행 (Vercel에서 자동)
```

### Functions
```
✅ TypeScript Build: 성공
✅ 패키지 크기: 204.44 KB (최적화됨)
```

---

## ✅ 4. 코드 품질

### Single Source of Truth
```
✅ 매칭 엔진: functions/src/lib/random-matching.ts (1개)
✅ 데이터 수집: functions/src/lib/matching-inputs.ts (1개)
✅ Next.js API: 프록시만 (로직 없음)
```

### 성능 개선
```
✅ Batch 쿼리: cohort 참가자만 (10개씩)
✅ participationCode: 재참여자 정확히 구분
✅ 스키마: 맵 필드 올바른 조회
✅ N+1 쿼리: 제거됨
```

### 레거시 호환
```
✅ v2.0 우선: assigned[]
✅ v1.0 fallback: similar/opposite (과거 데이터)
✅ 타입: @deprecated 표시
```

---

## 🚀 내일 14:00 KST 실행 예상

### scheduledMatchingPreview 실행 플로우
```
1. ⏰ 14:00 KST - Cloud Scheduler 트리거
2. 🔍 loadProviders() - 어제 제출자 조회
3. 📊 loadRecentMatchings() - 최근 3일 이력
4. 🎲 matchParticipantsRandomly() - 랜덤 매칭 실행
5. 💾 Firestore 저장:
   - dailyFeaturedParticipants[날짜] = { assignments, matchingVersion: 'random' }
   - matching_results/cohortId-날짜 = 백업
6. 📨 sendMatchingNotifications() - 푸시 알림
```

### 로그 확인 방법
```bash
# Firebase Console → Functions → scheduledMatchingPreview → Logs
# 확인할 메시지:
# ✅ "🎲 Scheduled random matching started"
# ✅ "Loaded X providers, Y viewers"
# ✅ "Random matching completed"
# ✅ "✅ Updated dailyFeaturedParticipants"
```

---

## ⚠️ 배포 전 최종 확인사항

### Vercel 환경변수 설정 (중요!)
```
1. Vercel 대시보드 접속
2. Settings → Environment Variables
3. 추가 필요:
   - FUNCTIONS_BASE_URL
   - INTERNAL_SERVICE_SECRET
4. Environment: Production 선택
```

### Git Push
```bash
# 브랜치: refactor/random-matching-v2
git push  # 이미 완료

# Vercel 자동 배포 트리거
# - Preview 배포: 즉시
# - Production 배포: PR merge 후
```

---

## 📊 배포 체크리스트

- [x] Functions 배포 (manualMatchingPreview)
- [x] Functions 배포 (scheduledMatchingPreview)
- [x] Functions 환경변수 (.env)
- [x] Next.js 환경변수 (.env.local)
- [x] Vercel 환경변수 (.env.vercel.production)
- [ ] **Vercel 대시보드 환경변수** (수동 설정 필요)
- [x] Lint 검증 (Error 0개)
- [x] TypeScript 검증
- [x] Git Push (브랜치)
- [ ] **Vercel 배포** (PR merge 후)

---

## 🎯 다음 실행 시점

**자동 실행**: 내일 14:00 KST (2025-11-11)
- scheduledMatchingPreview 자동 트리거
- 랜덤 매칭 생성 및 저장
- 푸시 알림 발송

**수동 실행**: 언제든지
- 관리자 페이지 → 매칭 프리뷰 버튼
- Functions manualMatchingPreview 호출

---

**Last Updated**: 2025-11-10
**Status**: ✅ 배포 준비 완료 (Vercel 환경변수만 수동 설정 필요)
