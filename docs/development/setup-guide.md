# Development Setup & Workflow Guide

**Last Updated**: 2025-12-13
**Document Version**: v1.0.1
**Category**: development

---

## 목차 (Table of Contents)

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Environment Variables](#environment-variables)
4. [Development Workflow](#development-workflow)
5. [Scripts Documentation](#scripts-documentation)
6. [Firebase Setup](#firebase-setup)
7. [Git Workflow](#git-workflow)
8. [Testing](#testing)
9. [Deployment](#deployment)
10. [Troubleshooting](#troubleshooting)
11. [Development Best Practices](#development-best-practices)

---

## Prerequisites

프로젝트를 시작하기 전에 다음 도구들이 설치되어 있어야 합니다.

### 필수 도구

| 도구 | 버전 | 설치 방법 | 확인 명령어 |
|------|------|-----------|-------------|
| **Node.js** | v18.x 이상 | [nodejs.org](https://nodejs.org) | `node --version` |
| **npm** | v9.x 이상 | Node.js와 함께 설치됨 | `npm --version` |
| **Git** | v2.x 이상 | [git-scm.com](https://git-scm.com) | `git --version` |
| **Firebase CLI** | 최신 버전 | `npm install -g firebase-tools` | `firebase --version` |

### 권장 도구

| 도구 | 용도 |
|------|------|
| **VS Code** | 코드 에디터 (권장) |
| **VS Code Extensions** | ESLint, Prettier, Tailwind CSS IntelliSense |
| **Vercel CLI** | 배포 테스트 (선택사항) |

### Node.js 버전 확인

```bash
# 현재 설치된 Node.js 버전 확인
node --version

# 18.x 이상이어야 함
# 예: v18.17.0, v20.10.0
```

**버전이 낮다면?**
- **macOS/Linux**: [nvm](https://github.com/nvm-sh/nvm) 사용 권장
- **Windows**: [nvm-windows](https://github.com/coreybutler/nvm-windows) 사용 권장

```bash
# nvm으로 Node.js 18 설치
nvm install 18
nvm use 18
```

---

## Initial Setup

### Step 1: Repository 클론

```bash
# SSH (권장)
git clone git@github.com:your-username/projectpns.git

# HTTPS
git clone https://github.com/your-username/projectpns.git

# 프로젝트 디렉토리로 이동
cd projectpns
```

### Step 2: 의존성 설치

```bash
npm install
```

**⚠️ 중요**: 이 프로젝트는 **npm**을 패키지 매니저로 사용합니다. yarn이나 pnpm은 사용하지 마세요.

**설치 확인**:
```bash
# node_modules 디렉토리가 생성되었는지 확인
ls -la | grep node_modules

# package-lock.json이 있는지 확인 (yarn.lock, pnpm-lock.yaml이 있으면 안 됨)
ls -la | grep lock
```

### Step 3: 환경 변수 설정

```bash
# .env.local.example을 복사하여 .env.local 생성
cp .env.local.example .env.local

# .env.local 파일 편집
code .env.local  # VS Code
# 또는
nano .env.local  # 터미널 에디터
```

환경 변수 설정은 [Environment Variables](#environment-variables) 섹션을 참조하세요.

### Step 4: Firebase 프로젝트 설정

Firebase 설정은 [Firebase Setup](#firebase-setup) 섹션을 참조하세요.

### Step 5: 첫 실행 확인

```bash
# 개발 서버 시작
npm run dev

# 브라우저에서 http://localhost:3000 열기
```

**성공 화면**:
- 랜딩페이지가 표시되어야 함
- 콘솔 에러가 없어야 함
- Firebase 연결 로그 확인 (브라우저 콘솔)

---

## Environment Variables

### .env.local 템플릿

프로젝트 루트에 `.env.local` 파일을 생성하고 다음 내용을 입력합니다:

```bash
# ============================================================================
# Firebase Configuration (클라이언트 사이드)
# ============================================================================
# Firebase Console에서 확인:
# https://console.firebase.google.com/project/YOUR_PROJECT_ID/settings/general

NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# ============================================================================
# Firebase Admin SDK (서버 사이드 전용) - 선택사항
# ============================================================================
# Service Account 키 파일 정보
# Firebase Console > 프로젝트 설정 > 서비스 계정 > 새 비공개 키 생성

FIREBASE_ADMIN_PROJECT_ID=your_project_id
FIREBASE_ADMIN_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour_Private_Key_Here\n-----END PRIVATE KEY-----\n"

# ============================================================================
# Naver Book Search API (서버 사이드 전용)
# ============================================================================
# 네이버 개발자 센터에서 발급: https://developers.naver.com/apps/#/register
# ⚠️ NEXT_PUBLIC_ 접두사 없이 설정 (서버 전용)

NAVER_CLIENT_ID=your_client_id_here
NAVER_CLIENT_SECRET=your_client_secret_here

# ============================================================================
# OpenAI API (AI 매칭용) - 선택사항
# ============================================================================
# OpenAI Platform에서 발급: https://platform.openai.com/api-keys

OPENAI_API_KEY=sk-your-openai-api-key-here

# ============================================================================
# 주의사항
# ============================================================================
# 1. .env.local 파일은 절대 Git에 커밋하지 마세요
# 2. NEXT_PUBLIC_ 접두사가 있는 변수는 클라이언트에 노출됩니다
# 3. API 키 등 민감한 정보는 NEXT_PUBLIC_ 없이 설정하세요
```

### 환경 변수 설명

#### Firebase 클라이언트 설정 (필수)

모든 변수는 `NEXT_PUBLIC_` 접두사를 사용합니다 (클라이언트 노출 허용).

| 변수 | 설명 | 예시 |
|------|------|------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase API 키 | `AIzaSyC...` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | 인증 도메인 | `project.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | 프로젝트 ID | `my-project-123` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Storage 버킷 | `project.appspot.com` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | FCM Sender ID | `123456789012` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | 앱 ID | `1:123456:web:abc123` |

**Firebase 설정값 확인 방법**:
1. [Firebase Console](https://console.firebase.google.com) 접속
2. 프로젝트 선택
3. 프로젝트 설정 (⚙️) > 일반 탭
4. "내 앱" 섹션에서 "웹 앱" 선택
5. "Firebase SDK 추가" 스니펫에서 설정값 복사

---

#### Naver Book Search API (필수)

책 검색 기능을 위한 네이버 API 키입니다.

| 변수 | 설명 |
|------|------|
| `NAVER_CLIENT_ID` | 네이버 애플리케이션 클라이언트 ID |
| `NAVER_CLIENT_SECRET` | 네이버 애플리케이션 클라이언트 시크릿 |

**네이버 API 키 발급 방법**:
1. [네이버 개발자 센터](https://developers.naver.com) 접속 및 로그인
2. [애플리케이션 등록](https://developers.naver.com/apps/#/register) 클릭
3. 애플리케이션 정보 입력:
   - **애플리케이션 이름**: `필립앤소피 독서클럽` (자유)
   - **사용 API**: `검색` 선택 → `책` 체크
   - **환경 추가**: 웹 서비스 URL 입력 (개발: `http://localhost:3000`, 프로덕션: `https://yourdomain.com`)
4. 등록 후 발급된 `Client ID`와 `Client Secret` 복사
5. `.env.local`에 입력

**⚠️ 주의**: `NEXT_PUBLIC_` 접두사를 사용하지 마세요! (서버 전용)

---

#### Firebase Admin SDK (선택사항)

서버 사이드에서 Firebase Admin SDK를 사용할 경우 필요합니다.

| 변수 | 설명 |
|------|------|
| `FIREBASE_ADMIN_PROJECT_ID` | 프로젝트 ID |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Service Account 이메일 |
| `FIREBASE_ADMIN_PRIVATE_KEY` | Private Key (JSON에서 추출) |

**Service Account 키 생성 방법**:
1. Firebase Console > 프로젝트 설정 > 서비스 계정
2. "새 비공개 키 생성" 클릭
3. JSON 파일 다운로드
4. JSON 파일에서 다음 값 추출:
   ```json
   {
     "project_id": "your-project-id",
     "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
     "client_email": "firebase-adminsdk-xyz@your-project.iam.gserviceaccount.com"
   }
   ```
5. `.env.local`에 입력 (private_key는 따옴표로 감싸기)

**또는 JSON 파일 경로 지정**:
```bash
# firebase-service-account.json 파일을 프로젝트 루트에 저장
# (gitignore에 포함됨)
```

---

#### OpenAI API (선택사항)

AI 매칭 기능을 위한 OpenAI API 키입니다.

| 변수 | 설명 |
|------|------|
| `OPENAI_API_KEY` | OpenAI API 키 |

**OpenAI API 키 발급 방법**:
1. [OpenAI Platform](https://platform.openai.com) 접속 및 로그인
2. [API Keys](https://platform.openai.com/api-keys) 페이지로 이동
3. "Create new secret key" 클릭
4. 키 복사 (한 번만 표시됨!)
5. `.env.local`에 입력

---

### 환경 변수 검증

```bash
# Next.js 환경 변수 확인 스크립트 (터미널에서 실행)
node -e "
const envVars = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NAVER_CLIENT_ID',
  'NAVER_CLIENT_SECRET'
];

envVars.forEach(v => {
  const val = process.env[v];
  console.log(\`\${v}: \${val ? '✅ 설정됨' : '❌ 누락'}\`);
});
"
```

---

## Development Workflow

### 개발 서버 시작

```bash
npm run dev
```

- **URL**: http://localhost:3000
- **Hot Reload**: 파일 저장 시 자동 새로고침
- **Dev bundler**: Next.js dev 서버 (Turbopack 사용 가능)

**포트 변경**:
```bash
# 포트 3001로 실행
npm run dev -- -p 3001
```

---

### 빌드 및 프로덕션 실행

```bash
# 프로덕션 빌드
npm run build

# 프로덕션 서버 실행
npm start
```

**빌드 확인**:
- `.next/` 디렉토리가 생성됨
- 빌드 에러가 없어야 함
- 타입 에러 확인 (TypeScript)

---

### 린트 및 타입 체크

```bash
# ESLint 실행
npm run lint

# TypeScript 타입 체크
npx tsc --noEmit
```

**자동 수정**:
```bash
# ESLint 자동 수정
npm run lint -- --fix
```

---

### 데이터 작업 (선택사항)

이 레포지토리는 범용 “시드 데이터 생성” 스크립트를 기본 제공하지 않습니다.

대신 `src/scripts/` / `scripts/`에 마이그레이션/정리/검증 스크립트가 있으며, 운영 DB에 영향을 줄 수 있으니 주의해서 사용하세요.

```bash
# 예시 (package.json 기준)
npm run fix:duplicate-submissions
npm run migrate:storage
npm run migrate:notices-submissions
npm run audit:schema
npm run stats
```

---

### 이미지 최적화

```bash
# 랜딩 이미지 변환/최적화
npm run convert:landing-images
```

---

## Scripts Documentation

스크립트는 `package.json` 및 `scripts/README.md`를 단일 기준으로 관리합니다.

```bash
# TypeScript 스크립트 직접 실행
npx tsx src/scripts/<file>.ts
npx tsx scripts/<file>.ts
```

---

## Firebase Setup

### Step 1: Firebase 프로젝트 생성

1. [Firebase Console](https://console.firebase.google.com) 접속
2. "프로젝트 추가" 클릭
3. 프로젝트 이름 입력 (예: `philipandsophy`)
4. Google 애널리틱스 설정 (선택사항)
5. 프로젝트 생성 완료

---

### Step 2: Firestore 데이터베이스 설정

1. Firebase Console > "Firestore Database" 메뉴
2. "데이터베이스 만들기" 클릭
3. **프로덕션 모드** 선택 (보안 규칙 수동 설정)
4. 위치 선택: `asia-northeast3 (Seoul)` (한국 서버)
5. 데이터베이스 생성 완료

---

### Step 3: Firebase Storage 설정

1. Firebase Console > "Storage" 메뉴
2. "시작하기" 클릭
3. **프로덕션 모드** 선택
4. 위치 선택: Firestore와 동일 (Seoul)
5. Storage 생성 완료

---

### Step 4: Firebase Authentication 설정

1. Firebase Console > "Authentication" 메뉴
2. "시작하기" 클릭
3. **로그인 방법** 탭에서 "전화" 활성화
4. reCAPTCHA 확인자 설정
5. 저장

**테스트 전화번호 추가** (선택사항):
- 테스트 전화번호: `+82 10-0000-0001`
- 확인 코드: `123456`

---

### Step 5: Security Rules 배포

**Firestore Rules** (`firestore.rules`):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 인증된 사용자만 읽기 가능
    match /{document=**} {
      allow read: if request.auth != null;
    }

    // 관리자만 쓰기 가능
    match /participants/{participantId} {
      allow write: if request.auth != null &&
                      request.auth.token.isAdministrator == true;
    }

    match /notices/{noticeId} {
      allow write: if request.auth != null &&
                      request.auth.token.isAdministrator == true;
    }

    // 참가자는 자신의 독서 인증만 생성 가능
    match /reading_submissions/{submissionId} {
      allow create: if request.auth != null &&
                       request.auth.uid == request.resource.data.firebaseUid;
      allow update, delete: if request.auth != null &&
                               request.auth.token.isAdministrator == true;
    }
  }
}
```

**Storage Rules** (`storage.rules`):
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /reading_submissions/{participationCode}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
                      request.resource.size < 10 * 1024 * 1024 &&
                      request.resource.contentType.matches('image/.*');
    }

    match /notices/{cohortId}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
                      request.auth.token.isAdministrator == true;
    }
  }
}
```

**배포**:
```bash
# Firebase CLI로 배포
firebase deploy --only firestore:rules
firebase deploy --only storage:rules
```

---

### Step 6: Service Account 키 생성 (Admin SDK용)

1. Firebase Console > 프로젝트 설정 > 서비스 계정
2. "새 비공개 키 생성" 클릭
3. JSON 파일 다운로드
4. 파일명을 `firebase-service-account.json`으로 변경
5. 프로젝트 루트에 저장 (gitignore에 포함됨)

**또는 환경 변수로 설정** ([Environment Variables](#environment-variables) 참조)

---

### Step 7: Firebase 설정값 확인

1. Firebase Console > 프로젝트 설정 > 일반
2. "내 앱" 섹션에서 "웹 앱" 선택
3. "Firebase SDK 추가" 클릭
4. 설정값 복사하여 `.env.local`에 입력

---

## Git Workflow

### 브랜치 전략

**Main Branch**:
- `main`: 프로덕션 배포 브랜치 (보호됨)

**Feature Branch**:
- `feature/기능명`: 새로운 기능 개발
- `fix/버그명`: 버그 수정
- `refactor/리팩토링명`: 코드 리팩토링

---

### 브랜치 생성 및 작업

```bash
# 최신 main 브랜치로 업데이트
git checkout main
git pull origin main

# 새 feature 브랜치 생성
git checkout -b feature/book-search-autocomplete

# 작업 수행...

# 변경사항 확인
git status
git diff

# 스테이징
git add .

# 커밋 (아래 커밋 메시지 형식 참조)
git commit -m "feat: add book search autocomplete component"

# 원격 브랜치에 푸시
git push origin feature/book-search-autocomplete
```

---

### 커밋 메시지 형식

**Conventional Commits** 규칙을 따릅니다:

```
<type>: <subject>

<body>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Type**:
- `feat`: 새로운 기능
- `fix`: 버그 수정
- `refactor`: 코드 리팩토링 (기능 변경 없음)
- `docs`: 문서 업데이트
- `style`: 코드 포맷팅 (기능 변경 없음)
- `test`: 테스트 추가/수정
- `chore`: 빌드/설정 변경

**예시**:
```bash
# 기능 추가
git commit -m "feat: implement phone authentication flow"

# 버그 수정
git commit -m "fix: resolve iOS PWA scroll bug in chat page"

# 리팩토링
git commit -m "refactor: extract shimmer animation to utility class"

# 문서
git commit -m "docs: update Firebase setup guide"
```

---

### Pull Request 생성

1. GitHub에서 "New pull request" 클릭
2. Base: `main`, Compare: `feature/브랜치명`
3. 제목 및 설명 작성:
   ```markdown
   ## Summary
   - 책 검색 자동완성 기능 추가
   - Naver Book API 연동
   - 디바운스 및 캐싱 최적화

   ## Test plan
   - [ ] 책 제목 검색 시 자동완성 표시 확인
   - [ ] 디바운스 500ms 동작 확인
   - [ ] 네트워크 에러 핸들링 확인

   🤖 Generated with [Claude Code](https://claude.com/claude-code)
   ```
4. Reviewer 지정 (선택)
5. "Create pull request" 클릭

---

### 코드 리뷰 및 머지

**리뷰어 체크리스트**:
- ✅ 코드 스타일 (CLAUDE.md 준수)
- ✅ 타입 안전성 (TypeScript)
- ✅ 에러 처리
- ✅ 성능 영향도
- ✅ 보안 이슈

**머지 후**:
```bash
# 로컬 main 브랜치 업데이트
git checkout main
git pull origin main

# Feature 브랜치 삭제
git branch -d feature/book-search-autocomplete
```

---

## Testing

### 현재 상태

**⚠️ 현재 테스트가 구현되어 있지 않습니다.**

프로젝트는 TDD (Test-Driven Development) 원칙을 지향하지만, 현재는 테스트 코드가 없는 상태입니다.

---

### 권장 테스팅 설정

**테스트 프레임워크**:
- **Jest**: 유닛 테스트
- **React Testing Library**: 컴포넌트 테스트
- **Playwright**: E2E 테스트 (MCP 통합됨)

**설치** (프로젝트에 아직 설치되지 않음):
```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom
npm install --save-dev @types/jest ts-jest
```

---

### TDD 워크플로우 (CLAUDE.md 준수)

**Red → Green → Refactor 사이클**:

#### 1. 🔴 RED Phase - 실패하는 테스트 작성

```typescript
// tests/unit/participants.test.ts
import { createParticipant } from '@/lib/firebase/participants';

describe('createParticipant', () => {
  it('should create a participant with valid data', async () => {
    // Arrange
    const participantData = {
      cohortId: 'cohort1',
      name: '홍길동',
      phoneNumber: '01012345678',
      gender: 'male' as const,
    };

    // Act
    const participantId = await createParticipant(participantData);

    // Assert
    expect(participantId).toBeTruthy();
    expect(typeof participantId).toBe('string');
  });
});
```

**실행**:
```bash
npm test  # 테스트 실패 (기능 미구현)
```

---

#### 2. 🟢 GREEN Phase - 최소한의 코드로 통과

```typescript
// src/lib/firebase/participants.ts
export async function createParticipant(data) {
  // 최소한의 구현
  const docRef = await addDoc(collection(db, 'participants'), {
    ...data,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
}
```

**실행**:
```bash
npm test  # 테스트 통과!
```

---

#### 3. 🔵 REFACTOR Phase - 코드 개선

```typescript
// 타입 추가, 에러 처리, 로깅 등
export async function createParticipant(
  data: Omit<Participant, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const db = getDb();
  const now = Timestamp.now();

  try {
    const docRef = await addDoc(collection(db, COLLECTIONS.PARTICIPANTS), {
      ...data,
      createdAt: now,
      updatedAt: now,
    });

    logger.info('Participant created:', { id: docRef.id });
    return docRef.id;
  } catch (error) {
    logger.error('Failed to create participant:', error);
    throw error;
  }
}
```

**재실행**:
```bash
npm test  # 여전히 통과!
```

---

### 테스트 구조 (AAA Pattern)

```typescript
test('should do something', () => {
  // Arrange - 테스트 데이터 설정
  const input = 'test';

  // Act - 함수 실행
  const result = myFunction(input);

  // Assert - 결과 검증
  expect(result).toBe('expected');
});
```

---

### 테스트 커버리지 목표

**CLAUDE.md 권장 비율**:
- 유닛 테스트: 70%
- 통합 테스트: 20%
- E2E 테스트: 10%

---

## Deployment

### Vercel 배포

프로젝트는 **Vercel**에 최적화되어 있습니다.

#### Step 1: Vercel 계정 연결

```bash
# Vercel CLI 설치 (선택사항)
npm install -g vercel

# Vercel 로그인
vercel login
```

---

#### Step 2: GitHub 연동

1. [Vercel Dashboard](https://vercel.com/dashboard) 접속
2. "New Project" 클릭
3. GitHub 저장소 연결
4. 프로젝트 선택 (`projectpns`)
5. 프레임워크: **Next.js** 자동 감지
6. 루트 디렉토리: `.` (기본값)

---

#### Step 3: 환경 변수 설정

1. Vercel Dashboard > 프로젝트 > Settings > Environment Variables
2. `.env.local`의 모든 변수를 입력:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
   - `NAVER_CLIENT_ID`
   - `NAVER_CLIENT_SECRET`
   - `OPENAI_API_KEY` (선택)
3. 환경 선택: **Production**, **Preview**, **Development** 모두 체크

---

#### Step 4: 배포

**자동 배포** (권장):
```bash
# main 브랜치에 푸시하면 자동 배포
git push origin main
```

**수동 배포**:
```bash
# Vercel CLI로 배포
vercel

# 프로덕션 배포
vercel --prod
```

---

#### Step 5: 배포 확인

1. Vercel Dashboard에서 배포 상태 확인
2. 배포 완료 후 도메인 확인 (예: `projectpns.vercel.app`)
3. 브라우저에서 접속하여 동작 확인

**배포 로그 확인**:
- Vercel Dashboard > Deployments > 특정 배포 클릭
- Build Logs 확인

---

### 프로덕션 체크리스트

배포 전 확인사항:

- [ ] **환경 변수**: Vercel에 모든 환경 변수 설정
- [ ] **Firebase Security Rules**: 프로덕션 규칙 배포
- [ ] **Storage Rules**: 프로덕션 규칙 배포
- [ ] **빌드 성공**: `npm run build` 로컬 테스트
- [ ] **타입 체크**: `npx tsc --noEmit` 통과
- [ ] **린트**: `npm run lint` 통과
- [ ] **API 키**: Naver, OpenAI API 키 유효성 확인
- [ ] **도메인 설정**: 커스텀 도메인 연결 (선택)
- [ ] **성능 테스트**: Lighthouse 점수 확인
- [ ] **보안 점검**: `.env.local` 커밋 안 됨 확인

---

### 커스텀 도메인 설정 (선택)

1. Vercel Dashboard > 프로젝트 > Settings > Domains
2. "Add Domain" 클릭
3. 도메인 입력 (예: `philipandsophy.com`)
4. DNS 설정 (도메인 등록 업체에서):
   - **A Record**: `76.76.19.19` (Vercel IP)
   - **CNAME**: `cname.vercel-dns.com`
5. 확인 대기 (최대 48시간)
6. HTTPS 자동 설정 (Let's Encrypt)

---

## Troubleshooting

### 일반적인 문제 해결

#### 1. `npm install` 실패

**증상**:
```
npm ERR! code ERESOLVE
npm ERR! ERESOLVE unable to resolve dependency tree
```

**해결**:
```bash
# package-lock.json 및 node_modules 삭제
rm -rf package-lock.json node_modules

# 재설치
npm install

# 또는 --legacy-peer-deps 옵션 사용
npm install --legacy-peer-deps
```

---

#### 2. Firebase 연결 실패

**증상**:
```
Firebase: Error (auth/invalid-api-key)
```

**해결**:
1. `.env.local` 파일 확인:
   - 모든 `NEXT_PUBLIC_FIREBASE_*` 변수 입력되었는지 확인
   - API 키에 공백 또는 따옴표 없는지 확인
2. Firebase Console에서 설정값 재확인
3. 개발 서버 재시작: `npm run dev`

---

#### 3. Naver API 호출 실패

**증상**:
```
Book search failed with status 401
```

**해결**:
1. `.env.local`에서 `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET` 확인
2. 네이버 개발자 센터에서 애플리케이션 상태 확인
3. 웹 서비스 URL에 `localhost:3000` 추가되었는지 확인

---

#### 4. iOS PWA 스크롤 버그

**증상**: iOS PWA에서 오버레이 스크롤 불가

**해결**: [iOS PWA Scroll Troubleshooting](../troubleshooting/ios-pwa-scroll.md) 참조

---

#### 5. TypeScript 타입 에러

**증상**:
```
Type 'string | undefined' is not assignable to type 'string'
```

**해결**:
```typescript
// ❌ 잘못됨
const title: string = participant.currentBookTitle; // undefined일 수 있음

// ✅ 올바름
const title: string = participant.currentBookTitle || '책 미설정';

// 또는 Optional Chaining
const title = participant?.currentBookTitle ?? '책 미설정';
```

---

#### 6. Next.js params 타입 에러 (Next.js 15+)

**증상**:
```
Type 'string' is not assignable to type 'Promise<{ id: string }>'
```

**해결**:
```typescript
// ❌ Next.js 14 방식 (잘못됨)
export default function Page({ params }: { params: { id: string } }) {
  const { id } = params; // 에러!
}

// ✅ Next.js 15+ 방식 (올바름)
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
}
```

---

### 로그 확인

**클라이언트 로그** (브라우저 콘솔):
```javascript
// 개발자 도구 열기: F12 또는 Cmd+Option+I (macOS)
// Console 탭에서 에러 확인
```

**서버 로그** (터미널):
```bash
# 개발 서버 실행 중 터미널에서 확인
npm run dev

# 에러가 터미널에 출력됨
```

**Vercel 로그** (프로덕션):
- Vercel Dashboard > Deployments > 특정 배포
- Function Logs 또는 Build Logs 확인

---

### Firebase Emulator 사용

**로컬 개발용 Firebase Emulator**:

```bash
# Firebase Emulator 설치
npm install -g firebase-tools

# Emulator 시작
firebase emulators:start

# 특정 서비스만 시작
firebase emulators:start --only firestore,auth
```

**Emulator UI**: http://localhost:4000

**코드에서 Emulator 사용**:
```typescript
// src/lib/firebase/config.ts
if (process.env.NODE_ENV === 'development') {
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectAuthEmulator(auth, 'http://localhost:9099');
}
```

---

## Development Best Practices

### 코드 스타일 가이드

**CLAUDE.md 준수**:
1. **Early Returns**: 깊은 중첩 피하기
2. **Conditional Classes**: `clsx`/`cn` 사용
3. **Descriptive Names**: 명확한 변수/함수명
4. **Constants**: 매직 넘버/문자열 상수화
5. **DRY**: 중복 코드 제거
6. **Functional & Immutable**: 순수 함수 지향
7. **Minimal Changes**: 필요한 부분만 수정

---

### 컴포넌트 작성 패턴

```typescript
'use client'; // 모든 컴포넌트는 'use client' (프로젝트 규칙)

import { useState } from 'react';
import { cn } from '@/lib/utils'; // Tailwind 클래스 병합

interface Props {
  title: string;
  onSubmit: (data: FormData) => void;
}

export function MyComponent({ title, onSubmit }: Props) {
  const [isLoading, setIsLoading] = useState(false);

  // Early return
  if (!title) {
    return null;
  }

  // Event handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await onSubmit(formData);
    } catch (error) {
      logger.error('Submit failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="text-2xl font-bold">{title}</h2>
      <button
        type="submit"
        disabled={isLoading}
        className={cn(
          'bg-black text-white px-4 py-2 rounded-lg',
          'hover:bg-gray-800 transition-colors',
          isLoading && 'opacity-50 cursor-not-allowed'
        )}
      >
        {isLoading ? '제출 중...' : '제출하기'}
      </button>
    </form>
  );
}
```

---

### 에러 처리 패턴

```typescript
import { logger } from '@/lib/logger';

async function fetchData() {
  try {
    const data = await riskyOperation();
    return data;
  } catch (error) {
    // 1. 로깅 (개발: console, 프로덕션: Sentry)
    logger.error('Failed to fetch data:', error);

    // 2. 사용자 친화적 메시지
    throw new Error('데이터를 불러오는 중 오류가 발생했습니다.');
  }
}
```

---

### 성능 최적화 패턴

**React Query 캐싱**:
```typescript
const { data, isLoading } = useQuery({
  queryKey: ['participants', cohortId],
  queryFn: () => getParticipantsByCohort(cohortId),
  staleTime: 60 * 1000, // 60초 동안 재요청 안 함
});
```

**동적 Import**:
```typescript
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <div className="shimmer h-40 w-full" />,
  ssr: false, // 클라이언트에서만 로드
});
```

**이미지 최적화**:
```typescript
import Image from 'next/image';

<Image
  src={imageUrl}
  alt="프로필"
  width={200}
  height={200}
  loading="lazy"
  className="rounded-full"
/>
```

---

### Git 커밋 전 체크리스트

커밋하기 전에 다음을 확인하세요:

- [ ] **린트**: `npm run lint` 통과
- [ ] **타입 체크**: `npx tsc --noEmit` 통과
- [ ] **빌드**: `npm run build` 성공
- [ ] **로컬 테스트**: `npm run dev`로 동작 확인
- [ ] **커밋 메시지**: Conventional Commits 형식
- [ ] **파일 확인**: 불필요한 파일 포함 안 됨 (`.env.local`, `node_modules` 등)

---

## 요약 (Summary)

이 가이드는 필립앤소피 프로젝트의 개발 환경 설정부터 배포까지의 전체 워크플로우를 다룹니다.

### ✅ 핵심 단계

1. **Prerequisites**: Node.js, npm, Git, Firebase CLI 설치
2. **Initial Setup**: 저장소 클론, 의존성 설치, 환경 변수 설정
3. **Firebase Setup**: 프로젝트 생성, Firestore/Storage/Auth 설정
4. **Development**: 개발 서버 실행, 코드 작성
5. **Testing**: 테스트/타입 체크/린트로 품질 유지
6. **Deployment**: Vercel 배포, 환경 변수 설정, 도메인 연결

### 🛠️ 필수 명령어

```bash
# 개발
npm run dev              # 개발 서버 시작
npm run build            # 프로덕션 빌드
npm run lint             # 린트 실행
npm run typecheck        # 타입 체크
npm run test             # 테스트

# 운영/데이터 스크립트 (주의)
npm run audit:schema
npm run stats

# 배포
vercel --prod            # Vercel 프로덕션 배포
```

### 📚 관련 문서

- **[CLAUDE.md](../../CLAUDE.md)**: 프로젝트 개발 가이드 (필독!)
- **[System Architecture](../architecture/system-architecture.md)**: 시스템 아키텍처
- **[API Reference](../api/api-reference.md)**: API 레퍼런스
- **[Firebase Setup](../setup/firebase.md)**: Firebase 상세 설정
- **[Database Optimization](../optimization/database.md)**: 데이터베이스 최적화

---

*이 문서는 필립앤소피 프로젝트의 개발 환경 설정 및 워크플로우에 대한 단일 권위 문서입니다.*

**문서 버전**: v1.0.0
**최종 업데이트**: 2025-10-16
