# 📚 필립앤소피 프로젝트 문서

이 폴더는 프로젝트의 모든 기술 문서를 포함합니다. 문서는 카테고리별로 정리되어 있습니다.

## 📊 문서 상태 요약

- **총 문서 수**: ~32개
- **최근 업데이트**: 17개 문서 (2025-11-04)
- **마지막 종합 리뷰**: 2025-11-04
- **문서 커버리지**: 모든 주요 기능 문서화 완료

## 📂 문서 구조

```
docs/
├── setup/              # 초기 설정 및 환경 구성
├── optimization/       # 성능 최적화 문서
├── design/             # 디자인 시스템 및 가이드
├── architecture/       # 아키텍처 및 기획 문서
├── implementation/     # 구현 가이드 및 로드맵
├── database/           # 데이터베이스 스키마 및 쿼리 문서
├── api/                # API 레퍼런스 및 통합 문서
├── migration/          # 데이터 마이그레이션 기록
└── troubleshooting/    # 플랫폼별 버그 및 문제 해결
```

---

## 🚀 시작하기

처음 프로젝트를 시작하시나요? 이 문서들을 순서대로 읽어보세요:

1. **[Firebase 설정](./setup/firebase.md)** - Firebase 프로젝트 생성 및 연동 (V2.0)
2. **[Admin SDK 설정](./setup/admin-sdk.md)** - Firebase Admin SDK 구성 (V1.1)
3. **[Firebase Custom Claims 설정](./setup/firebase-custom-claims.md)** - Ghost 및 Super Admin 역할 구성
4. **[Internal Service Secret 설정](./setup/internal-service-secret.md)** - Cron ↔ Next.js API 내부 인증
5. **[iOS PWA Web Push 구현](./setup/web-push-implementation.md)** - iOS Safari PWA 푸시 알림 완전 가이드 (V1.1.0)
6. **[Push Notifications 설정](./setup/push-notifications.md)** - Firebase Cloud Messaging 구성
7. **[Deployment Checklist](./setup/DEPLOYMENT-CHECKLIST.md)** - 프로덕션 배포 전 체크리스트

### 개발 워크플로우

프로젝트 개발 방법론 및 Git 사용법:

8. **[GitHub Flow 가이드](./development/github-flow-guide.md)** - 브랜치 전략 및 PR 기반 개발 워크플로우
9. **[Branch Protection 설정](./development/branch-protection-guide.md)** - main 브랜치 보호 및 안전한 배포

---

## 🗄️ 데이터베이스

프로젝트의 Firestore 데이터베이스 구조와 사용법:

### [Firestore 스키마 문서](./database/schema.md)
**최종 업데이트**: 2025-11-04 (V1.1)
**주요 내용**:
- 📊 전체 데이터베이스 구조 (6개 메인 컬렉션)
- 👻 Ghost 역할 및 Super Admin 시스템
- 📝 Draft 상태를 포함한 공지사항 시스템
- 🔍 상세 스키마 및 필드 설명
- 📐 관계도 (ERD) 및 인덱스 전략
- 🔒 Firebase 보안 규칙 상세 (Custom Claims 포함)
- 💻 코드 예시 및 타입 정의
- 📝 쿼리 패턴 및 사용 예제

### [쿼리 패턴 가이드](./database/query-patterns.md)
**최종 업데이트**: 2025-11-04 (V1.1)
**주요 내용**:
- 🔍 기본 쿼리 패턴 (조회, 필터링, 정렬)
- ⚡ 실시간 구독 패턴 (onSnapshot)
- 🎯 React Query 통합 전략
- 📈 성능 최적화 패턴 (캐싱, 클라이언트 필터링)
- 🔄 트랜잭션 패턴 (원자적 읽기-수정-쓰기)
- 📄 페이지네이션 패턴 (Cursor 기반)
- 👻 Ghost 및 Super Admin 쿼리 패턴

