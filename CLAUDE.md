# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Next.js 15** project built with **React 19**, **TypeScript**, and **Tailwind CSS**. The project uses the **EasyNext** framework and **Firebase** for backend services. It follows a feature-based architecture with a strong emphasis on functional programming and clean code principles.

### Integrated Project Structure

This project combines two applications:
1. **Landing Page** (`/`) - Marketing website for 필립앤소피 (Philip & Sophy) reading social club
2. **Web App** (`/app`) - Member portal with chat, profile, and program features

**Important Routes:**
- `/` - Main landing page (converted from static HTML to Next.js)
- `/app` - Access code entry for member portal (web app entry point)
- `/app/chat` - Member chat and notice interface
- `/app/profile/[participantId]` - Member profile pages
- `/app/program` - Program introduction
- `/privacy-policy.html` - Static HTML legal page
- `/terms-of-service.html` - Static HTML legal page

**Legacy Route Redirects (configured in next.config.ts):**
- `/member10` → `/app` (301 permanent redirect)
- `/chat` → `/app/chat` (301 permanent redirect)
- `/profile/*` → `/app/profile/*` (301 permanent redirect)
- `/program` → `/app/program` (301 permanent redirect)

## Essential Commands

### Development
```bash
npm run dev              # Start dev server with Turbopack (localhost:3000)
npm run build            # Production build
npm start                # Start production server
npm run lint             # Run ESLint
```

### Firebase Data Seeding
```bash
npm run seed:cohorts     # Seed cohorts and participants
npm run seed:notices     # Seed notices data
npm run seed:submissions # Seed reading submissions
npm run seed:admin       # Seed admin participant data
npm run seed:all         # Seed all data (cohorts + notices + submissions)
```

### Testing & Type Checking
```bash
npx tsc --noEmit         # TypeScript type checking
```

### Firebase Commands
```bash
firebase projects:list   # List available Firebase projects
firebase login           # Authenticate with Firebase
firebase deploy          # Deploy Firebase configuration
```

### API Routes
```bash
# Seed data via API endpoint (alternative to npm scripts)
curl -X POST http://localhost:3000/api/seed -H "Content-Type: application/json"
```

## Core Technology Stack

### Framework & UI
- **Next.js 15.1.0** with App Router (React Server Components enabled)
- **React 19** (React 19 canary features enabled)
- **TypeScript 5** with relaxed type checking (strictNullChecks: false, noImplicitAny: false)
- **Tailwind CSS 3.4** with `tailwindcss-animate` for animations
- **Shadcn UI** for component library (path alias: `@/components/ui`)
- **Pretendard Variable** font loaded via CDN in layout.tsx

### State & Data Management
- **@tanstack/react-query** (v5) - Server state management
- **Zustand** (v4) - Lightweight global state
- **React Hook Form** (v7) + **Zod** (v3) - Form handling & validation
- **Firebase** (v12.3.0) - Backend service (Firestore + Storage)

### Utilities & Icons
- **lucide-react** - Icon library
- **date-fns** (v4) - Date manipulation
- **es-toolkit** (v1) - Utility functions (preferred over lodash)
- **react-use** (v17) - Common React hooks
- **ts-pattern** (v5) - Type-safe pattern matching
- **framer-motion** (v11) - Animations
- **axios** (v1.7.9) - HTTP client

## Project Architecture

