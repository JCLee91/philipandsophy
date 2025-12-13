# 📜 Scripts Guide

**Last Updated**: 2025-12-13

프로젝트의 유지보수/마이그레이션/검증 스크립트 가이드입니다.

## 핵심 npm 스크립트

### 개발/품질
```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
npm run test
```

### 데이터 작업(주의)
```bash
npm run fix:duplicate-submissions
npm run migrate:storage
npm run migrate:notices-submissions
npm run migrate:uid-to-latest
npm run migrate:uid-to-latest:apply
npm run audit:schema
```

### 점검/유틸
```bash
npm run stats
npm run stats:cohort1
npm run test:phone
npm run test:doc-id
npm run check:template
npm run check:daily-questions
npm run check:participation-code
npm run cleanup:duplicate-uid
npm run cleanup:duplicate-uid:apply
npm run add:gender-data
npm run add:gender-data:apply
npm run convert:landing-images
```

## 스크립트 파일 위치

- `src/scripts/`: 앱과 가까운 마이그레이션/정리 스크립트
- `scripts/`: 운영/검증/일회성 유틸리티 스크립트

직접 실행:
```bash
npx tsx src/scripts/<file>.ts
npx tsx scripts/<file>.ts
```

## Firebase Admin SDK 주의사항

- 일부 스크립트는 `firebase-service-account.json`(루트)에 의존합니다.
- 프로덕션 데이터에 영향을 줄 수 있으니 `--apply` 플래그가 있는 스크립트는 특히 주의하세요.