### [데이터베이스 Best Practices](./database/best-practices.md)
**최종 업데이트**: 2025-11-04 (V1.1)
**주요 내용**:
- 📐 데이터 모델링 원칙 (플랫 구조, 비정규화)
- ⚡ 쿼리 최적화 전략 (인덱스, limit, 실시간 구독)
- 🔒 보안 규칙 모범 사례 (최소 권한, Custom Claims, Ghost 역할)
- 🐛 에러 처리 패턴 (try-catch, 재시도 로직)
- 💰 비용 최적화 (읽기 횟수 최소화, 캐싱)
- 🛠️ 개발 워크플로우 (Emulator, 시드 데이터, 마이그레이션)

---

## ⚡ 성능 최적화

프로젝트의 성능을 이해하고 개선하려면:

### [성능 최적화 가이드](./optimization/performance.md)
**최종 업데이트**: 2025-10-13
**주요 내용**:
- ✅ Level 1: React Query 3단계 캐시 전략 (STATIC/SEMI_DYNAMIC/REAL_TIME)
- ✅ Level 2: Prefetch & Zustand 구독 최적화
- ✅ Level 3: 코드 스플리팅 & 세부 튜닝
- ✨ Shimmer 애니메이션 시스템 (globals.css)
- 🐛 랜딩페이지 스크롤 버그 수정 (AppBodyClass 컴포넌트)
- 📊 성능 측정: Firebase Read 60-70% 감소, 로딩 속도 80% 개선

### [데이터베이스 최적화](./optimization/database.md)
**최종 업데이트**: 2025-11-04 (V1.3.0)
**주요 내용**:
- 🗄️ Firebase/Firestore 스키마 문서화 (6개 컬렉션)
- 👥 사용자 관리 시스템 (관리자 3명 + Ghost/Super Admin)
- 👻 Ghost 역할 시스템 (데이터 숨김 처리)
- 📦 Firebase Storage 통합 (공지/독서인증/DM 이미지)
- 🔍 쿼리 패턴 및 베스트 프랙티스
- 🔄 실시간 구독 관리 전략
- 📈 성능 지표: 읽기 69.5% 감소, 구독자 85.7% 감소

---

## 🎨 디자인 시스템

일관된 UI/UX를 위한 디자인 가이드:

### [디자인 시스템 - 종합판](./design/design-system.md)
**최종 업데이트**: 2025-11-04 (V1.1)
**주요 내용**:
- 🎨 디자인 원칙 (Glassmorphism 랜딩, Minimalism 멤버 포털, Professional 데이터 센터)
- 🌈 색상 시스템 (Primary/Secondary/Semantic 색상, 그라데이션)
- 📝 타이포그래피 (Pretendard Variable 폰트, 크기 스케일, 한글 고려사항)
- 🧩 컴포넌트 라이브러리 (Shadcn UI + 커스텀 컴포넌트)
- 📐 레이아웃 시스템 (그리드, 간격 스케일, 반응형 브레이크포인트)
- 🎯 디자인 토큰 (색상, 간격, 타이포그래피, 그림자, Border Radius, 트랜지션)
- 🔘 통일된 버튼 시스템 (FooterActions 기반 Primary/Secondary)
- ♿ 접근성 가이드 (WCAG 2.1 AA 준수, 키보드 내비게이션, 스크린 리더)
- 📱 반응형 패턴 (Mobile-First, 브레이크포인트 전략)
- ✨ Shimmer 애니메이션 시스템 (로딩 상태 통일)

### [버튼 디자인 시스템](./design/button-system.md)
**최종 업데이트**: 2025-11-04 (V1.1)
**주요 내용**:
- ✅ Primary/Secondary 버튼 통일 스타일 (FooterActions 기반)
- ✅ 디자인 토큰 및 시각적 사양 (간격, 색상, 타이포그래피)
- ✅ 접근성 가이드 (WCAG AAA, 키보드 내비게이션, 스크린 리더)
- ✅ Shadcn Button 마이그레이션 가이드
- 📝 웹 앱(`/app/*`) 전용 - 랜딩 페이지 제외

