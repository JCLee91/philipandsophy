# Z-Index 계층 구조 가이드

**최종 업데이트**: 2025-11-05

## 개요

프로젝트 전체에서 일관된 z-index 사용을 위한 가이드입니다. 모든 z-index는 `/src/constants/z-index.ts`에 정의된 상수를 사용해야 합니다.

## 계층 구조

### 🔴 최상위 레벨 (10000+)
모든 UI 요소 위에 표시되어야 하는 컴포넌트

| 레벨 | 값 | 용도 | 컴포넌트 |
|------|-----|------|----------|
| IMAGE_VIEWER_CONTENT | 10001 | 이미지 뷰어 콘텐츠 | ImageViewerDialog |
| IMAGE_VIEWER_BACKDROP | 10000 | 이미지 뷰어 백드롭 | ImageViewerDialog |

### 🟠 모달/다이얼로그 레벨 (9999)
일반적인 모달과 다이얼로그

| 레벨 | 값 | 용도 | 컴포넌트 |
|------|-----|------|----------|
| MODAL_BACKDROP | 9999 | 모달 백드롭 | dialog.tsx |
| MODAL_CONTENT | 9999 | 모달 콘텐츠 | dialog.tsx |
| DM_DIALOG | 9999 | DM 다이얼로그 | DirectMessageDialog |
| NOTIFICATION | 9999 | 알림 프롬프트 | notification-prompt |

### 🟡 드롭다운 메뉴 레벨 (1100)
드롭다운과 컨텍스트 메뉴

| 레벨 | 값 | 용도 | 컴포넌트 |
|------|-----|------|----------|
| DROPDOWN_MENU | 1100 | 드롭다운 메뉴 | dropdown-menu.tsx |

### 🟢 시트/헤더 레벨 (998-1000)
시트, 사이드바, 헤더 등

| 레벨 | 값 | 용도 | 컴포넌트 |
|------|-----|------|----------|
| SHEET_CONTENT | 1000 | 시트 콘텐츠 | sheet.tsx |
| SHEET_BACKDROP | 999 | 시트 백드롭 | sheet.tsx |
| HEADER | 999 | 메인 헤더 | Header.tsx |
| BACK_HEADER | 999 | 뒤로가기 헤더 | BackHeader.tsx |
| STEP_HEADER | 998 | 스텝 헤더 | 제출 스텝 페이지들 |

### 🔵 토스트 레벨 (100)
토스트 알림

| 레벨 | 값 | 용도 | 컴포넌트 |
|------|-----|------|----------|
| TOAST | 100 | 토스트 메시지 | toast.tsx |

### 🟣 팝업/오버레이 레벨 (50)
일반 팝업과 오버레이

| 레벨 | 값 | 용도 | 컴포넌트 |
|------|-----|------|----------|
| POPUP | 50 | 일반 팝업 | - |
| SPLASH_SCREEN | 50 | 스플래시 화면 | SplashScreen |
| SETTINGS_DIALOG | 50 | 설정 다이얼로그 | SettingsDialog |
| HEADER_NAVIGATION | 50 | 헤더 네비게이션 | HeaderNavigation |
| LOCKED_SCREEN | 50 | 잠금 화면 | LockedScreen |
| TEMPLATE_MODAL | 50 | 템플릿 모달 | NoticeTemplateSelector 등 |
| AUTOCOMPLETE | 50 | 자동완성 | BookSearchAutocomplete |

### ⚫ 사이드바 레벨 (40)
사이드바와 관련 오버레이

| 레벨 | 값 | 용도 | 컴포넌트 |
|------|-----|------|----------|
| SIDEBAR_OVERLAY | 40 | 사이드바 오버레이 | DataCenterSidebar |
| SIDEBAR | 40 | 사이드바 | DataCenterSidebar |

### 🟤 일반 요소 레벨 (10-20)
일반적인 UI 요소

| 레벨 | 값 | 용도 | 컴포넌트 |
|------|-----|------|----------|
| BOOKMARK_CARD_TOP | 20 | 북마크 카드 상단 | BookmarkCard |
| DROPDOWN | 10 | 일반 드롭다운 | 다양한 드롭다운 |
| BOOKMARK_ROW | 10 | 북마크 행 | BookmarkRow |
| STICKY_ELEMENT | 10 | 스티키 요소 | 테이블 헤더 등 |
| PROFILE_ELEMENT | 10 | 프로필 요소 | 프로필 페이지 |

### ⚪ 기본 레벨 (0)
가장 하위 레벨

| 레벨 | 값 | 용도 | 컴포넌트 |
|------|-----|------|----------|
| BASE | 0 | 기본 배경 | BookmarkCard 배경 등 |

## 사용 방법

### 1. 상수 import
```typescript
import { Z_INDEX } from '@/constants/z-index';
```

### 2. 템플릿 리터럴로 사용
```typescript
// ✅ 올바른 사용
className={`fixed inset-0 z-[${Z_INDEX.MODAL_BACKDROP}]`}

// ❌ 하드코딩 금지
className="fixed inset-0 z-9999"
```

### 3. 헬퍼 함수 사용
```typescript
import { getZIndexClass } from '@/constants/z-index';

// 클래스명 생성
const zClass = getZIndexClass('MODAL_BACKDROP'); // "z-9999"
```

## 규칙

### ✅ DO
- 항상 `z-index.ts`의 상수 사용
- 새로운 z-index가 필요하면 상수 파일에 추가
- 비슷한 용도의 컴포넌트는 같은 레벨 사용
- 문서 업데이트

### ❌ DON'T
- 인라인으로 z-index 하드코딩 금지
- 임의의 z-index 값 사용 금지
- 기존 계층 구조 무시 금지

## 충돌 해결

z-index 충돌이 발생하면:

1. 두 컴포넌트의 용도와 계층 확인
2. 적절한 레벨로 조정
3. `z-index.ts` 업데이트
4. 이 문서 업데이트

## 테스트 체크리스트

새로운 z-index 추가 시:

- [ ] 모든 브라우저에서 테스트
- [ ] 모바일 디바이스에서 테스트
- [ ] 다른 모달/다이얼로그와 함께 테스트
- [ ] 드롭다운 메뉴와 함께 테스트
- [ ] 토스트 메시지와 함께 테스트

## 최근 변경사항

### 2025-11-05
- z-index 체계 표준화
- `z-index.ts` 상수 파일 생성
- ImageViewerDialog z-index 수정 (DM 다이얼로그 위에 표시)
- DirectMessageDialog z-index 표준화

---

*이 문서는 z-index 관련 변경 시 업데이트되어야 합니다.*