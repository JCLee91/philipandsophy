# 프로필북 애니메이션 & 마이크로 인터랙션 디자인 가이드

> Next.js 15 + React 19 + Tailwind CSS + Framer Motion
> 모바일 중심 디자인 (360px 기준)

---

## 📐 디자인 시스템 토큰

### Duration (지속 시간)

프로젝트에 정의된 커스텀 duration을 사용합니다.

```css
/* globals.css에 정의됨 */
--duration-fast: 150ms;    /* 빠른 피드백 (버튼 클릭, 호버) */
--duration-normal: 200ms;  /* 일반 전환 (아이콘 회전, fade) */
--duration-slow: 300ms;    /* 부드러운 전환 (페이지, 아코디언) */
```

**Tailwind 클래스:**
```tsx
className="transition duration-fast"    // 150ms
className="transition duration-normal"  // 200ms
className="transition duration-slow"    // 300ms
```

**Framer Motion:**
```tsx
transition={{ duration: 0.15 }}  // fast
transition={{ duration: 0.2 }}   // normal
transition={{ duration: 0.3 }}   // slow
```

### Easing (가속도 곡선)

자연스러운 움직임을 위한 커스텀 easing 함수입니다.

```css
/* globals.css에 정의됨 */
--ease-smooth: cubic-bezier(0.23, 1, 0.32, 1);  /* 부드러운 감속 */
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);      /* 빠른 시작, 부드러운 끝 */
```

**Tailwind 클래스:**
```tsx
className="transition ease-smooth"
className="transition ease-out"
```

**Framer Motion:**
```tsx
transition={{ ease: [0.23, 1, 0.32, 1] }}  // smooth
transition={{ ease: [0.16, 1, 0.3, 1] }}   // out
```

### 애니메이션 원칙

1. **Purposeful** - 모든 애니메이션은 의도가 있어야 함
2. **Natural** - 물리적 법칙을 따르는 듯한 자연스러운 움직임
3. **Responsive** - 사용자 입력에 즉각 반응
4. **Consistent** - 일관된 duration과 easing 사용
5. **Accessible** - `prefers-reduced-motion` 대응

---

## 🎯 컴포넌트별 애니메이션 가이드

### 1. 아코디언 애니메이션 (가치관 히스토리)

가치관 히스토리 섹션의 펼침/접힘 애니메이션입니다.

#### Radix UI Accordion 사용 (권장)

```bash
npx shadcn@latest add accordion
```

#### 커스텀 구현 (Framer Motion)

```tsx
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

interface AccordionItemProps {
  title: string;
  content: string;
  defaultOpen?: boolean;
}

export function ValueHistoryAccordion({ title, content, defaultOpen = false }: AccordionItemProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-border">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-4 text-left transition duration-normal hover:bg-muted/50"
        aria-expanded={isOpen}
      >
        <span className="font-medium text-foreground">{title}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{
              height: 'auto',
              opacity: 1,
              transition: {
                height: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
                opacity: { duration: 0.2, delay: 0.1 }
              }
            }}
            exit={{
              height: 0,
              opacity: 0,
              transition: {
                height: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
                opacity: { duration: 0.15 }
              }
            }}
            className="overflow-hidden"
          >
            <div className="pb-4 text-sm text-muted-foreground leading-relaxed">
              {content}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

**핵심 포인트:**
- 화살표 아이콘 회전: `rotate: isOpen ? 180 : 0`
- 높이 + 불투명도 동시 애니메이션
- opacity는 height보다 약간 늦게 시작 (delay: 0.1)
- 닫힐 때는 더 빠르게 (200ms vs 300ms)

#### Tailwind 애니메이션 버전

```tsx
'use client';

import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