### [UI 디자인 가이드](./design/ui-guide.md)
**최종 업데이트**: 2025-11-04 (V1.1)
**주요 내용**:
- 컴포넌트 디자인 시스템
- 색상 팔레트 및 타이포그래피
- 레이아웃 및 그리드 시스템
- 반응형 디자인 가이드

### [애니메이션 가이드](./design/animation.md)
**최종 업데이트**: 2025-11-04 (V1.1)
**주요 내용**:
- 애니메이션 원칙 및 패턴
- Framer Motion 사용 가이드
- 트랜지션 및 인터랙션
- 성능 고려사항

---

## 🏗️ 아키텍처

프로젝트의 구조와 설계를 이해하려면:

### [제품 요구사항 문서 (PRD) - 종합판](./architecture/prd-comprehensive.md) ✨ NEW
**최종 업데이트**: 2025-10-16
**주요 내용**:
- 📋 프로젝트 배경 및 문제 정의 (참가자/운영자/지원자 Pain Points)
- 🎯 제품 비전 및 목표 (단기/중기/장기)
- 👥 대상 사용자 페르소나 (전문직 종사자 25-40세)
- ✨ 핵심 기능 상세 명세 (랜딩/인증/공지/독서 인증/AI 매칭/프로필북/데이터 센터)
- 📊 성공 지표 (정량/정성/비즈니스 지표)
- 📝 사용자 스토리 (15+ 스토리, 인수 기준 포함)
- 🛠️ 기술 스택 및 제약사항 (성능/확장성/보안/접근성)
- 🚫 비범위 (V1.0 제외 기능 및 완전 제외 기능)
- 📅 일정 및 마일스톤 (V1.0 완료, V2.0/V3.0 로드맵)
- ⚠️ 리스크 관리 (기술/운영/사용성/비즈니스 리스크)
- ❓ FAQ (10개 주요 질문과 답변)

### [기술 요구사항 문서 (TRD) - 종합판](./architecture/trd-comprehensive.md)
**최종 업데이트**: 2025-11-04 (V1.1)
**주요 내용**:
- 🏗️ 시스템 아키텍처 (Next.js 15 + Firebase 서버리스)
- 🔧 기술 스택 상세 (React 19, TypeScript 5, Tailwind CSS 3.4)
- 📊 Firebase 통합 (Firestore 6개 컬렉션, Storage, Custom Claims)
- 👻 Ghost/Super Admin 역할 시스템
- 📝 Draft 상태 공지사항 시스템
- 📋 Notice 템플릿 시스템
- 🔒 보안 아키텍처 (4-layer: Input → API → Security Rules → Encryption)
- ⚡ 성능 최적화 (React Query 3단계 캐싱 전략, 69.5% 읽기 감소)
- 📱 PWA 및 모바일 최적화 (iOS Safe Area, position:fixed 버그 수정)
- 🚀 배포 전략 (Vercel CI/CD, Preview/Production 환경)
- 🧪 테스트 전략 (TDD 원칙, 70% Unit / 20% Integration / 10% E2E)
- 📡 외부 API 통합 (Naver Book Search, OpenAI GPT)
- 📈 확장성 설계 (수평/수직 확장, Firebase Quota 관리)

### [시스템 아키텍처 문서](./architecture/system-architecture.md)
**최종 업데이트**: 2025-11-04 (V1.1.0)
**주요 내용**:
- 🗺️ 전체 시스템 아키텍처 (3개 섹션: 랜딩/멤버 포털/데이터 센터)
- 🛤️ 라우팅 전략 (Next.js 15 App Router, 동적 라우트, 리다이렉트)
- 🔄 상태 관리 (React Query, Firebase onSnapshot, Zustand, Context API)
- 🔐 인증/권한 시스템 (4자리 코드, Firebase Phone Auth, Custom Claims, Ghost 역할)
- 📊 데이터 흐름 다이어그램 (독서 인증, 공지사항, AI 매칭 플로우)
- 📁 파일 조직 구조 (src/ 디렉토리 상세 설명)
- 🔗 모듈 의존성 (Circular Dependency 방지 전략)
- 🛡️ 보안 아키텍처 (입력 검증, API 검증, Security Rules, 암호화)
- 📈 확장성 고려사항 (수평/수직 확장 전략)

