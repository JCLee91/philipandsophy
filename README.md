# 필립앤소피 독서 소셜클럽 플랫폼

**버전**: V1.1 (프로덕션 배포 완료)
**최종 업데이트**: 2025-12-13

Next.js 16 + React 19 + Firebase 기반의 독서 프로그램 참가자 전용 웹 플랫폼입니다.

## 📖 프로젝트 소개

필립앤소피는 독서를 매개로 한 소셜클럽으로, 참가자들이 함께 책을 읽고 소통하는 프로그램입니다. 이 플랫폼은 참가자들에게 다음과 같은 기능을 제공합니다:

### 참가자 기능
- **4자리 접근 코드 기반 간편 로그인** - 별도의 회원가입 없이 코드만으로 입장
- **운영자 단방향 공지 시스템** - 프로그램 일정, 도서 정보, 안내사항 전달 (템플릿 기반, 임시저장 지원)
- **참가자 프로필북** - 참가자들의 프로필을 모아볼 수 있는 디지털 명함 (공개 설정 기능)
- **독서 인증 제출** - 읽은 책에 대한 인증 사진과 리뷰 제출 (임시저장 지원)
- **책 검색 자동완성** - 네이버 책 검색 API 연동으로 책 정보 자동 완성
- **책 메타데이터 자동 저장** - 선택한 책 정보(제목, 저자, 표지)를 자동으로 저장하고 다음 독서 인증 시 자동 불러오기
- **Today's Library** - 오늘 독서 인증한 참가자들의 서재
- **1:1 다이렉트 메시지** - 운영자와의 개별 소통 채널
- **듀얼 푸시 알림** - FCM (Android/Desktop) + Web Push (iOS Safari) 지원

### 관리자 기능
- **Data Center 대시보드** - 30+ API 엔드포인트로 구동되는 종합 관리 시스템
- **공지 템플릿 시스템** - 재사용 가능한 공지사항 템플릿 관리
- **임시저장 시스템** - 공지사항과 독서 인증 임시저장 및 예약 발행
- **Ghost 참가자** - 테스트용 계정 시스템 (프로필 리스트 미표시)
- **통계 및 인사이트** - 참가율, 독서 패턴, 도서 다양성 등 실시간 분석
- **프로필 공개 설정** - 기수별 프로필 공개 시작일 설정 기능

## 🏗️ 프로젝트 구조