export function ValueHistoryAccordionTailwind({ title, content }: AccordionItemProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-border">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-4 text-left transition duration-normal hover:bg-muted/50"
      >
        <span className="font-medium">{title}</span>
        <ChevronDown
          className={`w-5 h-5 text-muted-foreground transition-transform duration-normal ease-out ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      <div
        className={`grid transition-all duration-slow ease-out ${
          isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="pb-4 text-sm text-muted-foreground leading-relaxed">
            {content}
          </div>
        </div>
      </div>
    </div>
  );
}
```

**핵심 기법:**
- `grid-rows-[1fr]` / `grid-rows-[0fr]` 트릭으로 height auto 애니메이션
- Tailwind의 `transition-all`로 height + opacity 동시 처리

---

### 2. 버튼 인터랙션

#### 기본 버튼 상태

```tsx
// src/components/ui/button.tsx 확장
const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:scale-[0.98]",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground active:scale-[0.98]",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-[0.98]",
        ghost: "hover:bg-accent hover:text-accent-foreground active:scale-[0.98]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
  }
);
```

**상태별 스타일 정의:**

| 상태 | 변화 | Duration | Easing |
|------|------|----------|--------|
| **Default** | 기본 상태 | - | - |
| **Hover** | 배경색 변경 (90% opacity) | 200ms | ease-out |
| **Active (Press)** | `scale(0.98)` | 150ms | ease-out |
| **Focus** | ring 2px, offset 2px | 200ms | ease-out |
| **Disabled** | `opacity: 0.5`, `pointer-events: none` | - | - |

#### Framer Motion 버튼 (고급)

```tsx
'use client';

import { motion, type HTMLMotionProps } from 'framer-motion';
import { forwardRef } from 'react';

interface MotionButtonProps extends HTMLMotionProps<'button'> {
  variant?: 'default' | 'outline' | 'ghost';
}