### [정보 구조 (IA)](./architecture/ia.md)
**최종 업데이트**: 2025-10-13
**주요 내용**:
- ✅ 3-Tier 아키텍처 (랜딩/프로그램/웹앱)
- ✅ 전체 라우트 구조
- ✅ 사용자 흐름 및 네비게이션
- ✅ 컴포넌트 계층 구조
- ✅ SEO 및 접근성

### [날짜 로직 설계 (Date Logic)](./architecture/date-logic.md)
**최종 업데이트**: 2025-10-13
**주요 내용**:
- 📅 3가지 날짜 개념 명확화 (제출/매칭/질문)
- 🔄 매칭 시스템 날짜 플로우 다이어그램
- ✅ 날짜 사용 규칙 및 DO/DON'T 가이드
- 🐛 날짜 관련 버그 트러블슈팅
- 🛠️ 핵심 함수 레퍼런스 (getTodayString/getYesterdayString)
- 📝 API별 날짜 사용 규칙 (Preview/Confirm/GET/Scheduled)

---

## 🔌 API 문서

모든 API 및 Firebase 작업 레퍼런스:

### [API 레퍼런스 - 종합판](./api/api-reference.md)
**최종 업데이트**: 2025-11-04 (V2.0.0)
**주요 내용**:
- 🔥 Firebase Client SDK 작업 (40+ 엔드포인트 문서화)
  - `cohorts.ts`: 15+ 함수 (createCohort, updateDailyFeaturedParticipants 등)
  - `participants.ts`: 12+ 함수 (createParticipant, updateParticipantBookInfo, Ghost 역할 관리 등)
  - `submissions.ts`: 10+ 함수 + 실시간 구독 (subscribeParticipantSubmissions 등)
  - `notices.ts`: 8+ 함수 (createNotice, toggleNoticePin, Draft 상태 관리 등)
  - `messages.ts`: 12+ 함수 (createMessage, markConversationAsRead 등)
  - `storage.ts`: 9+ 함수 (uploadReadingImage, uploadDMImage 등)
  - `auth.ts`: Phone Auth 함수 (sendSmsVerification, confirmSmsCode 등)
- 🌐 외부 API
  - Naver Book Search API (searchNaverBooks, cleanBookData)
  - OpenAI API (AI 매칭 플로우, 프롬프트 구조, 요청/응답 예시)
- 🛣️ Next.js API 라우트
  - `/api/search-books` (GET) - Naver API 프록시
  - `/api/admin/matching` (POST) - AI 매칭 실행
  - `/api/admin/matching/preview` (GET) - 매칭 미리보기
  - `/api/admin/matching/confirm` (POST) - 매칭 확정
- 🚨 에러 처리 및 Rate Limiting (Firebase, Phone Auth, 외부 API)
- 💻 모든 함수의 TypeScript 시그니처 및 사용 예시

---

## 🛠️ 개발 가이드

개발 환경 설정 및 워크플로우:

### [개발 환경 설정 및 워크플로우](./development/setup-guide.md)
**최종 업데이트**: 2025-10-16
**주요 내용**:
- 📋 필수 요구사항 (Node.js v18+, npm, Git, Firebase CLI)
- 🚀 초기 설정 (5단계 가이드: Clone → Install → Env → Firebase → Run)
- 🔑 환경 변수 (.env.local 템플릿 및 검증 스크립트)
- 🔥 Firebase 설정 (7단계: 프로젝트 생성, Firestore, Storage, Auth, Rules, Service Account)
- 💻 개발 워크플로우 (npm scripts, Hot Reload, Turbopack)
- 📜 Scripts 문서화 (20+ npm 스크립트 상세 설명)
  - Data seeding: `seed:cohorts`, `seed:admin`, `seed:all`
  - Data cleanup: `cleanup:dummy`, `reset:user-submissions`
  - Utilities: `convert:webp`, `verify:schema`