### Directory Structure
```
src/
├── app/                          # Next.js App Router
│   ├── page.tsx                 # Landing page (root)
│   ├── app/                     # Web app root (member portal)
│   │   ├── page.tsx             # Access code entry (web app entry point)
│   │   ├── layout.tsx           # Web app layout
│   │   ├── chat/                # Chat and notice interface
│   │   │   ├── page.tsx
│   │   │   ├── layout.tsx
│   │   │   └── today-library/   # Today's library feature
│   │   ├── profile/             # Member profiles
│   │   │   └── [participantId]/ # Dynamic profile pages
│   │   └── program/             # Program introduction
│   │       ├── page.tsx
│   │       └── layout.tsx
│   ├── layout.tsx               # Root layout (SEO metadata, Pretendard font)
│   ├── providers.tsx            # Global providers (React Query, Theme, Firebase)
│   └── globals.css              # Global Tailwind styles
├── components/
│   └── ui/                      # Shadcn UI components
├── features/[featureName]/      # Feature-based modules
│   ├── components/              # Feature-specific components
│   ├── hooks/                   # Feature-specific hooks
│   ├── lib/                     # Feature-specific utilities
│   ├── constants/               # Feature-specific constants
│   └── api.ts                   # API fetch functions
├── hooks/                       # Shared hooks (e.g., use-toast)
├── lib/                         # Shared utilities
│   ├── utils.ts                 # Common utility functions
│   ├── logger.ts                # Logger utility (dev/prod separation)
│   ├── naver-book-api.ts        # Naver Book Search API utility
│   └── firebase/                # Firebase integration
│       ├── index.ts             # Firebase initialization & exports
│       ├── config.ts            # Firebase configuration
│       ├── client.ts            # Firestore client setup
│       ├── cohorts.ts           # Cohort operations
│       ├── participants.ts      # Participant operations
│       ├── submissions.ts       # Reading submission operations
│       ├── notices.ts           # Notice operations
│       ├── messages.ts          # Direct messaging operations
│       └── storage.ts           # Firebase Storage operations
├── scripts/                     # Utility scripts
│   ├── seed-cohorts-participants.ts  # Seed cohorts and participants
│   ├── seed-notices.ts          # Seed notices data
│   └── seed-admin.ts            # Seed admin participant
├── stores/                      # Zustand store definitions
├── styles/                      # Additional stylesheets
│   └── landing.css              # Landing page styles (glassmorphism design)
├── types/                       # TypeScript type definitions
└── constants/                   # Global constants
    ├── api.ts                   # API cache settings (Naver book search)
    ├── validation.ts            # Reading submission validation rules
    ├── search.ts                # Book search configuration (debounce, max results)
    ├── ui.ts                    # UI constants (scroll threshold)
    ├── today-library.ts         # Today's Library constants
    ├── daily-questions.ts       # Daily questions for profiles
    ├── profile-themes.ts        # Profile theme colors
    └── app.ts                   # General app constants

public/
├── image/                       # Static images
│   ├── favicon.webp
│   ├── kakao.webp
│   ├── PnS_1.webp, PnS_2.webp, PnS_3.webp, PnS_4_nofooter.webp
│   └── Thumbnail_V1_1080_1080.webp
├── styles/
│   └── main.css                 # CSS for static HTML pages
├── privacy-policy.html          # Static legal page
├── terms-of-service.html        # Static legal page
├── robots.txt                   # SEO crawler instructions
└── sitemap.xml                  # SEO sitemap
```

### Key Architectural Patterns

#### Client Components by Default
- **ALWAYS use `'use client'` directive** for all components unless explicitly server-side
- This is a project requirement per `.cursor/rules/global.mdc`

#### Next.js 15 Specifics
- **Page params must be async/await promises**:
  ```tsx
  // Correct - Dynamic route pages
  export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
  }

  // Also applies to searchParams
  export default async function Page({ searchParams }: { searchParams: Promise<{ q: string }> }) {
    const { q } = await searchParams;
  }
  ```
- **Turbopack** is used for development (enabled by default with `npm run dev`)

#### Provider Setup Pattern
The project uses a centralized provider pattern in `src/app/providers.tsx`:
- **React Query**: SSR-optimized setup with separate server/client query clients
- **Theme Provider**: next-themes with system theme support
- **Firebase**: Initialized on client-side mount via useEffect
- **Stale time**: Default 60 seconds for queries

