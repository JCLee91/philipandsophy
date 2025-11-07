# 📜 Scripts Guide

**Last Updated**: 2025-11-07

프로젝트의 핵심 스크립트 사용 가이드입니다.

---

## 🎯 핵심 npm 스크립트 (10개)

### 개발 필수 (5개)
```bash
npm run dev          # 개발 서버 시작 (localhost:3000)
npm run build        # 프로덕션 빌드
npm start            # 프로덕션 서버 시작
npm run lint         # ESLint 실행
```

### 데이터 관리 (2개)
```bash
npm run fix:duplicate-submissions  # 중복 독서 인증 제거
npm run migrate:storage            # Storage 구조 마이그레이션
```

### 운영 관리 (1개)
```bash
npm run update:cohort-active  # 코호트 활성화 상태 업데이트
```

### 통계 (2개)
```bash
npm run stats         # 전체 데이터베이스 통계
npm run stats:cohort1 # 코호트1 통계 생성
```

---

## 📂 스크립트 파일 위치

### `src/scripts/` (3개)
- `fix-duplicate-submissions.ts` - 중복 독서 인증 제거
- `migrate-storage-structure.ts` - Firebase Storage 구조 마이그레이션
- `update-cohort-active-status.ts` - 코호트 활성화 상태 관리

### `scripts/` (2개)
- `show-database-statistics.ts` - 데이터베이스 통계 출력
- `generate-cohort1-statistics.ts` - 코호트1 상세 통계

---

## 💡 사용 팁

### 직접 실행 (npm 스크립트에 없는 경우)
```bash
# TypeScript 파일 직접 실행
npx tsx src/scripts/[파일명].ts
npx tsx scripts/[파일명].ts
```

### Firebase Admin SDK
- 모든 스크립트는 Firebase Admin SDK 사용
- `.env.local`에 Firebase 설정 필요
- 프로덕션 데이터베이스 주의!

---

## ⚠️ 주의사항

- ❌ **프로덕션 환경에서 데이터 수정 스크립트 신중히 사용**
- ✅ **테스트 환경에서 먼저 검증 권장**
- ✅ **중요 데이터는 백업 후 실행**

---

**문의**: 스크립트 관련 문제는 프로젝트 관리자에게 문의하세요.