- 🌿 Git 워크플로우 (브랜치 전략, Conventional Commits, PR 프로세스)
- 🧪 테스트 (TDD 전략, Jest + React Testing Library 권장 설정)
- 🚀 배포 (Vercel 5단계 가이드, 환경 변수, Production 체크리스트)
- 🐛 트러블슈팅 (Firebase 연결, iOS PWA, TypeScript 에러, Next.js 15 params)
- ✅ 개발 Best Practices (코드 스타일, 에러 처리, 성능 최적화)

---

## 🚧 구현 가이드

새로운 기능을 구현하거나 대규모 작업을 진행할 때:

### [Data Center 구현 가이드](./implementation/datacenter-implementation-guide.md)
**최종 업데이트**: 2025-10-14
**예상 기간**: 7-11일
**주요 내용**:
- 📊 Data Center 대시보드 전체 구현 로드맵
- 📋 Phase별 상세 체크리스트 (4단계)
- 🎯 Phase 1: 기반 구조 (레이아웃, 권한, 네비게이션)
- 📈 Phase 2: 개요 대시보드 (통계, 그래프)
- 🗂️ Phase 3: 데이터 관리 (코호트, 참가자, 인증)
- 💬 Phase 4: 메시지 & 설정
- ✅ 테스트 체크리스트 및 배포 전 점검

---

## 🐛 문제 해결

플랫폼별 버그 및 이슈 해결 가이드:

### [Firebase Multi-Database Access Issue](./troubleshooting/firebase-multi-database-issue.md) ✨ NEW
**최종 업데이트**: 2025-11-04
**주요 내용**:
- 🔍 Firebase Admin SDK에서 Seoul DB 접근 실패 문제
- ❌ `admin.firestore(app, 'seoul')` API가 default DB 조회하는 버그
- ✅ `getFirestore(app, 'seoul')` 새로운 API로 해결
- 📊 검증 결과: 11월 3일 15명 인증 데이터 정상 조회
- 🔧 영향받은 파일 목록 및 수정 가이드

### [iOS PWA Scroll Bug Fix](./troubleshooting/ios-pwa-scroll.md)
**최종 업데이트**: 2025-10-13
**주요 내용**:
- 📱 iOS WebKit의 position:fixed 오버레이 스크롤 버그 분석
- 🔧 플랫폼별 조건부 라우팅 솔루션 (Sheet vs Full-page)
- 🎯 `useIsIosStandalone` 훅으로 iOS PWA 감지
- ✅ `/app/chat/participants` 전용 페이지 구현
- 🧪 테스트 체크리스트 (iOS/Android/Desktop)

### [Firebase Admin SDK Common Issues](./troubleshooting/firebase-admin-common-issues.md)
**최종 업데이트**: 2025-10-16
**주요 내용**:
- 🔧 Firebase Admin SDK 일반적인 문제 해결
- 🔑 Service Account 설정 및 검증
- ⚠️ Custom Claims 관련 이슈
- 📝 에러 메시지별 해결 방법

---

## 🔍 빠른 참조

### 자주 찾는 문서

#### 기획 및 아키텍처
- **제품 요구사항 (PRD)**: [architecture/prd-comprehensive.md](./architecture/prd-comprehensive.md)
- **기술 요구사항 (TRD)**: [architecture/trd-comprehensive.md](./architecture/trd-comprehensive.md) - V1.1 (Ghost 역할, Draft, 템플릿)
- **시스템 아키텍처**: [architecture/system-architecture.md](./architecture/system-architecture.md) - V1.1.0
- **정보 구조 (IA)**: [architecture/ia.md](./architecture/ia.md)
- **날짜 로직 설계**: [architecture/date-logic.md](./architecture/date-logic.md)

