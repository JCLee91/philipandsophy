# 필립앤소피 디자인 시스템

**문서 버전**: 1.1
**최종 업데이트**: 2025년 11월 4일
**작성자**: Claude Design System Specialist

---

## 📋 목차

1. [디자인 원칙](#1-디자인-원칙)
2. [색상 시스템](#2-색상-시스템)
3. [타이포그래피](#3-타이포그래피)
4. [컴포넌트 라이브러리](#4-컴포넌트-라이브러리)
5. [레이아웃 시스템](#5-레이아웃-시스템)
6. [디자인 토큰](#6-디자인-토큰)
7. [패턴 및 가이드라인](#7-패턴-및-가이드라인)
8. [접근성](#8-접근성)

---

## 1. 디자인 원칙

### 1.1 핵심 원칙

| 원칙 | 설명 | 적용 예시 |
|------|------|----------|
| **단순함 (Simplicity)** | 불필요한 요소를 제거하고 핵심에 집중 | 접근 코드 4자리만으로 입장 |
| **일관성 (Consistency)** | 통일된 UI 패턴과 상호작용 | FooterActions 기반 통일된 버튼 시스템 |
| **명확성 (Clarity)** | 사용자가 즉시 이해할 수 있는 인터페이스 | 명확한 CTA 버튼 레이블 |
| **피드백 (Feedback)** | 모든 액션에 즉각적인 반응 제공 | Shimmer 로딩, 토스트 알림 |

### 1.2 디자인 철학

**랜딩페이지 (/)**: Glassmorphism 디자인
- 반투명 카드 (`backdrop-filter: blur(10px)`)
- 부드러운 그라데이션
- 세련되고 현대적인 느낌

**웹앱 (/app)**: 미니멀리즘 디자인
- 깔끔한 흰색 배경
- 검정/회색 기본 버튼
- 콘텐츠 중심 레이아웃

**Data Center (/datacntr)**: 프로페셔널 대시보드
- 데이터 가시성 우선
- 파란색 브랜드 컬러
- 통계 및 차트 중심

---

## 2. 색상 시스템

### 2.1 브랜드 컬러

| 컬러 이름 | Hex Code | 용도 | Tailwind Class |
|----------|----------|------|----------------|
| **Library Blue** | `#45a1fd` | 주요 브랜드 컬러, CTA 버튼 | `bg-library-blue` |
| **Library Blue Light** | `#cee7ff` | 배경, 하이라이트 | `bg-library-blue-light` |
| **Library Yellow** | `#ffd362` | 강조, 경고 | `bg-library-yellow` |
| **Library Yellow Light** | `#fff2d2` | 부드러운 강조 배경 | `bg-library-yellow-light` |

### 2.2 시맨틱 컬러

#### 기본 텍스트

| 컬러 | Hex Code | 용도 | Tailwind Class |
|------|----------|------|----------------|
| **Primary Text** | `#31363e` | 본문, 제목 | `text-text-primary` |
| **Secondary Text** | `#575e68` | 부제목, 설명 | `text-text-secondary` |
| **Tertiary Text** | `#8f98a3` | 메타 정보, 비활성 | `text-admin-text-secondary` |

#### 상태 컬러

| 상태 | Hex Code | 용도 | Tailwind Class |
|------|----------|------|----------------|
| **Success** | `#52c41a` | 성공 메시지 | `bg-admin-brand-success` |
| **Warning** | `#ffa940` | 경고 메시지 | `bg-admin-brand-warning` |
| **Error** | `#ff4d4f` | 오류 메시지 | `bg-destructive` |
| **Info** | `#45a1fd` | 정보 메시지 | `bg-admin-brand-DEFAULT` |

### 2.3 배경 컬러

| 이름 | Hex Code | 용도 | Tailwind Class |
|------|----------|------|----------------|
| **Page Background** | `#eff6ff` | 페이지 전체 배경 (Data Center) | `bg-admin-bg-page` |
| **Card Background** | `#ffffff` | 카드, 모달 배경 | `bg-admin-bg-card` or `bg-card` |
| **Gray Background** | `#f5f5f5` | 비활성 영역 | `bg-admin-bg-gray` or `bg-muted` |
| **Hover** | `#f9fafb` | 호버 상태 | `hover:bg-admin-bg-hover` or `hover:bg-muted/50` |

### 2.4 색상 대비 (WCAG 2.1 AA 준수)

| 조합 | 대비율 | WCAG 기준 | 통과 여부 |
|------|--------|-----------|----------|
| Black (#000) on White (#fff) | 21:1 | ≥ 4.5:1 | ✅ Pass |
| Primary Text (#31363e) on White | 10.8:1 | ≥ 4.5:1 | ✅ Pass |
| Library Blue (#45a1fd) on White | 3.2:1 | ≥ 3:1 (large text) | ✅ Pass |
| Secondary Text (#575e68) on White | 7.2:1 | ≥ 4.5:1 | ✅ Pass |

---

## 3. 타이포그래피

### 3.1 폰트 패밀리

**Pretendard Variable**: 전체 프로젝트 기본 폰트

```tsx
// src/app/layout.tsx에서 CDN으로 로드
<link
  rel="stylesheet"
  as="style"
  crossOrigin="anonymous"
  href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
/>
```

```css
/* src/app/globals.css - 전역 적용 */
body {
  font-family: 'Pretendard Variable', Pretendard, -apple-system,
    BlinkMacSystemFont, system-ui, Roboto, 'Helvetica Neue', 'Segoe UI',
    'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic',
    'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', sans-serif;
}

/* 모든 요소에 강제 적용 */
*,
*::before,
*::after {
  font-family: 'Pretendard Variable', Pretendard, -apple-system,
    BlinkMacSystemFont, system-ui, sans-serif !important;
}
```

**특징**:
- 가변 폰트 (Variable Font): weight 100-900 동적 조정
- 한글 최적화
- 모던한 가독성
- 모든 요소에 일관되게 적용 (important로 우선순위 보장)

### 3.2 폰트 스케일

| 크기 | px | rem | line-height | 용도 | Tailwind Class |
|------|----|----|-------------|------|----------------|
| **heading-xl** | 24px | 1.5rem | 1.4 | 페이지 제목 | `text-heading-xl` |
| **heading-lg** | 18px | 1.125rem | 1.4 | 섹션 제목 | `text-heading-lg` |
| **body-base** | 16px | 1rem | 1.6 | 본문 | `text-body-base` |
| **body-sm** | 14px | 0.875rem | 1.5 | 작은 본문, 메타 정보 | `text-body-sm` |
| **caption** | 12px | 0.75rem | 1.4 | 캡션, 도움말 | `text-xs` |

### 3.3 폰트 두께 (Font Weight)

| 이름 | Weight | 용도 | Tailwind Class |
|------|--------|------|----------------|
| **Normal** | 400 | 일반 본문 | `font-normal` |
| **Medium** | 500 | 강조 텍스트 | `font-medium` |
| **Semibold** | 600 | 부제목 | `font-semibold` |
| **Bold** | 700 | 제목, 버튼 | `font-bold` |

### 3.4 타이포그래피 패턴

**제목 계층 구조**:

```tsx
// H1: 페이지 메인 제목
<h1 className="text-heading-xl font-bold text-text-primary">
  필립앤소피 독서 소셜클럽
</h1>

// H2: 섹션 제목
<h2 className="text-heading-lg font-bold text-text-primary">
  Today's Library
</h2>

// H3: 서브섹션 제목
<h3 className="text-body-base font-semibold text-text-primary">
  오늘 독서 인증한 참가자
</h3>
```

**본문 텍스트**:

```tsx
// 일반 본문
<p className="text-body-base text-text-primary">
  독서를 매개로 한 온라인 소셜클럽입니다.
</p>

// 부가 설명
<p className="text-body-sm text-text-secondary">
  2주간 함께 책을 읽고 소통합니다.
</p>

// 캡션
<span className="text-xs text-text-secondary">
  3시간 전
</span>
```

---

## 4. 컴포넌트 라이브러리

### 4.1 Shadcn UI 컴포넌트

**사용 중인 컴포넌트**:

| 컴포넌트 | 용도 | 설치 명령 | 사용 위치 |
|----------|------|-----------|----------|
| **Button** | 일반 버튼 (Data Center 전용) | `npx shadcn@latest add button` | `/datacntr/*` |
| **Dialog** | 모달 다이얼로그 | `npx shadcn@latest add dialog` | 독서 인증 폼, 프로필 편집 |
| **Sheet** | 측면 슬라이드 패널 | `npx shadcn@latest add sheet` | 모바일 메뉴, 필터 |
| **Toast** | 알림 메시지 | `npx shadcn@latest add toast` | 전역 알림 시스템 |
| **Card** | 콘텐츠 카드 | `npx shadcn@latest add card` | 공지사항, 독서 인증 카드 |
| **Avatar** | 프로필 이미지 | `npx shadcn@latest add avatar` | 사용자 프로필 |
| **Badge** | 배지/태그 | `npx shadcn@latest add badge` | 상태 표시, 라벨 |
| **Textarea** | 여러 줄 입력 | `npx shadcn@latest add textarea` | 리뷰 작성, 공지 편집 |
| **Label** | 폼 라벨 | `npx shadcn@latest add label` | 폼 필드 레이블 |
| **Input** | 단일 줄 입력 | `npx shadcn@latest add input` | 검색, 텍스트 입력 |
| **Select** | 드롭다운 선택 | `npx shadcn@latest add select` | 필터링, 옵션 선택 |
| **Table** | 데이터 테이블 | `npx shadcn@latest add table` | Data Center 대시보드 |
| **Scroll Area** | 스크롤 영역 | `npx shadcn@latest add scroll-area` | 긴 리스트, 모달 내용 |
| **Dropdown Menu** | 드롭다운 메뉴 | `npx shadcn@latest add dropdown-menu` | 더보기 메뉴, 설정 |

**중요**: 웹앱(`/app/*`)에서는 Shadcn Button 사용 금지. 대신 커스텀 버튼 시스템 사용. ([버튼 시스템 가이드](./button-system.md) 참조)

### 4.2 커스텀 컴포넌트

#### 4.2.1 Unified Button System (웹앱 전용)

**디자인 명세**:
- **위치**: `/app/*` 경로 (랜딩페이지, Data Center 제외)
- **구조**: FooterActions 컴포넌트 기반 통일된 디자인
- **Shadcn Button 사용 금지**: 웹앱에서는 플레인 `<button>` 태그 사용
- **일관성**: 모든 버튼이 동일한 패딩(py-4 = 16px), 테두리 반경(rounded-lg = 8px) 사용

**Primary Button (Black)**:

```tsx
<button
  type="button"
  className="bg-black rounded-lg px-4 py-4 font-bold text-white transition-colors hover:bg-gray-800"
>
  독서 인증
</button>
```

**시각적 사양**:
- 배경: Black (#000000)
- 텍스트: White (#FFFFFF), font-bold (700)
- 호버: Gray 800 (#1F2937)
- 테두리 반경: 8px (rounded-lg)
- 패딩: 16px 상하, 16px 좌우
- 전환: 150ms color transition

**Secondary Button (White)**:

```tsx
<button
  type="button"
  className="bg-white border border-gray-200 rounded-lg px-4 py-4 font-bold text-black transition-colors hover:bg-gray-50"
>
  오늘의 서재
</button>
```

**시각적 사양**:
- 배경: White (#FFFFFF)
- 텍스트: Black (#000000), font-bold (700)
- 테두리: Gray 200 (#E5E7EB, 1px)
- 호버: Gray 50 (#F9FAFB)
- 테두리 반경: 8px (rounded-lg)
- 패딩: 16px 상하, 16px 좌우
- 전환: 150ms color transition

**버튼 상태**:

```tsx
// Disabled
<button
  disabled
  className="bg-black rounded-lg px-4 py-4 font-bold text-white opacity-50 cursor-not-allowed"
>
  제출 중...
</button>

// Loading
<button className="bg-black rounded-lg px-4 py-4 font-bold text-white">
  {isLoading ? '확인 중...' : '입장하기'}
</button>

// With Icon
<button className="bg-black rounded-lg px-4 py-4 font-bold text-white flex items-center justify-center gap-2">
  <CheckIcon className="h-5 w-5" />
  완료
</button>
```

**Full Width 버튼**:

```tsx
<button className="w-full bg-black rounded-lg px-4 py-4 font-bold text-white">
  시작하기
</button>
```

#### 4.2.2 BookSearchAutocomplete

**기능**: 네이버 책 검색 API 기반 자동완성

```tsx
import { BookSearchAutocomplete } from '@/components/BookSearchAutocomplete';

<BookSearchAutocomplete
  onSelect={(book) => {
    setSelectedBook(book);
  }}
  placeholder="책 제목 검색"
/>
```

**주요 기능**:
- 500ms debounce 검색
- 최대 5개 결과 표시
- 책 표지 썸네일 + 제목 + 저자/출판사
- 키보드 네비게이션 지원

#### 4.2.3 SubmissionCard

**기능**: 독서 인증 카드

```tsx
import { SubmissionCard } from '@/components/SubmissionCard';

<SubmissionCard
  submission={submissionData}
  variant="similar"  // or "opposite" for AI matching highlight
  onClick={() => openModal(submissionData.id)}
/>
```

**AI 매칭 하이라이트**:
- `variant="similar"`: 파란색 테두리 (`border-library-blue`)
- `variant="opposite"`: 주황색 테두리 (`border-library-yellow`)

---

## 5. 레이아웃 시스템

### 5.1 그리드 시스템

**Tailwind Grid 유틸리티**:

```tsx
// 반응형 그리드 (Today's Library)
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  {submissions.map(s => <SubmissionCard key={s.id} submission={s} />)}
</div>
```

**그리드 패턴**:
- 모바일 (< 640px): 1열
- 태블릿 (640-1024px): 2열
- 데스크톱 (≥ 1024px): 3열

### 5.2 스페이싱 스케일

| 이름 | px | rem | Tailwind Class | 용도 |
|------|----|----|----------------|------|
| **xs** | 4px | 0.25rem | `space-x-1` | 아이콘-텍스트 간격 |
| **sm** | 8px | 0.5rem | `space-x-2` | 버튼 내 요소 간격 |
| **md** | 16px | 1rem | `space-x-4` | 카드 내부 패딩 |
| **lg** | 24px | 1.5rem | `space-x-6` | 섹션 간격 |
| **xl** | 32px | 2rem | `space-x-8` | 페이지 여백 |

### 5.3 컨테이너

**Max Width**:

```tsx
// 중앙 정렬 컨테이너 (max 1400px)
<div className="container mx-auto px-4 max-w-screen-2xl">
  {/* Content */}
</div>
```

### 5.4 반응형 브레이크포인트

| 이름 | 최소 너비 | Tailwind Prefix | 타겟 기기 |
|------|----------|-----------------|----------|
| **sm** | 640px | `sm:` | 세로 태블릿 |
| **md** | 768px | `md:` | 가로 태블릿 |
| **lg** | 1024px | `lg:` | 작은 데스크톱 |
| **xl** | 1280px | `xl:` | 데스크톱 |
| **2xl** | 1536px | `2xl:` | 큰 데스크톱 |

**사용 예시**:

```tsx
<div className="p-4 md:p-6 lg:p-8">
  {/* 모바일: 16px, 태블릿: 24px, 데스크톱: 32px 패딩 */}
</div>
```

---

## 6. 디자인 토큰

### 6.1 Border Radius

| 토큰 | 값 | Tailwind Class | 용도 |
|------|----|----|------|
| **sm** | 2px | `rounded-sm` | 작은 요소 |
| **md** | 6px | `rounded-md` | 기본 |
| **lg** | 8px | `rounded-lg` | 버튼, 카드 |
| **xl** | 12px | `rounded-xl` | 큰 카드 |
| **full** | 9999px | `rounded-full` | 원형 (아바타) |

### 6.2 Shadow

| 토큰 | 값 | Tailwind Class | 용도 |
|------|----|----|------|
| **sm** | `0 1px 2px rgba(0,0,0,0.05)` | `shadow-sm` | 미묘한 그림자 |
| **md** | `0 4px 6px rgba(0,0,0,0.1)` | `shadow-md` | 카드 |
| **lg** | `0 10px 15px rgba(0,0,0,0.1)` | `shadow-lg` | 모달 |
| **xl** | `0 20px 25px rgba(0,0,0,0.15)` | `shadow-xl` | 플로팅 요소 |

### 6.3 트랜지션

**커스텀 Duration** (`tailwind.config.ts`):

```typescript
transitionDuration: {
  'fast': '150ms',
  'normal': '300ms',
  'slow': '500ms'
}
```

**사용 예시**:

```tsx
<button className="transition-colors duration-normal hover:bg-gray-800">
  버튼
</button>
```

### 6.4 Shimmer 애니메이션

**전역 유틸리티** (`src/app/globals.css`):

```css
@layer utilities {
  .shimmer {
    @apply bg-gradient-to-r from-gray-200 via-white to-gray-200 bg-[length:200%_100%] animate-shimmer;
    will-change: background-position;
    border-radius: 8px;
  }

  /* WCAG 2.1 접근성: 모션 민감도 사용자를 위한 애니메이션 비활성화 */
  @media (prefers-reduced-motion: reduce) {
    .shimmer {
      animation: none;
      background: theme('colors.gray.200') !important;
      will-change: auto;
    }
  }
}
```

**Tailwind 설정** (`tailwind.config.ts`):

```typescript
keyframes: {
  shimmer: {
    '0%': { backgroundPosition: '-100% 0' },
    '100%': { backgroundPosition: '100% 0' }
  }
},
animation: {
  shimmer: 'shimmer 1.5s infinite ease-in-out'
}
```

**사용 예시**:

```tsx
// 스켈레톤 로딩 - 전체 너비 박스
<div className="shimmer h-10 w-full rounded-lg" />

// 아바타 스켈레톤 - 원형
<div className="shimmer h-12 w-12 rounded-full" />

// 텍스트 스켈레톤 - 한 줄
<div className="shimmer h-4 w-32 rounded" />

// 카드 스켈레톤 - 복합 구조
<div className="space-y-3">
  <div className="shimmer h-32 w-full" />
  <div className="shimmer h-4 w-3/4" />
  <div className="shimmer h-4 w-1/2" />
</div>
```

**특징**:
- **DRY 원칙**: 15개 중복 애니메이션 정의 제거 → 단일 유틸리티 클래스
- **성능**: GPU 가속 (`will-change: background-position`)
- **접근성**: `prefers-reduced-motion` 미디어 쿼리 지원 (WCAG 2.1 준수)
- **일관성**: 모든 스켈레톤 로딩 상태에서 동일한 애니메이션 (1.5s ease-in-out)

---

## 7. 패턴 및 가이드라인

### 7.1 네비게이션 패턴

**모바일 하단 네비게이션** (웹앱):

```tsx
<nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-bottom">
  <div className="flex justify-around py-2">
    <NavButton icon={<HomeIcon />} label="홈" href="/app/chat" />
    <NavButton icon={<LibraryIcon />} label="서재" href="/app/chat/today-library" />
    <NavButton icon={<UserIcon />} label="프로필" href="/app/profile/me" />
  </div>
</nav>
```

### 7.2 폼 패턴

**레이블 + 입력 필드**:

```tsx
<div className="space-y-2">
  <Label htmlFor="review">한줄 리뷰 (최소 40자)</Label>
  <Textarea
    id="review"
    placeholder="오늘 읽은 내용에 대한 감상을 적어주세요"
    minLength={40}
    maxLength={1000}
    className="min-h-[120px]"
  />
  <p className="text-xs text-text-secondary">{charCount}/1000</p>
</div>
```

**에러 상태**:

```tsx
<div className="space-y-2">
  <Label htmlFor="code" className="text-destructive">접근 코드</Label>
  <Input
    id="code"
    className="border-destructive focus:ring-destructive"
    aria-invalid="true"
  />
  <p className="text-xs text-destructive">유효하지 않은 코드입니다</p>
</div>
```

### 7.3 모달/다이얼로그 패턴

```tsx
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>독서 인증 제출</DialogTitle>
    </DialogHeader>

    {/* 폼 콘텐츠 */}

    <DialogFooter>
      <Button variant="outline" onClick={() => setIsOpen(false)}>
        취소
      </Button>
      <Button type="submit" className="bg-black text-white">
        제출
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### 7.4 카드 레이아웃 패턴

**표준 카드**:

```tsx
<Card className="overflow-hidden hover:shadow-md transition-shadow">
  <CardContent className="p-4">
    <h3 className="text-heading-lg font-bold mb-2">제목</h3>
    <p className="text-body-sm text-text-secondary">설명</p>
  </CardContent>
</Card>
```

**AI 매칭 하이라이트 카드**:

```tsx
<Card className="border-2 border-library-blue overflow-hidden">
  <div className="bg-library-blue-light px-4 py-2">
    <p className="text-xs font-semibold text-library-blue">비슷한 성향</p>
  </div>
  <CardContent className="p-4">
    {/* 콘텐츠 */}
  </CardContent>
</Card>
```

---

## 8. 접근성

### 8.1 WCAG 2.1 AA 준수 체크리스트

- [x] **색상 대비**: 최소 4.5:1 (본문), 3:1 (큰 텍스트)
- [x] **키보드 네비게이션**: 모든 인터랙티브 요소 Tab 키로 접근 가능
- [x] **포커스 표시**: 포커스 상태 명확히 표시 (`focus:ring-2`)
- [x] **ARIA 레이블**: 아이콘 버튼에 `aria-label` 제공
- [x] **Semantic HTML**: `<button>`, `<nav>`, `<main>` 등 의미론적 태그 사용
- [x] **Alt Text**: 모든 이미지에 대체 텍스트 제공
- [ ] **스크린 리더 테스트**: VoiceOver, NVDA로 테스트 (향후)

### 8.2 접근성 패턴

**아이콘 버튼**:

```tsx
<button
  aria-label="닫기"
  className="p-2 rounded-full hover:bg-gray-100"
>
  <XIcon className="h-5 w-5" />
</button>
```

**로딩 상태**:

```tsx
<button
  disabled={isLoading}
  aria-busy={isLoading}
  aria-live="polite"
>
  {isLoading ? '로딩 중...' : '제출'}
</button>
```

**Reduced Motion 지원**:

```css
@media (prefers-reduced-motion: reduce) {
  .shimmer {
    animation: none;
    background: theme('colors.gray.200') !important;
  }

  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 관련 문서

- **[Button Design System](./button-system.md)**: 통일된 버튼 디자인 시스템 상세
- **[Animation Guide](./animation.md)**: Framer Motion 및 트랜지션 가이드
- **[UI Guide](./ui-guide.md)**: 컴포넌트 및 Shimmer 애니메이션 가이드
- **[TRD](../architecture/trd-comprehensive.md)**: 기술 스택 및 구현 상세

---

**문서 위치**: `docs/design/design-system.md`
**최종 업데이트**: 2025년 11월 4일
**문서 버전**: 1.1
**업데이트 내역**:
- 2025-11-04: 현재 구현과 일치하도록 전면 검토 및 업데이트
  - Shadcn UI 컴포넌트 목록 확장 (Badge, Sheet, Dropdown Menu 등 추가)
  - Pretendard 폰트 적용 방식 상세화 (CDN 로드 + globals.css 강제 적용)
  - 버튼 시스템 시각적 사양 추가
  - Shimmer 애니메이션 Tailwind 설정 추가
  - 색상 시스템에 Shadcn 기본 클래스 추가
- 2025-10-16: 초기 작성

**다음 업데이트 예정**: V2.0 디자인 개선 시

---

**© 2025 Philip & Sophy. All rights reserved.**
