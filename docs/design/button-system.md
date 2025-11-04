# 버튼 디자인 시스템

**Last Updated**: 2025-11-04
**Document Version**: 1.1
**Version**: V1.0 (프로덕션 배포 완료)
**Category**: design

## 개요

필립앤소피 웹 애플리케이션(`/app/*` 라우트)의 모든 버튼은 FooterActions 컴포넌트를 기반으로 한 통일된 디자인 시스템을 따릅니다. 이 문서는 버튼 스타일 가이드라인, 사용 예제, 접근성 고려사항을 제공합니다.

### 디자인 철학

- **미니멀리즘**: 복잡한 그림자나 그라데이션 없이 깔끔한 디자인
- **일관성**: 모든 버튼이 동일한 높이(py-4), 테두리 반경(rounded-lg), 타이포그래피(font-bold) 사용
- **명확성**: 간단한 호버 상태, 명확한 시각적 계층 구조
- **최소 터치 영역**: 모바일 접근성을 위한 충분한 패딩(py-4 = 32px)

---

## 버튼 변형

### Primary 버튼 (검정색)

**용도**: 주요 액션, CTA(Call-to-Action), 사용자가 수행해야 할 가장 중요한 동작

**시각적 사양**:
- 배경: Black (#000000)
- 텍스트: White (#FFFFFF)
- 호버: Gray 800 (#1F2937)
- 테두리 반경: 8px (rounded-lg)
- 세로 패딩: 32px (py-4)
- 가로 패딩: 16px (px-4)
- 폰트 굵기: 700 (font-bold)
- 전환: 150ms color transition

**코드 예제**:
```tsx
<button
  type="button"
  onClick={handleAction}
  className="bg-black rounded-lg px-4 py-4 font-bold text-white transition-colors hover:bg-gray-800"
>
  독서 인증
</button>
```

**실제 사용 예**:
- 독서 인증하기 (`/app/chat/page.tsx`)
- 입장하기 (`/features/auth/components/CodeInputCard.tsx`)
- 내 프로필 북 보기 - authenticated state (`/components/FooterActions.tsx`)

### Secondary 버튼 (흰색)

**용도**: 보조 액션, 대안 선택지, primary 액션과 함께 표시되는 버튼

**시각적 사양**:
- 배경: White (#FFFFFF)
- 텍스트: Black (#000000)
- 테두리: Gray 200 (#E5E7EB, 1px)
- 호버: Gray 50 (#F9FAFB)
- 테두리 반경: 8px (rounded-lg)
- 세로 패딩: 32px (py-4)
- 가로 패딩: 16px (px-4)
- 폰트 굵기: 700 (font-bold)
- 전환: 150ms color transition

**코드 예제**:
```tsx
<button
  type="button"
  onClick={handleSecondaryAction}
  className="bg-white border border-gray-200 rounded-lg px-4 py-4 font-bold text-black transition-colors hover:bg-gray-50"
>
  오늘의 서재
</button>
```

**실제 사용 예**:
- 오늘의 서재 (`/app/chat/page.tsx`)
- 내 프로필 북 보기 - unauthenticated state (`/components/FooterActions.tsx`)

---

## 디자인 토큰

### 간격 (Spacing)
| 속성 | 값 | Tailwind 클래스 | 픽셀 |
|------|-----|-----------------|------|
| 세로 패딩 | py-4 | `padding-top: 1rem; padding-bottom: 1rem;` | 32px (16px × 2) |
| 가로 패딩 | px-4 | `padding-left: 1rem; padding-right: 1rem;` | 32px (16px × 2) |
| 버튼 간격 | gap-2 | `gap: 0.5rem;` | 8px |

### 테두리 (Borders)
| 속성 | 값 | CSS |
|------|-----|-----|
| 반경 | rounded-lg | `border-radius: 0.5rem;` (8px) |
| 두께 | border | `border-width: 1px;` |
| 색상 (Secondary) | border-gray-200 | `border-color: rgb(229, 231, 235);` |

### 색상 (Colors)
| 변형 | 상태 | 배경 | 텍스트 | 테두리 |
|------|------|------|--------|--------|
| Primary | Default | #000000 | #FFFFFF | - |
| Primary | Hover | #1F2937 | #FFFFFF | - |
| Secondary | Default | #FFFFFF | #000000 | #E5E7EB |
| Secondary | Hover | #F9FAFB | #000000 | #E5E7EB |

### 타이포그래피 (Typography)
| 속성 | 값 | CSS |
|------|-----|-----|
| 폰트 굵기 | font-bold | `font-weight: 700;` |
| 정렬 | text-center | `text-align: center;` |
| 줄바꿈 방지 | whitespace-nowrap | `white-space: nowrap;` |

### 전환 (Transitions)
| 속성 | 값 | CSS |
|------|-----|-----|
| 속성 | transition-colors | `transition-property: color, background-color, border-color;` |
| 지속 시간 | - | `transition-duration: 150ms;` (default) |
| 타이밍 함수 | - | `transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);` |

---

## 버튼 상태

### Disabled 상태

비활성화된 버튼은 시각적 피드백과 상호작용 차단을 제공합니다.

**Primary 버튼 - Disabled**:
```tsx
<button
  type="button"
  disabled={true}
  className="bg-black rounded-lg px-4 py-4 font-bold text-white transition-colors hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
>
  확인 중...
</button>
```

**Secondary 버튼 - Disabled**:
```tsx
<button
  type="button"
  disabled={true}
  className="bg-white border border-gray-200 rounded-lg px-4 py-4 font-bold text-black transition-colors hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
>
  로딩 중...
</button>
```

**Disabled 스타일**:
- 투명도: 50% (opacity-50)
- 커서: not-allowed
- 호버 효과: 없음

### Loading 상태

로딩 중 텍스트를 변경하여 진행 상태를 표시합니다.

```tsx
<button
  type="button"
  disabled={isLoading}
  className="bg-black rounded-lg px-4 py-4 font-bold text-white transition-colors hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
>
  {isLoading ? '확인 중...' : '입장하기'}
</button>
```

**실제 예**: `/features/auth/components/CodeInputCard.tsx` (lines 162-169)

### Active 상태 (선택 사항)

터치 피드백을 위한 scale 효과:

```tsx
<button
  className="bg-black rounded-lg px-4 py-4 font-bold text-white transition-colors hover:bg-gray-800 active:scale-95"
>
  독서 인증
</button>
```

**실제 예**: `/app/chat/page.tsx` (lines 369-387)

### Full Width 버튼

전체 너비를 차지하는 버튼:

```tsx
<button
  className="w-full bg-black rounded-lg px-4 py-4 font-bold text-white transition-colors hover:bg-gray-800"
>
  입장하기
</button>
```

**실제 예**: `/features/auth/components/CodeInputCard.tsx` (line 166)

---

## 버튼 레이아웃 패턴

### 단일 버튼

```tsx
<div className="flex gap-2">
  <button className="bg-black rounded-lg px-0 py-4 transition-colors hover:bg-gray-800 flex-1">
    <span className="font-bold text-body-base text-center text-white whitespace-nowrap">
      내 프로필 북 보기
    </span>
  </button>
</div>
```

### 2개 버튼 (Grid)

```tsx
<div className="grid grid-cols-2 gap-3">
  {/* Primary 버튼 */}
  <button className="bg-black rounded-lg px-4 py-4 font-bold text-white transition-colors hover:bg-gray-800">
    <span>독서 인증</span>
  </button>

  {/* Secondary 버튼 */}
  <button className="bg-white border border-gray-200 rounded-lg px-4 py-4 font-bold text-black transition-colors hover:bg-gray-50">
    <span>오늘의 서재</span>
  </button>
</div>
```

**실제 예**: `/app/chat/page.tsx` (lines 368-388)

### 2개 버튼 (Flex - 동적)

```tsx
<div className={cn("flex gap-2", isLocked && "grid grid-cols-2")}>
  {/* 버튼들 */}
</div>
```

**실제 예**: `/components/FooterActions.tsx` (line 22)

---

## 아이콘 사용

lucide-react 아이콘을 버튼과 함께 사용할 때:

```tsx
import { BookOpen } from 'lucide-react';

<button className="flex items-center justify-center gap-2 rounded-lg bg-black px-4 py-4 font-bold text-white transition-colors hover:bg-gray-800">
  <BookOpen className="h-5 w-5" />
  <span>독서 인증</span>
</button>
```

**아이콘 가이드라인**:
- 크기: 20×20px (h-5 w-5)
- 간격: 8px (gap-2)
- 정렬: `items-center justify-center`
- 텍스트와 아이콘의 시각적 균형 유지

**실제 예**: `/app/chat/page.tsx` (lines 370-387)

---

## 사용 시나리오

### Primary vs Secondary 선택 가이드

#### Primary 버튼 사용:
1. **주요 액션** - 사용자가 수행해야 할 가장 중요한 동작
   - 예: "독서 인증", "입장하기", "제출하기"
2. **폼 제출** - 폼의 주요 제출 버튼
3. **긍정적 확인** - "확인", "동의", "시작하기" 등
4. **단일 버튼** - 인증된 상태에서 표시되는 단일 액션

#### Secondary 버튼 사용:
1. **보조 액션** - Primary 액션을 보완하는 동작
   - 예: "오늘의 서재" (독서 인증과 함께 표시)
2. **탐색 액션** - 다른 페이지로 이동하는 버튼
   - 예: "내 프로필 북 보기" (미인증 상태)
3. **취소/뒤로** - 취소, 닫기, 이전 등의 동작
4. **여러 버튼 중 하나** - 동등한 수준의 여러 선택지 중 하나

### 페이지별 사용 예

#### 1. Access Code Entry (`/app/page.tsx`)
- **Primary**: "입장하기" - 폼 제출 액션

#### 2. Chat Page (`/app/chat/page.tsx`)
- **Primary**: "독서 인증" - 주요 액션
- **Secondary**: "오늘의 서재" - 탐색 액션

#### 3. FooterActions (`/components/FooterActions.tsx`)
- **Authenticated State**:
  - **Primary**: "내 프로필 북 보기" - 단일 주요 액션
- **Unauthenticated State**:
  - **Primary**: "독서 인증하기" - 주요 액션
  - **Secondary**: "내 프로필 북 보기" - 보조 액션

---

## 접근성 (Accessibility)

### WCAG AAA 준수

#### 색상 대비
- **Primary 버튼**: 검정 배경(#000000) / 흰색 텍스트(#FFFFFF)
  - 대비 비율: **21:1** (WCAG AAA 통과)
- **Secondary 버튼**: 흰색 배경(#FFFFFF) / 검정 텍스트(#000000)
  - 대비 비율: **21:1** (WCAG AAA 통과)

#### 터치 영역
- **최소 터치 영역**: 32px × 32px (py-4 = 16px × 2)
- **권장 터치 영역**: 48px × 48px (WCAG 2.5.5 Level AAA)
- 현재 버튼 높이는 최소 요구사항을 충족하며, 가로 패딩으로 터치 영역 확장 가능

### 키보드 내비게이션

#### 포커스 상태
기본 Tailwind 포커스 링을 사용하거나 커스텀 포커스 스타일 추가:

```tsx
<button
  className="bg-black rounded-lg px-4 py-4 font-bold text-white transition-colors hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900"
>
  독서 인증
</button>
```

**포커스 링 가이드라인**:
- 두께: 2px (ring-2)
- 오프셋: 2px (ring-offset-2)
- 색상: Gray 900 (ring-gray-900)

#### Tab 순서
- `tabIndex` 속성은 필요한 경우에만 사용
- 기본 DOM 순서를 따르도록 설계
- 버튼은 자동으로 포커스 가능 (focusable)

### 스크린 리더

#### aria-label 사용
아이콘만 있는 버튼의 경우:

```tsx
<button
  aria-label="독서 인증하기"
  className="bg-black rounded-lg px-4 py-4 font-bold text-white transition-colors hover:bg-gray-800"
>
  <BookOpen className="h-5 w-5" />
</button>
```

#### aria-disabled vs disabled
- `disabled` 속성 사용 시 스크린 리더가 자동으로 비활성 상태 안내
- `aria-disabled`는 포커스를 유지하면서 비활성 상태를 나타낼 때 사용

#### Loading 상태 안내
```tsx
<button
  aria-live="polite"
  aria-busy={isLoading}
  disabled={isLoading}
  className="bg-black rounded-lg px-4 py-4 font-bold text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
>
  {isLoading ? '확인 중...' : '입장하기'}
</button>
```

---

## 마이그레이션 가이드

### Shadcn Button에서 마이그레이션

**이전 코드 (Shadcn Button)**:
```tsx
import { Button } from '@/components/ui/button';

<Button
  variant="default"
  size="lg"
  onClick={handleClick}
>
  입장하기
</Button>
```

**새 코드 (Unified Button)**:
```tsx
<button
  type="button"
  onClick={handleClick}
  className="bg-black rounded-lg px-4 py-4 font-bold text-white transition-colors hover:bg-gray-800"
>
  입장하기
</button>
```

### 주요 변경 사항
1. **컴포넌트**: `<Button>` → `<button>`
2. **Import**: Shadcn Button import 제거
3. **Props**: variant, size props 제거 → className으로 통합
4. **Styling**: 통일된 클래스 문자열 사용
5. **Type**: `type="button"` 명시적으로 지정 (폼 제출 방지)

### 마이그레이션 체크리스트
- [ ] Shadcn Button import 제거
- [ ] `<Button>` → `<button>` 변경
- [ ] `type="button"` 추가
- [ ] variant에 따라 Primary/Secondary 클래스 적용
- [ ] disabled 상태 처리 추가 (`disabled:opacity-50 disabled:cursor-not-allowed`)
- [ ] Loading 상태 텍스트 처리 추가
- [ ] 시각적 테스트 수행

---

## 파일 참조

### 구현 파일
1. **FooterActions.tsx** (`/src/components/FooterActions.tsx`)
   - Lines 26-43: Unauthenticated state (2 buttons)
   - Lines 48-56: Authenticated state (1 button)

2. **Chat Page** (`/src/app/app/chat/page.tsx`)
   - Lines 369-387: 독서 인증 & 오늘의 서재 버튼

3. **Code Input Card** (`/src/features/auth/components/CodeInputCard.tsx`)
   - Lines 162-169: 입장하기 버튼

### 관련 문서
- **UI Guide**: [docs/design/ui-guide.md](./ui-guide.md) - 전체 UI 디자인 시스템
- **Animation Guide**: [docs/design/animation.md](./animation.md) - 애니메이션 및 전환 효과

---

## 중요 참고 사항

### 랜딩 페이지는 제외
**랜딩 페이지(`/`) 버튼은 이 시스템을 따르지 않습니다.**

- 랜딩 페이지는 glassmorphism 디자인 사용 (`src/styles/landing.css`)
- 웹 앱(`/app/*` 라우트)만 이 통일된 버튼 시스템 사용
- 두 디자인 시스템을 혼용하지 마세요

### 일관성 유지
- 새 버튼 추가 시 이 가이드를 따르세요
- 커스텀 스타일 추가 전 팀과 논의하세요
- 디자인 토큰 변경 시 문서 업데이트 필수

### 성능 고려사항
- 버튼 클래스는 Tailwind JIT로 컴파일되므로 성능 영향 없음
- `transition-colors`는 GPU 가속 사용
- 불필요한 애니메이션/효과 추가 지양

---

## 예제 코드 모음

### 기본 Primary 버튼
```tsx
<button
  type="button"
  onClick={handleClick}
  className="bg-black rounded-lg px-4 py-4 font-bold text-white transition-colors hover:bg-gray-800"
>
  독서 인증
</button>
```

### 기본 Secondary 버튼
```tsx
<button
  type="button"
  onClick={handleClick}
  className="bg-white border border-gray-200 rounded-lg px-4 py-4 font-bold text-black transition-colors hover:bg-gray-50"
>
  오늘의 서재
</button>
```

### 전체 너비 버튼 (w-full)
```tsx
<button
  type="button"
  onClick={handleSubmit}
  disabled={isLoading}
  className="w-full bg-black rounded-lg px-4 py-4 font-bold text-white transition-colors hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
>
  {isLoading ? '확인 중...' : '입장하기'}
</button>
```

### 아이콘 포함 버튼
```tsx
import { BookOpen } from 'lucide-react';

<button
  type="button"
  className="flex items-center justify-center gap-2 rounded-lg bg-black px-4 py-4 font-bold text-white transition-colors hover:bg-gray-800"
>
  <BookOpen className="h-5 w-5" />
  <span>독서 인증</span>
</button>
```

### 2개 버튼 그리드
```tsx
<div className="grid grid-cols-2 gap-3">
  <button
    type="button"
    onClick={handlePrimary}
    className="bg-black rounded-lg px-4 py-4 font-bold text-white transition-colors hover:bg-gray-800"
  >
    독서 인증
  </button>

  <button
    type="button"
    onClick={handleSecondary}
    className="bg-white border border-gray-200 rounded-lg px-4 py-4 font-bold text-black transition-colors hover:bg-gray-50"
  >
    오늘의 서재
  </button>
</div>
```

### Active 스케일 효과 포함
```tsx
<button
  type="button"
  className="bg-black rounded-lg px-4 py-4 font-bold text-white transition-colors hover:bg-gray-800 active:scale-95"
>
  독서 인증
</button>
```

### 접근성 강화 버튼
```tsx
<button
  type="button"
  aria-label="독서 인증하기"
  className="bg-black rounded-lg px-4 py-4 font-bold text-white transition-colors hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900"
>
  독서 인증
</button>
```

---

**이 문서는 필립앤소피 프로젝트 버튼 시스템의 권위 있는 문서입니다.**

관련 주제:
- [UI 디자인 가이드](./ui-guide.md) - 전체 디자인 시스템
- [애니메이션 가이드](./animation.md) - 애니메이션 및 전환 효과

---

**Last Updated**: 2025-11-04
**Document Version**: 1.1
**Version**: V1.0 (프로덕션 배포 완료)
**Location**: `docs/design/button-system.md`

**업데이트 내역**:
- 2025-11-04: 현재 구현 검증 완료
  - FooterActions 컴포넌트 구현 확인
  - 실제 사용 패턴 검증 (chat/page.tsx, profile pages)
  - 모든 코드 예제의 정확성 확인
  - Shadcn Button과의 구분 명확화
- 2025-10-13: 초기 작성
