# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**필립앤소피 (Philip & Sophy)** - A reading social club platform built with Next.js 16, React 19, TypeScript, and Firebase.

The project combines:
1. **Landing Page** (`/`) - Marketing site for the reading club
2. **Member App** (`/app`) - Participant portal with chat, profiles, reading submissions
3. **Data Center** (`/datacntr`) - Admin dashboard with 30+ API endpoints

## Essential Commands

```bash
# Development
npm run dev              # Start dev server with Turbopack
npm run build            # Build (includes service worker)
npm run lint             # ESLint
npx tsc --noEmit         # Type check

# Database Scripts (run with tsx)
npm run stats            # Show database statistics
npm run audit:schema     # Audit Firestore schema

# Firebase
firebase deploy          # Deploy configuration
```

## Architecture

### Route Structure
```
/                        # Landing page
/app                     # Access code entry
/app/chat                # Notices and chat
/app/chat/today-library  # Today's reading submissions
/app/profile/[id]        # Member profiles
/app/submit/step[1-3]    # Reading submission flow

/datacntr                # Admin login
/datacntr/cohorts        # Cohort management
/datacntr/participants   # Participant management
/datacntr/submissions    # Reading submissions
/datacntr/notices        # Notice management
/datacntr/notice-templates  # Reusable notice templates
/datacntr/notifications  # Push notification management

/application             # New member application form
/program                 # Program introduction
/service                 # Service page
```

### Feature Modules (`src/features/`)
- **application/** - Multi-step application form with validation
- **auth/** - Phone-based authentication, splash screen
- **onboarding/** - New user onboarding flow
- **socializing/** - Meetup dashboard, voting, attendance

### Firebase Structure (`src/lib/firebase/`)
- **admin.ts / admin-init.ts** - Server-side Admin SDK
- **client.ts / config.ts** - Client-side initialization
- **cohorts.ts** - Cohort CRUD
- **participants.ts** - Participant management
- **submissions.ts** - Reading submissions
- **notices.ts / notice-templates.ts** - Notices and templates
- **messages.ts / meetup-chat.ts** - Messaging
- **messaging.ts / webpush.ts** - Push notifications (FCM + Web Push)
- **daily-questions.ts** - Profile questions per cohort
- **funnel.ts** - Application funnel tracking

### Key Patterns

**Client Components**: Always use `'use client'` directive unless explicitly server-side.

**Next.js 16 Page Params**: Must be async/await:
```tsx
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
}
```

**Firebase Admin SDK**: All scripts use Admin SDK (per global CLAUDE.md):
```typescript
import { getAdminFirestore } from '@/lib/firebase/admin';
const db = getAdminFirestore();
```

**PWA/Service Worker**: Manual maintenance at `public/sw.js` - handles FCM and Web Push.

## Technology Stack

- **Next.js 16** + **React 19** + **TypeScript 5**
- **Tailwind CSS 3.4** + **Shadcn UI** + **Framer Motion 11**
- **Firebase** (Firestore + Storage + FCM)
- **TanStack Query v5** + **Zustand v4**
- **AI SDK** (@ai-sdk/anthropic, @ai-sdk/openai, @ai-sdk/google)
- **date-fns v4** + **date-fns-tz** + **zod v3**

## Code Conventions

### Must Follow
1. `'use client'` on all components unless server-side
2. Await page params in Next.js 16
3. Use `npm` (not yarn/pnpm)
4. Use `logger` from `@/lib/logger` (not console.error)
5. Extract magic values to `src/constants/`
6. Use Admin SDK for all Firebase scripts

### Library Preferences
- **Dates**: `date-fns` (not moment)
- **Utilities**: `es-toolkit` (not lodash)
- **State**: Zustand for global, useState for local
- **Forms**: React Hook Form + Zod
- **Icons**: lucide-react

### TypeScript Config (Relaxed)
- `strictNullChecks: false`
- `noImplicitAny: false`
- Path alias: `@/*` → `src/*`

## Important Notes

### Git Rules (from global CLAUDE.md)
- **Never push** without explicit user approval
- **Never deploy** without explicit request - this is a production app

### Image Handling
- Images unoptimized (Firebase Resize Extension used)
- Allowed domains: Firebase Storage, Naver book covers, Kyobo book covers

### Environment Variables
```env
# Firebase (client - NEXT_PUBLIC_)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...

# Firebase Admin (server - no prefix)
# Uses firebase-service-account.json

# Naver Book API (server)
NAVER_CLIENT_ID=...
NAVER_CLIENT_SECRET=...
```

### Common Pitfalls
- Forgetting `'use client'`
- Not awaiting page params
- Using console.error instead of logger
- Hardcoding values instead of using constants
- Not using Admin SDK for scripts

## Documentation

- **docs/setup/** - Firebase, PWA setup guides
- **docs/architecture/** - Date logic, notice templates
- **docs/design/** - Notice UX improvements

See README.md for full feature documentation in Korean.

## Refactoring Safety Checklist

리팩토링 완료 후 **반드시** 확인해야 하는 항목들:

### 1. 필수 필드 누락 체크
```bash
npm run test  # 필수 필드 검증 테스트 실행
```

특히 Firestore 쿼리에 사용되는 필드 주의:
- `submittedAt` - orderBy 쿼리에 사용 (없으면 쿼리 결과에서 제외!)
- `submissionDate` - where 조건에 사용
- `participantId` - where 조건에 사용

### 2. Import 삭제 시 확인
삭제하려는 import가 실제로 사용되지 않는지 확인:
```typescript
// ⚠️ 이런 import 삭제 시 주의
import { Timestamp } from 'firebase/firestore';  // Timestamp.now() 사용 여부 확인
```

### 3. Spread Operator 리팩토링 주의
```typescript
// Before: 명시적으로 필드 설정
await createSubmission({
  ...data,
  submittedAt: Timestamp.now(),  // ⚠️ 이 줄이 빠지면 버그!
});

// After: spread만 사용 시 필드 누락 위험
await createSubmission(submissionData);  // submittedAt이 data에 있는지 확인!
```

### 4. 시점 의존 코드 체크
다음 패턴이 리팩토링 후에도 유지되는지 확인:
- `Timestamp.now()` - 현재 시각 저장
- `getSubmissionDate()` - 새벽 2시 마감 정책 적용
- `Date.now()` - 타임스탬프 생성

### 5. 실제 사례 (2025-12-05 버그)
리팩토링 중 `submittedAt: Timestamp.now()` 코드가 빠져서:
- 프로필북에서 인증 내역이 안 보이는 버그 발생
- Firestore `orderBy('submittedAt')` 쿼리에서 해당 문서 제외됨
- 4명의 사용자 데이터 수동 복구 필요했음