#### Firebase Integration
The project uses Firebase for backend services with the following structure:

**Environment Variables** (`.env.local`):
```env
# Firebase 설정 (클라이언트 사이드)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# 네이버 책 검색 API (서버 사이드 전용)
# ⚠️ NEXT_PUBLIC_ 접두사 없음 (서버 전용)
NAVER_CLIENT_ID=your_naver_client_id
NAVER_CLIENT_SECRET=your_naver_client_secret
```

**Firestore Collections**:
- `cohorts`: Reading group cohorts with access codes and date ranges
- `participants`: User participation data linked to cohorts
- `reading_submissions`: Reading certification submissions with images and reviews
- `notices`: System notices/announcements for cohorts
- `messages`: Direct messages between participants and admin

**Firebase Modules**:
- `lib/firebase/cohorts.ts`: Cohort CRUD operations and access code validation
- `lib/firebase/participants.ts`: Participant CRUD operations
- `lib/firebase/submissions.ts`: Reading submission management
- `lib/firebase/notices.ts`: Notice operations
- `lib/firebase/messages.ts`: Direct messaging operations
- `lib/firebase/storage.ts`: File upload/download for Storage
- `lib/firebase/client.ts`: Firestore client initialization
- `lib/firebase/index.ts`: Main Firebase initialization & exports

**Key Firebase Patterns**:
- Use `initializeFirebase()` to initialize the Firebase app (called in providers)
- Import operations from `@/lib/firebase` (e.g., `createParticipant`, `uploadReadingImage`)
- All Firebase operations return Promises
- Use Firebase Timestamp for date fields
- Images stored in Storage at `reading_submissions/{participationCode}/{filename}`

## Code Style & Guidelines

### Must Follow Rules
1. **All components use `'use client'`** unless explicitly server-side
2. **Page params are promises** - always await them
3. **Use picsum.photos** for placeholder images
4. **npm as package manager** (not yarn/pnpm)
5. **Check UTF-8 Korean text** after code generation

### Library Usage
- **Date handling**: `date-fns` (not moment.js)
- **Pattern matching**: `ts-pattern` (for clean branching logic)
- **Server state**: `@tanstack/react-query`
- **Global state**: `zustand`
- **React hooks**: `react-use` (for common patterns)
- **Utilities**: `es-toolkit` (modern lodash alternative)
- **Icons**: `lucide-react`
- **Validation**: `zod` + `react-hook-form`
- **UI components**: Shadcn UI
- **Styling**: Tailwind CSS
- **Backend**: Firebase (Firestore + Storage)
- **Animations**: Framer Motion
- **HTTP Client**: axios (for Naver Book Search API)
- **External APIs**: Naver Book Search API v1.1

### TypeScript Configuration
- Strict mode: enabled
- Null checks: **disabled** (strictNullChecks: false)
- Implicit any: **allowed** (noImplicitAny: false)
- Path aliases: `@/*` maps to `src/*`

### ESLint Configuration
ESLint has relaxed rules:
- `@typescript-eslint/no-empty-object-type`: off
- `@typescript-eslint/no-explicit-any`: off
- `@typescript-eslint/no-unused-vars`: off
- Linting ignored during builds (`ignoreDuringBuilds: true`)

### Code Quality Principles
1. **Early Returns** - Avoid deep nesting
2. **Conditional Classes over Ternary** - Use clsx/cn for className
3. **Descriptive Names** - Clear variable/function names
4. **Constants > Functions** - Prefer constants when possible
5. **DRY** - Don't Repeat Yourself
6. **Functional & Immutable** - Favor pure functions
7. **Minimal Changes** - Touch only what's needed
8. **Composition over Inheritance**

