# 필립앤소피 독서 소셜클럽 플랫폼

**버전**: V1.0 (프로덕션 배포 완료)
**최종 업데이트**: 2025-10-11

Next.js 15 + React 19 + Firebase 기반의 독서 프로그램 참가자 전용 웹 플랫폼입니다.

## 📖 프로젝트 소개

필립앤소피는 독서를 매개로 한 소셜클럽으로, 참가자들이 함께 책을 읽고 소통하는 프로그램입니다. 이 플랫폼은 참가자들에게 다음과 같은 기능을 제공합니다:

- **4자리 접근 코드 기반 간편 로그인** - 별도의 회원가입 없이 코드만으로 입장
- **운영자 단방향 공지 시스템** - 프로그램 일정, 도서 정보, 안내사항 전달
- **참가자 프로필북** - 참가자들의 프로필을 모아볼 수 있는 디지털 명함
- **독서 인증 제출** - 읽은 책에 대한 인증 사진과 리뷰 제출
- **책 검색 자동완성** - 네이버 책 검색 API 연동으로 책 정보 자동 완성
- **책 메타데이터 자동 저장** - 선택한 책 정보(제목, 저자, 표지)를 자동으로 저장하고 다음 독서 인증 시 자동 불러오기
- **Today's Library** - 오늘 독서 인증한 참가자들의 서재
- **1:1 다이렉트 메시지** - 운영자와의 개별 소통 채널

## 🏗️ 프로젝트 구조

```
/                                  # 랜딩페이지 (필립앤소피 소개)
/app                               # 접근 코드 입력 페이지
/app/chat                          # 공지사항 및 채팅 인터페이스
/app/chat/today-library            # 오늘의 서재 (독서 인증 모음)
/app/profile/[participantId]       # 참가자 프로필 상세
/app/program                       # 프로그램 소개
/privacy-policy.html               # 개인정보처리방침 (정적 HTML)
/terms-of-service.html             # 이용약관 (정적 HTML)

src/
├── constants/                     # 전역 상수 파일
│   ├── api.ts                     # API 캐시 설정 (네이버 책 검색 등)
│   ├── validation.ts              # 독서 인증 검증 규칙
│   ├── search.ts                  # 책 검색 설정 (디바운스, 최대 결과 수)
│   └── ui.ts                      # UI 상수 (스크롤 임계값 등)
├── lib/
│   ├── naver-book-api.ts          # 네이버 책 검색 API 유틸리티
│   └── logger.ts                  # 로거 유틸리티 (개발/프로덕션 분리)
└── components/
    └── BookSearchAutocomplete.tsx # 책 검색 자동완성 컴포넌트
```

### Legacy 리다이렉트

기존 경로는 자동으로 새 경로로 리다이렉트됩니다:
- `/member10` → `/app`
- `/chat` → `/app/chat`
- `/profile/*` → `/app/profile/*`
- `/program` → `/app/program`

## 🚀 시작하기

### 1. 환경 설정

프로젝트를 클론한 후 환경 변수를 설정합니다:

```bash
# .env.local 파일 생성
cp .env.local.example .env.local
```

`.env.local` 파일에 Firebase 설정 및 네이버 API 키를 입력합니다:

```env
# Firebase 설정
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# 네이버 책 검색 API (서버 사이드 전용)
NAVER_CLIENT_ID=your_naver_client_id
NAVER_CLIENT_SECRET=your_naver_client_secret
```

Firebase 설정 방법은 [Firebase 설정 가이드](./docs/setup/firebase.md)를 참고하세요.