#### 개발 환경 및 API
- **개발 환경 설정**: [development/setup-guide.md](./development/setup-guide.md)
- **Firebase 설정**: [setup/firebase.md](./setup/firebase.md) - V2.0
- **Firebase Custom Claims**: [setup/firebase-custom-claims.md](./setup/firebase-custom-claims.md) - Ghost/Super Admin
- **Admin SDK 설정**: [setup/admin-sdk.md](./setup/admin-sdk.md) - V1.1
- **iOS PWA Web Push**: [setup/web-push-implementation.md](./setup/web-push-implementation.md) - V1.1.0
- **Push Notifications**: [setup/push-notifications.md](./setup/push-notifications.md)
- **Deployment Checklist**: [setup/DEPLOYMENT-CHECKLIST.md](./setup/DEPLOYMENT-CHECKLIST.md)
- **API 레퍼런스**: [api/api-reference.md](./api/api-reference.md) - V2.0 (40+ 엔드포인트)

#### 데이터베이스
- **Firestore 스키마**: [database/schema.md](./database/schema.md) - V1.1 (Ghost 역할, Draft)
- **쿼리 패턴 가이드**: [database/query-patterns.md](./database/query-patterns.md) - V1.1
- **DB Best Practices**: [database/best-practices.md](./database/best-practices.md) - V1.1
- **DB 쿼리 최적화**: [optimization/database.md](./optimization/database.md) - V1.3.0

#### 디자인 시스템
- **디자인 시스템 종합**: [design/design-system.md](./design/design-system.md) - V1.1
- **버튼 시스템**: [design/button-system.md](./design/button-system.md) - V1.1
- **UI 디자인 가이드**: [design/ui-guide.md](./design/ui-guide.md) - V1.1
- **애니메이션 가이드**: [design/animation.md](./design/animation.md) - V1.1

#### 성능 및 최적화
- **성능 최적화 가이드**: [optimization/performance.md](./optimization/performance.md)

#### 구현 가이드
- **Data Center 구현**: [implementation/datacenter-implementation-guide.md](./implementation/datacenter-implementation-guide.md)

#### 문제 해결
- **Firebase Multi-DB 이슈**: [troubleshooting/firebase-multi-database-issue.md](./troubleshooting/firebase-multi-database-issue.md) ✨ NEW
- **iOS PWA 버그**: [troubleshooting/ios-pwa-scroll.md](./troubleshooting/ios-pwa-scroll.md)
- **Firebase Admin 일반 이슈**: [troubleshooting/firebase-admin-common-issues.md](./troubleshooting/firebase-admin-common-issues.md)

### 문제 해결 가이드