### Constants Usage
- **Always extract magic values to constants files** (`src/constants/*.ts`)
- **Group related constants** by domain (api, validation, search, ui)
- **Use `as const`** for type narrowing and immutability
- **Examples**:
  ```typescript
  // Good: Using constants
  import { SEARCH_CONFIG } from '@/constants/search';
  const debounceDelay = SEARCH_CONFIG.DEBOUNCE_DELAY;

  // Bad: Magic numbers
  const debounceDelay = 500;
  ```

### Logger Usage
- **Never use `console.error` directly** in production code
- **Use `logger` utility** from `@/lib/logger`:
  ```typescript
  import { logger } from '@/lib/logger';

  // Development: logs to console
  // Production: can be sent to Sentry
  logger.error('Failed to fetch data', error);
  logger.warn('Deprecated function called');
  logger.info('User logged in', { userId });
  logger.debug('Debug info', { data });
  ```

### Functional Programming
- Avoid mutation
- Use map/filter/reduce over loops
- Embrace currying and partial application
- Maintain immutability

### Comments & Documentation
- Comment function **purpose** (the "why", not "what")
- Use JSDoc for functions
- Minimize AI-generated comments
- Use clearly named variables/functions instead

## Adding New Components

### Shadcn UI Components
When adding new Shadcn components, provide installation command:
```bash
npx shadcn@latest add [component-name]
# Examples:
npx shadcn@latest add card
npx shadcn@latest add dialog
npx shadcn@latest add textarea
```

### Component Configuration
Shadcn is configured via `components.json`:
- Style: `default`
- RSC: enabled
- Base color: `neutral`
- CSS variables: enabled
- Aliases:
  - `@/components` → components
  - `@/lib/utils` → utils
  - `@/components/ui` → ui

## Data Management

The project uses **Firebase Firestore** for data persistence. Seed scripts generate sample data directly in the scripts.

### Seeding Firebase
Use seed scripts to populate Firestore with initial data:
```bash
npm run seed:cohorts     # Seeds cohorts and participants
npm run seed:notices     # Seeds notices
npm run seed:submissions # Seeds reading submissions
npm run seed:admin       # Seeds admin participant
npm run seed:all         # Seeds all data at once
```

### Data Access Pattern
1. Use seed scripts (in `src/scripts/`) to populate Firebase collections with sample data
2. Query Firebase in the app using hooks (e.g., `useParticipants`, `useNotices`, `useSubmissions`)
3. All Firebase operations are in `src/lib/firebase/` modules
4. Constants (like daily questions) are in `src/constants/`

## Testing & Error Handling

### Testing Strategy
- Unit tests for core functionality
- Integration tests for API/database interactions
- End-to-end tests for critical user flows

### Error Handling
- Use try-catch for async operations
- Return errors over throwing exceptions
- Provide user-friendly error messages
- Never expose system details to users
- Use TODO: and FIXME: comments for known issues

## Performance Considerations

- Avoid premature optimization
- Profile before optimizing
- Document all optimizations
- Use React.memo/useMemo/useCallback judiciously
- Leverage Next.js Image optimization
- Consider code splitting for large features

## Image Configuration

Next.js image configuration allows all remote hostnames:
```ts
images: {
  remotePatterns: [{ hostname: '**' }]
}
```

## Korean Language Support

- Ensure UTF-8 encoding for all files
- Check Korean text after code generation
- Use Korean date format: `YYYY년 MM월 DD일`
- Phone format: `010-XXXX-XXXX`
- **Pretendard Variable** font is used for Korean text (loaded in layout.tsx)
- App language set to Korean in layout: `<html lang="ko">`

## Landing Page Integration

The landing page (`/`) is converted from static HTML to Next.js React component with the following considerations:

### Styling
- Landing page uses `src/styles/landing.css` (glassmorphism design)
- Static HTML pages use `public/styles/main.css` (same content as landing.css)
- Body uses `className="font-pretendard antialiased"` to apply Pretendard Variable font
- Custom Tailwind duration/easing utilities are defined in tailwind.config.ts:
  - `duration-fast`, `duration-normal`, `duration-slow`
  - `ease-smooth`, `ease-out`

