# PWA & 모바일 최적화 가이드

**Last Updated**: 2025-10-10
**Category**: setup

## 개요

필립앤소피 웹앱을 네이티브 앱처럼 사용할 수 있도록 PWA(Progressive Web App) 기능과 모바일 최적화를 구현한 가이드입니다.

## 🎯 해결한 문제

### 1. iOS Safari 고정 헤더/푸터 문제

**문제**:
- 모바일에서 스크롤 시 주소창이 사라지면서 `position: sticky/fixed` 요소가 밀리거나 가려짐
- `100vh`는 주소창을 포함한 높이라 실제 보이는 영역과 불일치

**해결책**:
- ✅ **CSS Dynamic Viewport Height** 사용: `100vh` → `100dvh`
- ✅ 모든 전체 화면 레이아웃에 적용

```tsx
// Before (문제)
<div className="flex h-screen flex-col overflow-hidden">

// After (해결)
<div className="flex h-[100dvh] flex-col overflow-hidden">
```

### 2. 네이티브 앱 경험 부족

**문제**:
- 매번 브라우저를 열고 URL을 입력해야 함
- 주소창과 브라우저 UI가 화면 공간을 차지
- 오프라인에서 사용 불가

**해결책**:
- ✅ PWA 구현으로 홈 화면 아이콘 추가 가능
- ✅ 전체화면 모드(Standalone) 지원
- ✅ Service Worker로 기본 캐싱 구현

## 📱 PWA 구현 상세

### 1. Manifest 파일 (`/public/manifest.json`)

```json
{
  "name": "필립앤소피 - 독서 소셜 클럽",
  "short_name": "필립앤소피",
  "start_url": "/app",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "orientation": "portrait"
}
```

**주요 설정**:
- `display: "standalone"` - 전체화면 모드 (주소창 제거)
- `start_url: "/app"` - 앱 실행 시 시작 페이지
- `orientation: "portrait"` - 세로 모드 고정

### 2. Service Worker (`/public/sw.js`)

**캐싱 전략**: Network First, Cache Fallback
```javascript
// 1. 네트워크 요청 시도
// 2. 실패 시 캐시에서 가져오기
// 3. 성공 시 캐시 업데이트
```

**캐시된 리소스**:
- `/` - 랜딩 페이지
- `/app` - 웹앱 진입점
- `/image/favicon.webp` - 아이콘

### 3. 메타데이터 설정 (`src/app/layout.tsx`)

```typescript
export const metadata: Metadata = {
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: '필립앤소피',
  },
  icons: {
    apple: '/image/favicon.webp',
  },
};
```

**iOS 특화 설정**:
- `capable: true` - 웹앱으로 실행 가능
- `statusBarStyle: 'black-translucent'` - 상태바 스타일

### 4. Viewport 최적화

```typescript
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1.0,
  maximumScale: 1.0,
  userScalable: false,
  viewportFit: 'cover',
};
```

**설정 설명**:
- `maximumScale: 1.0` - 확대 방지 (앱처럼)
- `userScalable: false` - 사용자 확대/축소 비활성화
- `viewportFit: 'cover'` - 노치 영역까지 활용

## 🔧 CSS Viewport Units 가이드

### 새로운 Viewport Units (2025)

| Unit | 설명 | 사용 시기 |
|------|------|----------|
| `dvh` | Dynamic Viewport Height - 동적으로 변함 | **기본값 (권장)** - 스크롤 시 주소창 변화에 대응 |
| `svh` | Small Viewport Height - 툴바 표시 시 | 최소 높이 보장이 필요한 경우 |
| `lvh` | Large Viewport Height - 툴바 숨김 시 | 최대 높이 활용이 필요한 경우 |

### 적용 예시

```css
/* ❌ 기존 (문제) */
.container {
  height: 100vh;        /* iOS에서 주소창 포함 */
  min-height: 100vh;    /* 스크롤 시 레이아웃 깨짐 */
}

/* ✅ 개선 (해결) */
.container {
  height: 100dvh;       /* 실제 보이는 영역에 맞춤 */
  min-height: 100dvh;   /* 동적으로 조정됨 */
}
```

## 📲 PWA 설치 가이드

### iOS (Safari)