export const MotionButton = forwardRef<HTMLButtonElement, MotionButtonProps>(
  ({ variant = 'default', children, className, ...props }, ref) => {
    const baseClass = "px-4 py-2 rounded-md font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
    const variantClass = {
      default: "bg-primary text-primary-foreground",
      outline: "border border-input bg-background",
      ghost: "hover:bg-accent hover:text-accent-foreground"
    }[variant];

    return (
      <motion.button
        ref={ref}
        className={`${baseClass} ${variantClass} ${className}`}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);

MotionButton.displayName = 'MotionButton';
```

**사용 예시:**
```tsx
<MotionButton variant="default">클릭하세요</MotionButton>
```

---

### 3. 독서 히스토리 캘린더 인터랙션

독서 인증 캘린더의 날짜 칸 애니메이션입니다.

```tsx
'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';

type DayStatus = 'completed' | 'incomplete' | 'disabled';

interface CalendarDayProps {
  day: number;
  status: DayStatus;
  onClick?: () => void;
}

export function CalendarDay({ day, status, onClick }: CalendarDayProps) {
  const [isHovered, setIsHovered] = useState(false);

  const isDisabled = status === 'disabled';
  const isCompleted = status === 'completed';

  return (
    <motion.button
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={isDisabled ? undefined : onClick}
      disabled={isDisabled}
      className={`
        relative w-10 h-10 rounded-lg text-sm font-medium
        transition-colors duration-normal
        ${isDisabled ? 'cursor-not-allowed opacity-30' : 'cursor-pointer'}
        ${isCompleted ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}
        ${!isDisabled && !isCompleted ? 'hover:bg-accent hover:text-accent-foreground' : ''}
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
      `}
      whileHover={!isDisabled ? { scale: 1.1 } : {}}
      whileTap={!isDisabled ? { scale: 0.95 } : {}}
      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
    >
      <span className="relative z-10">{day}</span>

      {/* 완료 체크마크 애니메이션 */}
      {isCompleted && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <svg
            className="w-4 h-4 text-primary-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <motion.path
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.3, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </motion.div>
      )}

      {/* 호버 시 ripple 효과 */}
      {isHovered && !isDisabled && (
        <motion.div
          initial={{ scale: 0, opacity: 0.5 }}
          animate={{ scale: 2, opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="absolute inset-0 rounded-lg bg-current"
        />
      )}
    </motion.button>
  );
}
```

**핵심 기능:**
- 완료 상태 체크마크 path 애니메이션
- 호버 시 ripple 효과
- 비활성화 상태 시각적 구분 (opacity: 0.3)
- 클릭 불가 상태: `cursor-not-allowed` + `disabled`

**상태별 스타일:**

| 상태 | 배경색 | 호버 | 클릭 | 기타 |
|------|--------|------|------|------|
| **Completed** | `bg-primary` | `scale(1.1)` | `scale(0.95)` | 체크마크 표시 |
| **Incomplete** | `bg-muted` | `bg-accent` + `scale(1.1)` | `scale(0.95)` | - |
| **Disabled** | `bg-muted` + `opacity-30` | 없음 | 없음 | `cursor-not-allowed` |

---

### 4. 페이지 전환 애니메이션

현재 `PageTransition.tsx`에 구현된 페이지 전환을 분석합니다.

```tsx
// src/components/PageTransition.tsx (현재 구현)
const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const pageTransition = {
  duration: 0.3,
  ease: [0.16, 1, 0.3, 1], // ease-out
};
```

**개선된 버전 (스크롤 위치에 따른 애니메이션):**

```tsx
'use client';

import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

interface PageTransitionProps {
  children: ReactNode;
}

// 페이지 진입 애니메이션
const pageVariants = {
  initial: {
    opacity: 0,
    y: 8,
  },
  animate: {
    opacity: 1,
    y: 0,
  },
  exit: {
    opacity: 0,
    y: -8,
  },
};

const pageTransition = {
  duration: 0.3,
  ease: [0.16, 1, 0.3, 1],
};

export default function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={pageVariants}
        transition={pageTransition}
        style={{ pointerEvents: 'auto' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// 스크롤 기반 애니메이션 컴포넌트
export function ScrollReveal({
  children,
  delay = 0
}: {
  children: ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.23, 1, 0.32, 1],
      }}
    >
      {children}
    </motion.div>
  );
}
```

**사용 예시:**
```tsx
// 프로필북 페이지에서
<ScrollReveal>
  <ValueHistoryAccordion title="2025년 1월" content="..." />
</ScrollReveal>

<ScrollReveal delay={0.1}>
  <ValueHistoryAccordion title="2024년 12월" content="..." />
</ScrollReveal>
```

---

## 🎨 컴포넌트 예시 코드

### 완전한 프로필 카드 (종합 예시)

```tsx
'use client';

import { motion } from 'framer-motion';
import { User, Mail, Calendar } from 'lucide-react';
import { useState } from 'react';

interface ProfileCardProps {
  name: string;
  email: string;
  joinDate: string;
  avatarUrl?: string;
}

export function ProfileCard({ name, email, joinDate, avatarUrl }: ProfileCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="relative bg-card rounded-lg border border-border p-6 overflow-hidden transition-shadow duration-normal hover:shadow-lg"
    >
      {/* 배경 그라디언트 */}
      <motion.div
        animate={{ opacity: isHovered ? 0.1 : 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent"
      />

      <div className="relative z-10 space-y-4">
        {/* 아바타 */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.15 }}
          className="w-16 h-16 rounded-full bg-muted flex items-center justify-center overflow-hidden"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
          ) : (
            <User className="w-8 h-8 text-muted-foreground" />
          )}
        </motion.div>

        {/* 이름 */}
        <h3 className="text-lg font-semibold text-foreground">{name}</h3>

        {/* 정보 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="w-4 h-4" />
            <span>{email}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>가입일: {joinDate}</span>
          </div>
        </div>

        {/* 액션 버튼 */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.15 }}
          className="w-full py-2 bg-primary text-primary-foreground rounded-md font-medium transition-colors duration-normal hover:bg-primary/90"
        >
          프로필 수정
        </motion.button>
      </div>
    </motion.div>
  );
}
```

---

## ♿️ 접근성 (Accessibility)

### prefers-reduced-motion 대응

```tsx
'use client';