### SEO Configuration
- All metadata configured in `src/app/layout.tsx`:
  - OpenGraph tags for social media
  - Twitter Card tags
  - Google/Naver verification tags
  - Canonical URL and sitemap
- Meta Pixel and Google Analytics scripts in landing page component
- JSON-LD structured data for search engines

### Static vs Dynamic Pages
- **React Routes**: `/`, `/app`, `/app/chat`, `/app/profile`, `/app/program` (interactive features)
- **Static HTML**: `/privacy-policy.html`, `/terms-of-service.html` (legal pages)
  - Served directly from `public/` folder
  - Reference `/styles/main.css` for styling

### Image Optimization
- All images use WebP format for performance
- Images preloaded in layout.tsx for critical rendering path
- Version query parameters for cache busting (e.g., `?v=1.1`)
- `fetchPriority="high"` for above-the-fold images (use camelCase in JSX)

## Common Pitfalls to Avoid

1. ❌ Forgetting `'use client'` directive on components
2. ❌ Not awaiting page params in Next.js 15
3. ❌ Using yarn/pnpm instead of npm
4. ❌ Not checking UTF-8 encoding for Korean text
5. ❌ Forgetting to initialize Firebase before using Firestore/Storage
6. ❌ Not handling Firebase async operations with try-catch
7. ❌ Using incorrect environment variable names (must start with `NEXT_PUBLIC_FIREBASE_`)
8. ❌ Using `fetchpriority` instead of `fetchPriority` in JSX (must be camelCase)
9. ❌ Forgetting to copy CSS to both `src/styles/` and `public/styles/` for static HTML pages
10. ❌ Using standard Tailwind durations (like `duration-200`) instead of custom ones (`duration-normal`, `duration-fast`, `duration-slow`)
11. ❌ Using `console.error` directly instead of `logger.error` from `@/lib/logger`
12. ❌ Hardcoding magic numbers instead of using constants from `@/constants/*`
13. ❌ Missing `NAVER_CLIENT_ID` and `NAVER_CLIENT_SECRET` in `.env.local` when using book search

## Development Workflow

1. **Start dev server**: `npm run dev`
2. **Make changes** following the guidelines above
3. **Check types**: TypeScript errors (note: lenient config)
4. **Run lint**: `npm run lint`
5. **Build check**: `npm run build`
6. **Test thoroughly** before committing

## EasyNext CLI Commands

The project uses EasyNext for scaffolding. Key commands:

```bash
# Language settings
easynext lang ko                  # Switch to Korean version

# Update EasyNext CLI
npm i -g @easynext/cli@latest

# Supabase setup
easynext supabase                 # Configure Supabase integration

# Authentication setup
easynext auth                     # Set up Next-Auth
easynext auth idpw               # Add ID/Password login
easynext auth kakao              # Add Kakao login

# Service integrations
easynext gtag                     # Google Analytics
easynext clarity                  # Microsoft Clarity
easynext channelio               # ChannelIO
easynext sentry                  # Sentry error tracking
easynext adsense                 # Google Adsense
```

## Custom Hooks

The project provides several React Query-based hooks for data fetching:

- **useParticipants**: Query and manage participants
- **useCohorts**: Query and manage cohorts
- **useNotices**: Query and manage notices
- **useSubmissions**: Query and manage reading submissions
- **useMessages**: Query and manage direct messages
- **use-toast**: Global toast notifications (from Shadcn UI)

All hooks are located in `src/hooks/` and follow React Query patterns.

## Additional Resources

- **EasyNext CLI commands**: See README.md for scaffolding options
- **Cursor rules**: See `.cursor/rules/global.mdc` for detailed coding guidelines
- **Firebase setup**: See FIREBASE_SETUP.md for complete Firebase configuration guide
- **Project documentation**: Additional setup docs in root directory
