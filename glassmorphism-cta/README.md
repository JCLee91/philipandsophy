# 🔮 글래스모피즘 CTA 버튼 컴포넌트

프리미엄 웹사이트를 위한 재사용 가능한 글래스모피즘 디자인 CTA 버튼 컴포넌트입니다.

## ✨ 주요 특징

- **글래스모피즘 디자인**: 아이스 블루 그라데이션과 백드롭 블러 효과
- **프리미엄 애니메이션**: 호버, 반짝임, 클릭 마이크로 인터랙션
- **반응형**: 모바일/데스크톱 최적화
- **프레임워크 무관**: 순수 HTML/CSS로 어디서나 사용 가능
- **커스터마이징 가능**: CSS 변수로 쉬운 테마 변경

## 📦 파일 구조

```
glassmorphism-cta/
├── cta-button.css        # 메인 스타일 파일
├── index.html            # 데모 페이지
├── README.md             # 이 파일
└── examples/             # 프레임워크별 예제
    ├── react.jsx         # React 컴포넌트
    └── vue.vue           # Vue 컴포넌트
```

## 🚀 빠른 시작

### 1. 순수 HTML/CSS

```html
<!-- CSS 임포트 -->
<link rel="stylesheet" href="components/glassmorphism-cta/cta-button.css">

<!-- 기본 버튼 -->
<a href="#" class="cta-button">
    <span class="cta-text">시작하기</span>
    <div class="cta-arrow">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2" 
                  stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
    </div>
</a>
```

### 2. React

```jsx
import './components/glassmorphism-cta/cta-button.css';

function CTAButton({ text, href, onClick }) {
    return (
        <a href={href} className="cta-button" onClick={onClick}>
            <span className="cta-text">{text}</span>
            <div className="cta-arrow">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" 
                          strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
            </div>
        </a>
    );
}
```

### 3. Vue

```vue
<template>
    <a :href="href" class="cta-button" @click="handleClick">
        <span class="cta-text">{{ text }}</span>
        <div class="cta-arrow">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2" 
                      stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </div>
    </a>
</template>

<script>
export default {
    props: ['text', 'href'],
    methods: {
        handleClick(e) {
            this.$emit('click', e);
        }
    }
}
</script>

<style src="./cta-button.css"></style>
```

## 🎨 변형 버전

### 컴팩트 버전
```html
<a href="#" class="cta-button compact">
    <span class="cta-text">더 알아보기</span>
</a>
```

### 풀 와이드
```html
<a href="#" class="cta-button full-width">
    <span class="cta-text">지금 참여하기</span>
</a>
```

### 라이트 테마 (밝은 배경용)
```html
<a href="#" class="cta-button theme-light">
    <span class="cta-text">시작하기</span>
</a>
```

### 버튼 태그 (폼 제출용)
```html
<button type="submit" class="cta-button">
    <span class="cta-text">제출하기</span>
</button>
```

## 🔧 커스터마이징

### 색상 변경

```css
/* 전역 변경 */
:root {
    --brand-ice-1: rgba(255, 100, 200, 0.35);  /* 핑크 */
    --brand-ice-2: rgba(200, 50, 150, 0.25);
}

/* 특정 버튼만 변경 */
.cta-button.custom-purple {
    background: linear-gradient(135deg, 
        rgba(138, 43, 226, 0.25) 0%, 
        rgba(75, 0, 130, 0.15) 100%);
}
```

### 크기 조정

```css
.cta-button.large {
    max-width: 400px;
    height: 72px;
    font-size: 20px;
}

.cta-button.small {
    max-width: 240px;
    height: 48px;
    font-size: 14px;
    padding: 12px 20px;
}
```

### 라운딩 변경

```css
.cta-button.sharp {
    border-radius: 4px;
}

.cta-button.pill {
    border-radius: 32px;
}
```

## 🎯 디자인 스펙

### 시각 효과
- **배경**: 아이스 블루 그라데이션 `rgba(98, 187, 255, 0.25)` → `rgba(69, 161, 253, 0.15)`
- **블러**: `20px` 백드롭 블러
- **테두리**: `1px solid rgba(255, 255, 255, 0.2)`
- **그림자**: 아이스 블루 글로우 `0 16px 40px rgba(98, 187, 255, 0.3)`

### 애니메이션
- **호버**: 위로 3px 들어올림 + 1.02배 확대
- **반짝임**: 왼쪽→오른쪽 shine 효과 (0.8초)
- **클릭**: 누르는 효과
- **타이밍**: `cubic-bezier(0.23, 1, 0.32, 1)`

### 타이포그래피
- **크기**: 18px (모바일 16px)
- **무게**: 600 (semibold)
- **색상**: `rgba(255, 255, 255, 0.95)`

### 레이아웃
- **최대 너비**: 352px
- **높이**: 64px (모바일 56px)
- **패딩**: 20px 32px
- **라운딩**: 16px

## 📱 반응형

```css
/* 768px 이하에서 자동으로 컴팩트 버전 적용 */
@media (max-width: 768px) {
    .cta-button {
        font-size: 16px;
        height: 56px;
        padding: 16px 24px;
    }
}
```

## 🌐 브라우저 호환성

- ✅ Chrome/Edge (최신)
- ✅ Safari (최신)
- ✅ Firefox (최신)
- ⚠️ IE11 (백드롭 블러 미지원, fallback 제공)

## 💡 사용 팁

### 1. 고정 위치 CTA
```html
<div class="cta-section" style="position: fixed; bottom: 40px; left: 0; right: 0; z-index: 1000; display: flex; justify-content: center;">
    <a href="#" class="cta-button">...</a>
</div>
```

### 2. 다크 배경에서 사용
```css
/* 기본 스타일이 다크 배경용으로 최적화되어 있음 */
body {
    background: #000;
}
```

### 3. 라이트 배경에서 사용
```html
<a href="#" class="cta-button theme-light">...</a>
```

### 4. 이벤트 트래킹
```html
<a href="#" class="cta-button" 
   onclick="gtag('event', 'click', {event_category: 'CTA', event_label: 'Main CTA'})">
    <span class="cta-text">시작하기</span>
</a>
```

## 📄 라이선스

이 컴포넌트는 필립앤소피 프로젝트의 일부로 개발되었습니다.

## 🤝 기여

개선 사항이나 버그 리포트는 이슈로 등록해주세요.

---

**Made with ❤️ for Premium Web Experiences**