**네이버 책 검색 API 설정**:
1. [네이버 개발자 센터](https://developers.naver.com/apps/#/register)에서 애플리케이션 등록
2. 검색 API 서비스 추가 (책 검색)
3. 발급받은 Client ID와 Client Secret을 `.env.local`에 추가

### 2. 의존성 설치

```bash
npm install
```

**⚠️ 중요**: 이 프로젝트는 npm을 패키지 매니저로 사용합니다. yarn이나 pnpm은 사용하지 마세요.

### 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 결과를 확인할 수 있습니다.

### 4. Firebase 데이터 시딩 (선택사항)

개발 환경에서 테스트 데이터를 생성하려면:

```bash
# 모든 데이터 시딩 (cohorts + participants + notices + submissions)
npm run seed:all

# 개별 시딩
npm run seed:cohorts       # 코호트 및 참가자
npm run seed:notices       # 공지사항
npm run seed:submissions   # 독서 인증
npm run seed:admin         # 관리자 참가자 (admin, admin2, admin3)
npm run seed:real-users    # 실유저 추가 (user-junyoung, user-hyunji)

# 데이터 정리
npm run cleanup:dummy      # 더미 데이터 삭제 (더미 참가자 20명 + 테스트 공지 3개)
```

**사용자 시스템**:
- **관리자 (3명)**: 운영 권한 보유
  - `admin` (운영자): 01000000001
  - `admin2` (문준영): 42633467921
  - `admin3` (김현지): 42627615193
- **실유저 (2명)**: 일반 사용자 권한
  - `user-junyoung` (문준영): 42633467921
  - `user-hyunji` (김현지): 42627615193

## ✨ 주요 기능

### 🎨 UX/UI 개선 (v2.2, 2025-10-10)

- ✨ **Shimmer 애니메이션 시스템**: 통일된 로딩 상태 UI
  - `.shimmer` utility class로 전역 적용 (globals.css)
  - WCAG 2.1 접근성: `prefers-reduced-motion` 지원
  - GPU 가속: `will-change: background-position` 최적화
  - DRY 원칙: 15개 중복 애니메이션 정의 제거
  - 1.5초 ease-in-out 애니메이션 (tailwind.config.ts)

- 🖼️ **이미지 뷰어 UX 개선**: 클릭으로 즉시 닫기 가능

- 📱 **PWA 및 모바일 UX 최적화**:
  - iOS PWA position:fixed 오버레이 스크롤 버그 수정
  - 플랫폼별 조건부 라우팅 (Sheet vs Full-page)
  - `useIsIosStandalone` 훅으로 iOS PWA 감지
  - `/app/chat/participants` 전용 페이지 구현

- 🔔 **DM 시스템 개선**:
  - 읽음 처리 및 관리자 알림 버그 수정
  - 메시지 그룹화 UX 개선
  - Service Worker 캐싱 최적화

- 🎲 **일일 질문 시스템**: 랜덤 정렬 및 오타 수정

### 독서 인증 자동 승인 시스템

**모든 독서 인증이 제출 즉시 자동으로 승인됩니다.**

- ✅ **즉시 프로필북 반영**: Firebase onSnapshot 실시간 구독으로 제출 즉시 프로필북에 표시
- ✅ **승인 대기 없음**: `status: 'approved'`로 자동 저장 (관리자 승인 불필요)
- ✅ **실시간 동기화**: React Query 대신 Firebase 실시간 구독으로 즉각 업데이트

**아키텍처 특징**:
- **Firebase Realtime Subscriptions**: `onSnapshot()`으로 제출물 실시간 감지
- **React Query 의존성 감소**: 프로필북에서 `@tanstack/react-query` 미사용
- **즉각적인 UI 업데이트**: 네트워크 왕복 없이 로컬 상태 즉시 변경

### 책 메타데이터 자동 저장 시스템

참가자가 독서 인증을 제출할 때 선택한 책 정보를 자동으로 저장하고, 다음 날 같은 책으로 계속 읽을 경우 자동으로 불러오는 기능입니다.

**주요 특징**:
- 책 제목, 저자, 표지 이미지 URL, 소개글을 Firestore에 자동 저장
- 다음 날 독서 인증 다이얼로그에서 이전 책 정보 자동 표시
- 책 정보 카드 UI로 시각적 표현 (표지 이미지 + 제목 + 저자 + 출판사)
- 다른 책으로 변경 시 X 버튼으로 간편하게 초기화
- 수동 입력 시 메타데이터 손실 경고 (window.confirm)

**데이터베이스 스키마**:
```typescript
type Participant = {
  // 기존 필드...
  currentBookTitle?: string;           // 현재 읽고 있는 책 제목
  currentBookAuthor?: string;          // 현재 읽고 있는 책 저자
  currentBookCoverUrl?: string;        // 현재 읽고 있는 책 표지 URL
}

type ReadingSubmission = {
  // 기존 필드...
  bookDescription?: string;            // 책 소개글 (네이버 API에서 자동 저장)
  status: 'approved';                  // 항상 자동 승인 (deprecated 필드, DB 호환성 유지)
}
```

**Firebase 트랜잭션 패턴**:
- `runTransaction()`을 사용한 원자적 업데이트
- 동시성 문제 방지 및 데이터 일관성 보장
- 레이스 컨디션 방지

## 🛠️ 기술 스택

### 프레임워크 & UI
- **Next.js 15.1.0** - App Router, React Server Components
- **React 19** - 최신 React 기능 활용
- **TypeScript 5** - 타입 안전성
- **Tailwind CSS 3.4** - 유틸리티 우선 CSS
- **Shadcn UI** - 재사용 가능한 컴포넌트 라이브러리
- **Pretendard Variable** - 한글 웹폰트

### 상태 관리 & 데이터
- **@tanstack/react-query v5** - 서버 상태 관리 (채팅, 공지사항 등)
- **Firebase Realtime Database** - 독서 인증 실시간 구독 (프로필북)
- **Zustand v4** - 전역 상태 관리
- **React Hook Form v7** + **Zod v3** - 폼 처리 및 검증
- **Firebase v12.3.0** - Firestore + Storage 백엔드

### 유틸리티 & API
- **lucide-react** - 아이콘 라이브러리
- **date-fns v4** - 날짜 조작
- **es-toolkit v1** - 유틸리티 함수 (lodash 대체)
- **react-use v17** - React 훅 모음
- **ts-pattern v5** - 타입 안전 패턴 매칭
- **framer-motion v11** - 애니메이션
- **axios v1.7.9** - HTTP 클라이언트 (네이버 API 호출용)

## 📝 사용 가능한 명령어

### 개발
```bash
npm run dev              # 개발 서버 시작 (Turbopack)
npm run build            # 프로덕션 빌드
npm start                # 프로덕션 서버 시작
npm run lint             # ESLint 실행
```

### Firebase 데이터 시딩
```bash
npm run seed:cohorts            # 코호트 및 참가자 시딩
npm run seed:notices            # 공지사항 시딩
npm run seed:submissions        # 독서 인증 시딩
npm run seed:admin              # 관리자 참가자 시딩 (admin, admin2, admin3)
npm run seed:real-users         # 실유저 추가 (user-junyoung, user-hyunji)
npm run seed:all                # 모든 데이터 시딩

# 데이터 정리
npm run cleanup:dummy           # 더미 데이터 삭제
npm run cleanup:dm              # DM 메시지 정리
npm run reset:user-submissions  # 사용자 독서 인증 초기화
npm run check:user-data         # 사용자 데이터 검증

# 유틸리티
npm run convert:webp            # 이미지 WebP 변환
npm run verify:schema           # Firebase 스키마 검증
```

### 타입 체크
```bash
npx tsc --noEmit         # TypeScript 타입 체크
```

### Firebase CLI
```bash
firebase projects:list   # Firebase 프로젝트 목록
firebase login           # Firebase 인증
firebase deploy          # Firebase 배포
```

## ✨ V1.0 주요 기능 (2025-10-11)

### 🎯 핵심 기능
- ✅ **랜딩페이지**: Glassmorphism 디자인, SEO 최적화
- ✅ **4자리 코드 입장**: 간편 인증 시스템
- ✅ **공지사항 시스템**: 운영자 → 참가자 단방향 소통
- ✅ **독서 인증**: 이미지 업로드 + 리뷰 작성 + 책 검색 API
- ✅ **참가자 프로필북**: 디지털 명함 시스템
- ✅ **오늘의 서재 (Today's Library)**: AI 기반 일일 매칭
- ✅ **다이렉트 메시지**: 참가자 ↔ 운영자 1:1 소통
- ✅ **AI 매칭 시스템**: 성향 기반 참가자 매칭

### 📱 모바일 & PWA 최적화
- iOS PWA 노치 대응 완료
- position:fixed 스크롤 버그 해결
- 플랫폼별 조건부 라우팅
- Safe Area 완벽 대응

### 🎨 디자인 시스템
- Shimmer 애니메이션 통합 (WCAG 2.1 준수)
- 통일된 버튼 시스템 (FooterActions 기반)
- 글래스모피즘 랜딩페이지
- 반응형 그리드 레이아웃

### 🗄️ 데이터베이스
- Firebase Firestore (5개 컬렉션)
- Firebase Storage (이미지 관리)
- 실시간 구독 시스템
- 관리자 3명 + 실유저 2명 시스템

## 📚 프로젝트 문서

### 📖 종합 문서 (Complete Documentation)
- **[문서 인덱스](./docs/README.md)** - 📑 전체 문서 네비게이션 및 빠른 참조

### 🚀 시작하기 (Getting Started)
- **[CLAUDE.md](./CLAUDE.md)** - 프로젝트 개발 가이드 (AI 어시스턴트용, 필독)
- **[개발 환경 설정](./docs/development/setup-guide.md)** ✨ NEW - 초기 설정부터 배포까지 완벽 가이드
- **[Firebase 설정](./docs/setup/firebase.md)** - Firebase 프로젝트 생성 및 연동
- **[Admin SDK 설정](./docs/setup/admin-sdk.md)** - Firebase Admin SDK 구성

### 🏗️ 기획 및 아키텍처 (Planning & Architecture)
- **[PRD 종합판](./docs/architecture/prd-comprehensive.md)** ✨ NEW - 제품 요구사항 완벽 문서 (70+ 페이지)
- **[TRD 종합판](./docs/architecture/trd-comprehensive.md)** ✨ NEW - 기술 요구사항 완벽 문서
- **[시스템 아키텍처](./docs/architecture/system-architecture.md)** ✨ NEW - 전체 시스템 구조 및 데이터 흐름
- **[정보 구조 (IA)](./docs/architecture/ia.md)** - 앱 구조 및 사용자 여정

### 🗄️ 데이터베이스 (Database)
- **[Firestore 스키마](./docs/database/schema.md)** ✨ NEW - 6개 컬렉션 완벽 문서화
- **[쿼리 패턴 가이드](./docs/database/query-patterns.md)** ✨ NEW - React Query 통합 및 실시간 구독
- **[DB Best Practices](./docs/database/best-practices.md)** ✨ NEW - 모범 사례 및 비용 최적화

### 🔌 API 문서 (API Documentation)
- **[API 레퍼런스](./docs/api/api-reference.md)** ✨ NEW - Firebase 70+ 함수 및 외부 API 완벽 레퍼런스

### 🎨 디자인 시스템 (Design System)
- **[디자인 시스템 종합](./docs/design/design-system.md)** ✨ NEW - 색상, 타이포그래피, 컴포넌트 완벽 가이드
- **[버튼 시스템](./docs/design/button-system.md)** - 통일된 버튼 스타일 가이드
- **[UI 디자인 가이드](./docs/design/ui-guide.md)** - Shimmer 애니메이션 시스템

### ⚡ 성능 최적화 (Performance)
- **[성능 최적화 가이드](./docs/optimization/performance.md)** - React Query 3단계 캐싱 (69.5% 읽기 감소)
- **[데이터베이스 최적화](./docs/optimization/database.md)** - Firebase 쿼리 및 구독 최적화

### 🚧 구현 가이드 (Implementation)
- **[Data Center 구현](./docs/implementation/datacenter-implementation-guide.md)** - 관리자 대시보드 구현 로드맵

### 🐛 문제 해결 (Troubleshooting)
- **[iOS PWA 스크롤 버그](./docs/troubleshooting/ios-pwa-scroll.md)** - iOS PWA position:fixed 버그 해결

## 🔒 보안 주의사항

- `.env.local` 파일은 절대 커밋하지 마세요
- `firebase-service-account.json` 파일은 gitignore에 포함되어 있습니다
- Firebase Security Rules를 프로덕션 환경에 맞게 설정하세요

## 🌐 배포

이 프로젝트는 Vercel에 최적화되어 있습니다:

1. [Vercel](https://vercel.com)에 프로젝트 연결
2. 환경 변수 설정 (Firebase 설정값)
3. 배포 (자동)

자세한 내용은 [Next.js deployment documentation](https://nextjs.org/docs/deployment)을 참고하세요.

## 📄 라이선스

이 프로젝트는 필립앤소피(Philip & Sophy) 독서 소셜클럽의 전용 플랫폼입니다.

## 🤝 기여

이 프로젝트는 비공개 프로젝트입니다. 기여 관련 문의사항은 프로젝트 관리자에게 문의하세요.

---

**프로젝트 버전**: V1.0
**최종 업데이트**: 2025-10-16
**배포 상태**: ✅ 프로덕션 배포 완료 (Vercel)
**문서 상태**: ✅ 종합 문서화 완료 (7개 신규 문서 추가)

Built with ❤️ using [EasyNext](https://github.com/easynext/easynext)

### Dry-run 옵션

데이터 정리/초기화 스크립트는 `--dry-run` 플래그를 제공해 실제로 데이터를 변경하지 않고 결과를 미리 확인할 수 있습니다.

사용 예시:

```bash
# 모든 푸시 토큰 초기화를 시뮬레이션 (실제 변경 없음)
npm run reset:push-tokens -- --dry-run

# admin 푸시 토큰 정리를 시뮬레이션
npm run reset:admin-push -- --dry-run

# FCM 사용자 Web Push 정리를 시뮬레이션
node scripts/cleanup-android-webpush.mjs --dry-run
```

실제 변경을 적용하려면 `--dry-run` 없이 실행하고, `reset:push-tokens`는 기본 확인 프롬프트를 제공하며 `--force`로 건너뛸 수 있습니다.