#### 개발 환경
- 프로젝트 초기 설정 → [development/setup-guide.md](./development/setup-guide.md)
- Firebase 연결 문제 → [setup/firebase.md](./setup/firebase.md)
- Firebase Admin SDK 이슈 → [troubleshooting/firebase-admin-common-issues.md](./troubleshooting/firebase-admin-common-issues.md)
- Firebase Custom Claims 설정 → [setup/firebase-custom-claims.md](./setup/firebase-custom-claims.md)
- iOS PWA 푸시 알림 → [setup/web-push-implementation.md](./setup/web-push-implementation.md)
- 배포 전 체크리스트 → [setup/DEPLOYMENT-CHECKLIST.md](./setup/DEPLOYMENT-CHECKLIST.md)
- 환경 변수 설정 → [development/setup-guide.md](./development/setup-guide.md#환경-변수)

#### 데이터베이스
- 스키마 확인 → [database/schema.md](./database/schema.md) (V1.1 - Ghost 역할, Draft)
- 쿼리 성능 개선 → [database/query-patterns.md](./database/query-patterns.md) (V1.1)
- DB 사용 모범 사례 → [database/best-practices.md](./database/best-practices.md) (V1.1)
- 쿼리 최적화 → [optimization/database.md](./optimization/database.md) (V1.3.0)

#### API 및 함수
- Firebase 함수 사용법 → [api/api-reference.md](./api/api-reference.md) (V2.0 - 40+ 엔드포인트)
- Naver Book API → [api/api-reference.md#naver-book-search-api](./api/api-reference.md)
- OpenAI API → [api/api-reference.md#openai-api](./api/api-reference.md)

#### 디자인 및 UI
- 버튼 스타일링 → [design/button-system.md](./design/button-system.md) (V1.1)
- UI 일관성 → [design/design-system.md](./design/design-system.md) (V1.1)
- 반응형 디자인 → [design/design-system.md#레이아웃-시스템](./design/design-system.md)
- 애니메이션 → [design/animation.md](./design/animation.md) (V1.1)

#### 플랫폼별 이슈
- Firebase Multi-DB 접근 → [troubleshooting/firebase-multi-database-issue.md](./troubleshooting/firebase-multi-database-issue.md) ✨ NEW
- iOS PWA 스크롤 문제 → [troubleshooting/ios-pwa-scroll.md](./troubleshooting/ios-pwa-scroll.md)
- Firebase Admin SDK → [troubleshooting/firebase-admin-common-issues.md](./troubleshooting/firebase-admin-common-issues.md)

#### 기타
- 날짜 관련 버그 → [architecture/date-logic.md](./architecture/date-logic.md)
- 성능 이슈 → [optimization/performance.md](./optimization/performance.md)

---

## 📝 문서 업데이트

문서를 업데이트하거나 새 문서를 추가할 때:

1. 적절한 카테고리 폴더에 배치
2. Markdown 포맷 사용 (`.md`)
3. 명확한 제목과 구조
4. 코드 예제 포함 (해당되는 경우)
5. 이 README에 링크 추가

---

## 🤝 기여

문서 개선 제안이나 오류 발견 시:
1. 문제점 또는 제안 사항 기록
2. 프로젝트 관리자에게 공유
3. 승인 후 업데이트

---

## 📋 최근 업데이트 내역

### 2025-11-04 종합 업데이트
**업데이트된 문서 (17개)**:
- ✅ TRD V1.1 - Ghost/Super Admin, Draft, Notice 템플릿
- ✅ System Architecture V1.1.0 - Ghost 역할 시스템
- ✅ Firestore Schema V1.1 - Ghost 역할, Draft 상태
- ✅ Database Best Practices V1.1 - Ghost 관련 보안 규칙
- ✅ Query Patterns V1.1 - Ghost 쿼리 패턴
- ✅ Database Optimization V1.3.0 - Ghost 시스템
- ✅ API Reference V2.0.0 - 40+ 엔드포인트 문서화
- ✅ Firebase Setup V2.0 - Custom Claims
- ✅ Firebase Custom Claims - Ghost/Super Admin 설정
- ✅ Admin SDK V1.1 - 업데이트
- ✅ Push Notifications - 새 문서
- ✅ Web Push Implementation V1.1.0 - 개선
- ✅ Deployment Checklist - 새 문서
- ✅ Design System V1.1 - 업데이트
- ✅ UI Guide V1.1 - 업데이트
- ✅ Button System V1.1 - 업데이트
- ✅ Animation V1.1 - 업데이트

**삭제된 문서 (5개)**:
- ❌ stage2-inventory.md (obsolete)
- ❌ stage2-log-review.md (obsolete)
- ❌ matching-access-regression.md (resolved)
- ❌ submission-review-update-bug.md (resolved)
- ❌ cohort1-statistics.md (temporary report)

---

**마지막 업데이트**: 2025-11-04
**프로젝트 버전**: V1.0 (프로덕션 배포 완료)
**문서 상태**: ✅ 종합 문서화 완료 - 모든 주요 기능 문서화, Ghost 역할 시스템, Draft 공지사항, Notice 템플릿 시스템 포함