import { useReducedMotion } from 'framer-motion';

export function AccessibleButton() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.button
      whileHover={shouldReduceMotion ? {} : { scale: 1.02 }}
      whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.15 }}
      className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
    >
      클릭
    </motion.button>
  );
}
```

### CSS 미디어 쿼리 대응

```css
/* globals.css에 추가 */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Focus Indicator

```tsx
// 모든 인터랙티브 요소에 적용
className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
```

---

## 📊 성능 최적화

### Will-Change 사용

자주 애니메이션되는 요소에만 제한적으로 사용:

```tsx
<motion.div
  style={{ willChange: 'transform, opacity' }}
  animate={{ x: 100, opacity: 0.5 }}
>
  Content
</motion.div>
```

### Layout Shift 방지

```tsx
// ❌ 나쁜 예: height auto 애니메이션
<motion.div animate={{ height: 'auto' }} />

// ✅ 좋은 예: 고정 높이 또는 grid 트릭
<div className="grid transition-all duration-slow">
  <div className="overflow-hidden">Content</div>
</div>
```

### GPU 가속

```tsx
// transform 속성 사용 (GPU 가속)
transform: translateY(10px) scale(1.1)

// 대신 top/left 사용하지 말 것 (CPU 가속)
top: 10px; left: 20px;
```

---

## 📱 모바일 최적화

### 터치 피드백

```tsx
<motion.button
  whileTap={{ scale: 0.95 }}
  transition={{ duration: 0.1 }}
  className="touch-manipulation" // 터치 최적화
>
  버튼
</motion.button>
```

### Safe Area Insets

```tsx
// iOS safe area 대응
className="pb-safe-bottom pt-safe-top"

// Tailwind config에 추가
module.exports = {
  theme: {
    extend: {
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
      }
    }
  }
}
```

---

## 🎬 애니메이션 체크리스트

### 새 컴포넌트 추가 시

- [ ] `duration-fast` / `duration-normal` / `duration-slow` 사용
- [ ] `ease-smooth` / `ease-out` 사용
- [ ] `prefers-reduced-motion` 대응
- [ ] Focus indicator 추가
- [ ] 터치 디바이스 최적화
- [ ] GPU 가속 속성 (transform, opacity) 사용
- [ ] Layout shift 없는지 확인
- [ ] 360px 모바일 화면에서 테스트

### 애니메이션 원칙 체크

- [ ] **필요성**: 이 애니메이션이 UX에 실질적으로 기여하는가?
- [ ] **일관성**: 프로젝트의 다른 애니메이션과 일관된가?
- [ ] **자연스러움**: 물리적으로 자연스러운 움직임인가?
- [ ] **성능**: 60fps 유지되는가?
- [ ] **접근성**: 모든 사용자가 사용 가능한가?

---

## 🔗 참고 자료

### 디자인 시스템
- [Material Design Motion](https://m3.material.io/styles/motion/overview)
- [iOS Human Interface Guidelines - Motion](https://developer.apple.com/design/human-interface-guidelines/motion)
- [Tailwind CSS Animations](https://tailwindcss.com/docs/animation)

### Framer Motion
- [Framer Motion Docs](https://www.framer.com/motion/)
- [Animation Controls](https://www.framer.com/motion/animation/)
- [Gestures](https://www.framer.com/motion/gestures/)

### Accessibility
- [WCAG 2.1 Animation Guidelines](https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions)
- [prefers-reduced-motion MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)

---

**마지막 업데이트:** 2025-10-07
**프로젝트:** pnschat2 (필립앤소피 프로필북)

---

**Last Updated**: 2025-10-10
**Document Version**: v2.2.0
**Location**: `docs/design/animation.md`
