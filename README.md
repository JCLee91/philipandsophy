# 필립앤소피 독서 소셜클럽 플랫폼

Next.js 15 + React 19 + Firebase 기반의 독서 프로그램 참가자 전용 웹 플랫폼입니다.

## 📖 프로젝트 소개

필립앤소피는 독서를 매개로 한 소셜클럽으로, 참가자들이 함께 책을 읽고 소통하는 프로그램입니다. 이 플랫폼은 참가자들에게 다음과 같은 기능을 제공합니다:

- **4자리 접근 코드 기반 간편 로그인** - 별도의 회원가입 없이 코드만으로 입장
- **운영자 단방향 공지 시스템** - 프로그램 일정, 도서 정보, 안내사항 전달
- **참가자 프로필북** - 참가자들의 프로필을 모아볼 수 있는 디지털 명함
- **독서 인증 제출** - 읽은 책에 대한 인증 사진과 리뷰 제출
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

`.env.local` 파일에 Firebase 설정을 입력합니다:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

Firebase 설정 방법은 [FIREBASE_SETUP.md](./FIREBASE_SETUP.md)를 참고하세요.

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
npm run seed:cohorts     # 코호트 및 참가자
npm run seed:notices     # 공지사항
npm run seed:submissions # 독서 인증
npm run seed:admin       # 관리자 참가자
```

## 🛠️ 기술 스택

### 프레임워크 & UI
- **Next.js 15.1.0** - App Router, React Server Components
- **React 19** - 최신 React 기능 활용
- **TypeScript 5** - 타입 안전성
- **Tailwind CSS 3.4** - 유틸리티 우선 CSS
- **Shadcn UI** - 재사용 가능한 컴포넌트 라이브러리
- **Pretendard Variable** - 한글 웹폰트

### 상태 관리 & 데이터
- **@tanstack/react-query v5** - 서버 상태 관리
- **Zustand v4** - 전역 상태 관리
- **React Hook Form v7** + **Zod v3** - 폼 처리 및 검증
- **Firebase v12.3.0** - Firestore + Storage 백엔드

### 유틸리티
- **lucide-react** - 아이콘 라이브러리
- **date-fns v4** - 날짜 조작
- **es-toolkit v1** - 유틸리티 함수 (lodash 대체)
- **react-use v17** - React 훅 모음
- **ts-pattern v5** - 타입 안전 패턴 매칭
- **framer-motion v11** - 애니메이션
- **axios v1.7.9** - HTTP 클라이언트

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
npm run seed:cohorts     # 코호트 및 참가자 시딩
npm run seed:notices     # 공지사항 시딩
npm run seed:submissions # 독서 인증 시딩
npm run seed:admin       # 관리자 참가자 시딩
npm run seed:all         # 모든 데이터 시딩
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

## 📚 프로젝트 문서

- **[CLAUDE.md](./CLAUDE.md)** - 프로젝트 개발 가이드 (필독)
- **[FIREBASE_SETUP.md](./FIREBASE_SETUP.md)** - Firebase 초기 설정 가이드
- **[ANIMATION_DESIGN_GUIDE.md](./ANIMATION_DESIGN_GUIDE.md)** - 애니메이션 디자인 가이드
- **[docs/prd.md](./docs/prd.md)** - 제품 요구사항 문서
- **[docs/design-guide.md](./docs/design-guide.md)** - 디자인 가이드
- **[docs/ia.md](./docs/ia.md)** - 정보 구조

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

Built with ❤️ using [EasyNext](https://github.com/easynext/easynext)