1. Safari에서 `https://www.philipandsophy.kr` 접속
2. 하단 공유 버튼 탭
3. "홈 화면에 추가" 선택
4. "추가" 탭
5. 홈 화면에서 앱 아이콘 실행

### Android (Chrome)

1. Chrome에서 웹사이트 접속
2. 상단 메뉴 (⋮) 탭
3. "홈 화면에 추가" 선택
4. "추가" 탭
5. 홈 화면에서 앱 아이콘 실행

## 🎨 모바일 UX 개선사항

### 1. 고정 레이아웃 구조

```tsx
<div className="flex h-[100dvh] flex-col overflow-hidden">
  {/* 헤더 - 고정 */}
  <Header />

  {/* 메인 콘텐츠 - 스크롤 가능 */}
  <main className="flex-1 overflow-y-auto">
    {/* ... */}
  </main>

  {/* 푸터 - 고정 */}
  <FooterActions>
    {/* ... */}
  </FooterActions>
</div>
```

**핵심 포인트**:
- ✅ 컨테이너: `h-[100dvh]` - 전체 화면 채우기
- ✅ 헤더/푸터: `shrink-0` - 고정 높이 유지
- ✅ 메인: `flex-1 overflow-y-auto` - 남은 공간 채우고 스크롤

### 2. Safe Area 대응

```tsx
<FooterActions>
  <div className="pb-safe">
    {/* 노치/홈 버튼 영역 고려 */}
  </div>
</FooterActions>
```

Tailwind의 `pb-safe` 유틸리티로 iOS 하단 안전 영역 자동 대응

## 🔍 브라우저 지원

| 기능 | Chrome | Safari | Firefox | Edge |
|------|--------|--------|---------|------|
| PWA 설치 | ✅ | ✅ | ✅ | ✅ |
| Service Worker | ✅ | ✅ | ✅ | ✅ |
| 100dvh | ✅ | ✅ 16.4+ | ✅ 110+ | ✅ |
| Standalone 모드 | ✅ | ✅ | ✅ | ✅ |

## 🚀 성능 최적화

### Service Worker 캐싱 효과

- ✅ **초기 로딩**: 네트워크 우선
- ✅ **재방문**: 캐시 활용으로 즉시 로딩
- ✅ **오프라인**: 캐시된 페이지 표시

### 리소스 우선순위

```javascript
const urlsToCache = [
  '/',              // 랜딩 (우선)
  '/app',           // 웹앱 진입점 (우선)
  '/image/favicon.webp', // 아이콘 (필수)
];
```

## ⚠️ 알려진 제약사항

### iOS Safari 특이사항

1. **푸시 알림 미지원** - iOS 16.4 이후에도 PWA 푸시 알림 제한적
2. **Virtual Keyboard** - 키보드 출현 시 viewport 이벤트 없음
3. **하단 탭 영역** - 약 40px 보이지 않는 탭 영역 존재

### 해결 방법

```tsx
// 하단 버튼에 충분한 여백 추가
<FooterActions>
  <div className="px-6 pt-4 pb-8"> {/* pb-8로 탭 영역 회피 */}
    <button>...</button>
  </div>
</FooterActions>
```

## 📊 테스트 체크리스트

### 모바일 테스트
- [ ] iOS Safari - 스크롤 시 헤더/푸터 고정 확인
- [ ] Android Chrome - 주소창 숨김 시 레이아웃 유지
- [ ] 가로/세로 회전 시 레이아웃 정상 작동
- [ ] 키보드 출현 시 입력창 가시성

### PWA 테스트
- [ ] 홈 화면 추가 가능 확인
- [ ] Standalone 모드에서 주소창 숨김 확인
- [ ] 오프라인에서 캐시된 페이지 접근 가능
- [ ] 앱 아이콘 정상 표시

## 🔗 참고 자료

- [MDN: Progressive Web Apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Next.js PWA Guide](https://nextjs.org/docs/app/guides/progressive-web-apps)
- [CSS Dynamic Viewport Units](https://developer.mozilla.org/en-US/docs/Web/CSS/length#relative_length_units_based_on_viewport)
- [Web.dev: PWA Best Practices](https://web.dev/progressive-web-apps/)

---

*이 문서는 필립앤소피 프로젝트의 PWA 및 모바일 최적화에 대한 권위 있는 가이드입니다.*