```
# 참가자용 앱
/                                  # 랜딩페이지 (필립앤소피 소개)
/app                               # 접근 코드 입력 페이지
/app/chat                          # 공지사항 및 채팅 인터페이스
/app/chat/today-library            # 오늘의 서재 (독서 인증 모음)
/app/profile/[participantId]       # 참가자 프로필 상세
/app/program                       # 프로그램 소개
/privacy-policy.html               # 개인정보처리방침 (정적 HTML)
/terms-of-service.html             # 이용약관 (정적 HTML)

# 관리자 Data Center (23+ API 엔드포인트)
/datacntr                          # Data Center 로그인
/datacntr/page                     # 대시보드 (통계 및 인사이트)
/datacntr/cohorts                  # 기수 관리
/datacntr/cohorts/[cohortId]       # 기수 상세 (참가자, 통계)
/datacntr/cohorts/[cohortId]/daily-questions  # Daily Questions 관리
/datacntr/participants             # 참가자 관리
/datacntr/submissions              # 독서 인증 관리
/datacntr/notices                  # 공지사항 관리
/datacntr/notices/create           # 공지 작성 (템플릿 지원)
/datacntr/notices/edit/[noticeId]  # 공지 수정
/datacntr/notice-templates         # 공지 템플릿 관리
/datacntr/messages                 # DM 관리
/datacntr/notifications            # 푸시 알림 관리
/datacntr/board                    # 게시판 (미사용)
/datacntr/settings                 # 설정

src/
├── constants/                     # 전역 상수 파일
│   ├── api.ts                     # API 캐시 설정 (네이버 책 검색 등)
│   ├── validation.ts              # 독서 인증 검증 규칙
│   ├── search.ts                  # 책 검색 설정 (디바운스, 최대 결과 수)
│   └── ui.ts                      # UI 상수 (스크롤 임계값 등)
├── lib/
│   ├── naver-book-api.ts          # 네이버 책 검색 API 유틸리티
│   ├── logger.ts                  # 로거 유틸리티 (개발/프로덕션 분리)
│   └── datacntr/                  # Data Center 유틸리티
│       ├── engagement.ts          # 참여율 계산
│       ├── status.ts              # 상태 관리
│       ├── sanitize.ts            # 데이터 정제
│       └── timestamp.ts           # 타임스탬프 변환
├── components/
│   ├── BookSearchAutocomplete.tsx # 책 검색 자동완성 컴포넌트
│   └── datacntr/                  # Data Center 컴포넌트
│       ├── DataCenterLayout.tsx   # 레이아웃
│       ├── DataCenterSidebar.tsx  # 사이드바
│       ├── DataCenterHeader.tsx   # 헤더
│       ├── dashboard/             # 대시보드 차트
│       ├── table/                 # 데이터 테이블
│       └── common/                # 공통 컴포넌트
└── app/api/datacntr/              # Data Center API 라우트 (23개 엔드포인트)
    ├── cohorts/                   # 기수 API (5개)
    ├── participants/              # 참가자 API (3개)
    ├── submissions/               # 독서 인증 API (1개)
    ├── notices/                   # 공지 API (4개)
    ├── notice-templates/          # 템플릿 API (2개)
    ├── messages/                  # 메시지 API (1개)
    ├── stats/                     # 통계 API (3개)
    ├── ai-chat/                   # AI 채팅 API (2개)
    └── export-books/              # 도서 내보내기 API (1개)
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

`.env.local` 파일에 Firebase 설정 및 네이버 API 키를 입력합니다 (전체 목록은 `.env.local.example` 참고):

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

# 푸시 알림 (클라이언트 공개키)
NEXT_PUBLIC_FCM_VAPID_KEY=your_fcm_vapid_public_key
NEXT_PUBLIC_WEBPUSH_VAPID_KEY=your_webpush_vapid_public_key

# reCAPTCHA Enterprise (Firebase App Check / Phone Auth)
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your_recaptcha_site_key
NEXT_PUBLIC_RECAPTCHA_PROJECT_ID=your_recaptcha_project_id
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

### 4. 데이터 작업 스크립트 (선택사항)

이 레포지토리는 범용 “시드 데이터 생성” 스크립트를 기본 제공하지 않습니다.

대신 `src/scripts/` / `scripts/`에 마이그레이션/정리/검증 스크립트가 있으며, 운영 DB에 영향을 줄 수 있으니 주의해서 사용하세요. 자세한 목록은 `scripts/README.md`를 참고하세요.

```bash
npm run audit:schema
npm run stats
npm run fix:duplicate-submissions
npm run migrate:storage
npm run migrate:notices-submissions
```

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
- **Next.js 16** - App Router
- **React 19** - UI 라이브러리
- **TypeScript 5.9** - 타입 안전성
- **Tailwind CSS 4** - 유틸리티 우선 CSS
- **shadcn/ui (Radix UI)** - 재사용 가능한 UI 컴포넌트 기반
- **Framer Motion 12** - 애니메이션
- **Recharts 3** - Data Center 차트 라이브러리
- **lucide-react** - 아이콘 라이브러리

### 백엔드 & 인프라
- **Firebase** - Firestore / Storage / Auth
- **Firebase Cloud Functions** - 예약 작업 및 서버리스 백엔드 (`functions/`)
- **Firebase Cloud Messaging (FCM)** - Android/Desktop 푸시 알림
- **Web Push API** - iOS Safari 푸시 알림 (VAPID)
- **Vercel** - Next.js 배포

### 상태 관리 & 데이터
- **@tanstack/react-query v5** - 서버 상태 관리 (Data Center, 채팅 등)
- **Firebase Realtime Subscriptions** - `onSnapshot` 실시간 구독 (프로필북)
- **Zustand v5** - 전역 상태 관리
- **React Hook Form v7** + **Zod v3** - 폼 처리 및 검증

### AI & 외부 API
- **Naver Book Search API** - 책 검색 자동완성 (서버 사이드 프록시)
- **AI SDK** - OpenAI/Anthropic/Google Provider 연동 (기능별 사용)
- **reCAPTCHA Enterprise** - Firebase App Check / Phone Auth 보조

### 유틸리티 & 도구
- **date-fns v4 / date-fns-tz** - 날짜/타임존 처리
- **sharp** - 이미지 처리
- **dotenv** - 스크립트 환경 변수 로딩

## 📝 사용 가능한 명령어

### 개발/검증
```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
npm run test
```

### 운영/데이터 스크립트 (주의)
`package.json` 및 `scripts/README.md`를 참고하세요.

```bash
npm run audit:schema
npm run stats
npm run fix:duplicate-submissions
npm run migrate:storage
npm run migrate:notices-submissions
```

### Firebase CLI
```bash
firebase projects:list   # Firebase 프로젝트 목록
firebase login           # Firebase 인증
firebase deploy          # Firebase 배포
```

## ✨ V1.1 주요 업데이트 (2025-11)

### 🆕 신규 기능

#### Data Center (관리자 대시보드)
- **30+ API 엔드포인트**: RESTful API 기반 관리 시스템
- **실시간 통계 대시보드**: 참가율, 독서 패턴, 도서 다양성, 활동 트렌드
- **차트 시각화**: Recharts 기반 인터랙티브 차트 (막대, 선, 파이 차트)
- **AI 인사이트**: GPT-4o 기반 데이터 분석 및 추천
- **데이터 내보내기**: CSV/Excel 내보내기 기능

#### 공지 템플릿 시스템
- **재사용 가능한 템플릿**: 자주 사용하는 공지 양식 저장
- **카테고리별 분류**: 프로그램 안내, 독서 챌린지, 이벤트, 기타
- **템플릿 → 공지 변환**: 템플릿에서 즉시 공지 생성
- **공지 → 템플릿 저장**: 작성한 공지를 템플릿으로 저장
- **5개 기본 템플릿**: 시딩 스크립트 포함

#### 임시저장 시스템 (Draft)
- **공지 임시저장**: 작성 중인 공지사항 저장 (isDraft 플래그)
- **독서 인증 임시저장**: 제출 전 독서 인증 임시 보관
- **예약 발행**: 작성 완료 후 발행 시점 제어

#### Ghost 참가자 시스템
- **테스트 계정**: `isGhost: true` 플래그로 구분
- **프로필 리스트 미표시**: 일반 참가자 목록에서 숨김
- **오늘의 서재 접근**: 정상 참가자처럼 기능 사용 가능
- **관리자 전용**: Data Center에서 식별 가능

#### 듀얼 푸시 알림
- **FCM (Firebase Cloud Messaging)**: Android/Desktop Chrome 지원
- **Web Push API (VAPID)**: iOS Safari 지원
- **멀티 디바이스**: 디바이스별 토큰 배열 관리 (`pushTokens[]`, `webPushSubscriptions[]`)
- **자동 정리**: 만료된 토큰 자동 제거

#### 프로필 공개 설정
- **기수별 설정**: `cohort.profileUnlockDate` 필드
- **점진적 공개**: 초기 2x2 매칭 → 특정 날짜부터 전체 공개
- **유연한 제어**: null (기본), ISO 날짜 문자열 지원

### 🔄 개선 사항

#### 권한 체계 고도화
- **슈퍼 관리자** (`isSuperAdmin`): 전체 프로필 열람, 리스트 미표시
- **일반 관리자** (`isAdministrator`): 공지 관리, 프로필 열람 제약 동일
- **Ghost 참가자** (`isGhost`): 테스트용, 리스트 미표시

#### 통계 시스템 강화
- **참여율 지표**: 일별/주별 참가율 추이
- **독서 패턴**: 시간대별 제출 분포, 도서 다양성
- **리뷰 품질**: 평균 글자 수, 성실도 분석
- **트렌드 표시**: 증가/감소 화살표 및 백분율

#### Cloud Run 위임
- **장기 AI 작업**: 매칭 작업을 Cloud Run으로 위임 (10분+ 작업 지원)
- **타임아웃 회피**: Vercel 10초 제한 우회
- **비동기 큐**: `matching_jobs` 컬렉션으로 작업 관리

### 📊 데이터베이스 확장
- **6개 컬렉션**: `notice_templates` 추가 (기존 5개 → 6개)
- **Draft 플래그**: `notices.isDraft`, `reading_submissions.isDraft`
- **멀티 디바이스**: `pushTokens[]`, `webPushSubscriptions[]` 배열

### 🎯 V1.0 주요 기능 (2025-10)

#### 핵심 기능
- ✅ **랜딩페이지**: Glassmorphism 디자인, SEO 최적화
- ✅ **4자리 코드 입장**: 간편 인증 시스템
- ✅ **공지사항 시스템**: 운영자 → 참가자 단방향 소통
- ✅ **독서 인증**: 이미지 업로드 + 리뷰 작성 + 책 검색 API
- ✅ **참가자 프로필북**: 디지털 명함 시스템
- ✅ **오늘의 서재 (Today's Library)**: AI 기반 일일 매칭
- ✅ **다이렉트 메시지**: 참가자 ↔ 운영자 1:1 소통
- ✅ **AI 매칭 시스템**: 성향 기반 참가자 매칭

#### 모바일 & PWA 최적화
- iOS PWA 노치 대응 완료
- position:fixed 스크롤 버그 해결
- 플랫폼별 조건부 라우팅
- Safe Area 완벽 대응

#### 디자인 시스템
- Shimmer 애니메이션 통합 (WCAG 2.1 준수)
- 통일된 버튼 시스템 (FooterActions 기반)
- 글래스모피즘 랜딩페이지
- 반응형 그리드 레이아웃

## 📚 프로젝트 문서

- **문서 인덱스**: `docs/README.md`
- **개발 가이드**: `docs/development/setup-guide.md`, `CLAUDE.md`
- **아키텍처**: `docs/architecture/system-architecture.md`, `docs/architecture/prd.md`, `docs/architecture/trd.md`, `docs/architecture/ia.md`
- **데이터베이스**: `docs/database/schema.md`, `docs/database/query-patterns.md`, `docs/database/best-practices.md`
- **설정(Setup)**: `docs/setup/firebase.md`, `docs/setup/push-notifications.md`, `docs/setup/web-push-implementation.md`, `docs/setup-recaptcha-enterprise.md`
- **API 레퍼런스**: `docs/api/api-reference.md`
- **트러블슈팅**: `docs/troubleshooting/ios-pwa-scroll.md`
- **스크립트 가이드**: `scripts/README.md`

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

**프로젝트 버전**: V1.1  
**최종 업데이트**: 2025-12-13
