# 필립앤소피 멤버 전용 단방향 채팅방 Design Guide

## 1. Overall Mood (전체적인 무드)

본 서비스는 **신뢰할 수 있고 전문적인** 분위기를 추구합니다. 독서 프로그램 참가자들이 운영자의 중요한 공지를 놓치지 않고 집중해서 확인할 수 있도록, 산만하지 않은 깔끔하고 정돈된 인터페이스를 제공합니다. 

차분한 색상과 넉넉한 여백을 통해 안정감을 주며, 동시에 필요한 정보와 액션 버튼이 명확히 구분되어 사용자가 직관적으로 다음 단계를 수행할 수 있도록 설계되었습니다. 전체적으로 **미니멀하면서도 따뜻한** 느낌을 유지하여 독서라는 활동의 본질에 집중할 수 있는 환경을 조성합니다.

## 2. Reference Service (참조 서비스)

- **Name**: Dropbox Paper
- **Description**: 협업과 문서 작성에 최적화된 깔끔한 온라인 에디터 서비스
- **Design Mood**: 넉넉한 여백과 라이트 그레이 배경을 활용한 차분하고 전문적인 분위기
- **Primary Color**: #0061FF (Dropbox Blue)
- **Secondary Color**: #00D4AA (Dropbox Teal)

Dropbox Paper의 디자인 철학을 참조하여 불필요한 요소를 제거하고 콘텐츠에 집중할 수 있는 환경을 만들었습니다. 특히 깨끗한 헤더 영역과 부드러운 색상 조합을 통해 사용자가 편안하게 정보를 소비할 수 있도록 설계했습니다.

## 3. Color & Gradient (색상 & 그라데이션)

**쿨톤 기반의 저채도 컬러 팔레트**를 사용하여 안정감과 신뢰성을 표현합니다.

- **Primary Color**: #1E2A44 (네이비) - 메인 텍스트, 헤더, 중요 요소
- **Secondary Color**: #4FA3FF (스카이 블루) - 보조 정보, 링크, 알림 요소  
- **Accent Color**: #24C7A2 (에메랄드) - CTA 버튼, 강조 포인트
- **Background Color**: #F5F7FA (라이트 그레이) - 메인 배경
- **Text Color**: #2A2D34 (차콜) - 본문 텍스트
- **Border Color**: #E1E5E9 - 구분선, 카드 테두리
- **Success**: #10B981 - 성공 상태
- **Warning**: #F59E0B - 주의 상태
- **Error**: #EF4444 - 오류 상태

**Color Usage**:
1. **Primary**: 헤더, 네비게이션, 중요 텍스트에 사용
2. **Secondary**: 부가 정보, 아이콘, 링크 상태에 사용  
3. **Accent**: 주요 액션 버튼, 완료/성공 상태에 사용
4. **Background**: 전체 배경, 카드 배경에 사용

## 4. Typography & Font (타이포그래피 & 폰트)

웹 안전 폰트인 **Inter**를 메인으로 사용하여 가독성과 일관성을 확보합니다.

- **Heading 1**: Inter, 32px, Font Weight 600, Line Height 1.2
- **Heading 2**: Inter, 24px, Font Weight 600, Line Height 1.3  
- **Heading 3**: Inter, 20px, Font Weight 600, Line Height 1.4
- **Body Large**: Inter, 16px, Font Weight 400, Line Height 1.5
- **Body Medium**: Inter, 14px, Font Weight 400, Line Height 1.5
- **Body Small**: Inter, 12px, Font Weight 400, Line Height 1.4
- **Button Text**: Inter, 14px, Font Weight 500, Line Height 1.2
- **Caption**: Inter, 11px, Font Weight 400, Line Height 1.3

**Letter Spacing**: 기본값 유지 (0)
**Paragraph Spacing**: 16px 기본, 제목과 본문 사이 24px

## 5. Layout & Structure (레이아웃 & 구조)

**모바일 퍼스트** 접근 방식을 채택하여 반응형 그리드 시스템을 구축합니다.

**기본 레이아웃**:
- **Container Max Width**: 768px (태블릿 이상에서 중앙 정렬)
- **Side Padding**: 16px (모바일), 24px (태블릿 이상)
- **Vertical Spacing**: 16px 기본 간격
- **Section Spacing**: 32px

**그리드 시스템**:
- **Mobile**: 단일 컬럼, 100% width
- **Tablet**: 필요시 2컬럼 (8:4 비율)
- **Desktop**: 메인 콘텐츠 중앙 정렬, 최대 768px

**주요 영역 구성**:
1. **Header**: 고정 상단바 (56px 높이)
2. **Main Content**: 스크롤 가능한 공지 리스트 영역
3. **Footer**: 필요시 고정 하단 액션 영역

## 6. Visual Style (비주얼 스타일)

**미니멀하고 기능적인** 비주얼 스타일을 추구합니다.

**아이콘**:
- **라이브러리**: Lucide React 사용
- **스타일**: Stroke 기반, 1.5px 두께
- **크기**: 16px (Small), 20px (Medium), 24px (Large)
- **색상**: Primary (#1E2A44) 또는 Secondary (#4FA3FF)

**이미지**:
- **Border Radius**: 8px (카드 내 이미지), 4px (썸네일)
- **Aspect Ratio**: 16:9 (가로형), 1:1 (프로필/아이콘)
- **최대 너비**: 100% (반응형)

**일러스트레이션**:
- **스타일**: 라인 아트 기반, 미니멀
- **색상**: Primary와 Accent 색상 조합
- **용도**: 빈 상태, 온보딩, 오류 페이지

**그림자와 깊이**:
- **Card Shadow**: 0 2px 8px rgba(0, 0, 0, 0.08)
- **Button Shadow**: 0 1px 3px rgba(0, 0, 0, 0.12)
- **Modal Shadow**: 0 8px 32px rgba(0, 0, 0, 0.16)

## 7. UX Guide (UX 가이드)

**타겟 사용자**: 독서 프로그램 참가자 (모바일 중심 사용, 다양한 연령대)

**핵심 UX 원칙**:

1. **단순함 우선**: 4자리 코드 입력만으로 30초 내 접속 완료
2. **정보 집중**: 단방향 공지로 중요 정보가 묻히지 않도록 설계
3. **즉시성**: 새 공지 시 푸시 알림으로 즉각 전달
4. **액션 명확성**: CTA 버튼을 통한 명확한 다음 단계 안내

**사용성 가이드**:
- **터치 타겟**: 최소 44px × 44px (iOS 가이드라인 준수)
- **스크롤**: 자동 스크롤로 최신 공지가 항상 보이도록 설정
- **로딩**: 스켈레톤 UI로 로딩 상태 표시
- **오류 처리**: 친화적인 오류 메시지와 재시도 옵션 제공

**접근성**:
- **색상 대비**: WCAG 2.1 AA 기준 이상 (4.5:1)
- **키보드 네비게이션**: Tab 순서와 Focus 상태 명확히 표시
- **스크린 리더**: 적절한 aria-label과 semantic HTML 사용

## 8. UI Component Guide (UI 컴포넌트 가이드)

### 8.1 버튼 (Buttons)

**Primary Button**:
- 배경색: #24C7A2 (Accent)
- 텍스트: #FFFFFF, Font Weight 500
- 높이: 44px, Padding: 12px 24px
- Border Radius: 22px (Fully Rounded)
- Hover: 배경색 10% 어두워짐

**Secondary Button**:
- 배경색: 투명, 테두리: 2px solid #4FA3FF
- 텍스트: #4FA3FF, Font Weight 500
- 높이: 44px, Padding: 12px 24px
- Border Radius: 22px

**Ghost Button**:
- 배경색: 투명
- 텍스트: #1E2A44, Font Weight 500
- 높이: 44px, Padding: 12px 16px
- Hover: 배경색 #F5F7FA

### 8.2 입력 필드 (Input Fields)

**4자리 코드 입력**:
- 4개의 개별 입력 칸 (각 48px × 48px)
- Border: 2px solid #E1E5E9
- Border Radius: 8px
- Focus: Border #4FA3FF, Box Shadow
- 텍스트: 중앙 정렬, 20px, Font Weight 600

**일반 텍스트 입력**:
- 높이: 44px, Padding: 12px 16px
- Border: 1px solid #E1E5E9
- Border Radius: 8px
- Focus: Border #4FA3FF

### 8.3 카드 (Cards)

**공지 카드**:
- 배경색: #FFFFFF
- Border: 1px solid #E1E5E9
- Border Radius: 12px
- Padding: 20px
- Shadow: 0 2px 8px rgba(0, 0, 0, 0.08)
- Margin Bottom: 16px

**코드 입력 카드**:
- 배경색: #FFFFFF
- Border Radius: 16px
- Padding: 32px 24px
- Shadow: 0 4px 16px rgba(0, 0, 0, 0.12)
- 중앙 정렬

### 8.4 네비게이션 (Navigation)

**상단바**:
- 높이: 56px
- 배경색: #FFFFFF
- Border Bottom: 1px solid #E1E5E9
- Padding: 0 16px
- 좌측: 로고/프로그램명
- 우측: 아이콘 버튼들

**네비게이션 아이콘**:
- 크기: 24px
- 색상: #1E2A44
- 터치 영역: 44px × 44px
- 활성 상태: #4FA3FF

### 8.5 알림 및 피드백 (Notifications & Feedback)

**푸시 권한 배너**:
- 배경색: #F0F8FF
- Border: 1px solid #4FA3FF
- Border Radius: 8px
- Padding: 16px
- 닫기 버튼 포함

**토스트 메시지**:
- 배경색: #1E2A44
- 텍스트: #FFFFFF
- Border Radius: 8px
- Padding: 12px 16px
- 하단에서 슬라이드 업

**로딩 상태**:
- 스켈레톤 UI 사용
- 배경색: #F5F7FA
- 애니메이션: 부드러운 펄스 효과

### 8.6 모션 및 전환 (Motion & Transitions)

**페이지 전환**:
- Fade In/Out: 150ms ease-in-out
- 슬라이드: 200ms ease-out

**버튼 상호작용**:
- Hover: 100ms ease-out
- Active: 50ms ease-in

**스크롤 애니메이션**:
- 새 공지 등장: Slide Up 100ms
- 자동 스크롤: 300ms ease-out

### 8.7 Today's Library UI 컴포넌트

**BlurDivider (블러 구분선)**:
- 그라데이션 블러 효과로 섹션 구분
- 배경색: 반투명 그라데이션
- 높이: 2px
- 용도: 북마크 카드 그룹 구분

**EllipseShadow (타원형 그림자)**:
- 카드 하단 타원형 그림자 효과
- 색상: #000000, 투명도 15-20%
- 오프셋: 수직 20-30px
- 블러: 20-30px
- 용도: 북마크 카드에 깊이감 부여

**BookmarkCard (북마크 카드)**:
- 배경색: #FFFFFF
- Border Radius: 12px
- Padding: 16px
- Shadow: 0 2px 8px rgba(0, 0, 0, 0.08)
- 프로필 이미지: 40px × 40px, 원형
- 책 표지 이미지: 16:9 비율, Border Radius 8px
- 한줄 리뷰: 2줄 말줄임 (ellipsis)

**BookmarkCardSkeleton (스켈레톤 로딩)**:
- 배경색: #F5F7FA
- 애니메이션: 부드러운 펄스 효과 (1.5s infinite)
- 구조: BookmarkCard와 동일한 레이아웃

**HeaderNavigation (헤더 네비게이션)**:
- 높이: 56px
- 배경색: #FFFFFF
- Border Bottom: 1px solid #E1E5E9
- 뒤로가기 아이콘: 24px, #1E2A44
- 타이틀: 16px, Font Weight 600

**FooterActions (하단 액션 버튼)**:
- 위치: 고정 하단
- 배경색: #FFFFFF
- Border Top: 1px solid #E1E5E9
- Padding: 16px
- 버튼: Primary 스타일, 전체 너비

### 8.8 책 검색 자동완성 UI

**BookSearchAutocomplete (자동완성 컴포넌트)**:

#### 기본 입력 모드
- 입력 필드: 44px 높이, Border Radius 8px
- placeholder: "책 제목을 입력하세요"
- autoComplete: "off" (브라우저 히스토리 비활성화)
- 드롭다운: 최대 5개 결과 표시
- 각 항목:
  - 책 표지: 40px × 60px 썸네일
  - 제목: 14px, Font Weight 500, 1줄 말줄임
  - 저자/출판사: 12px, Font Weight 400, #6B7280
  - Hover: 배경색 #F5F7FA
- 로딩 상태: 스피너 애니메이션
- 빈 상태: "검색 결과가 없습니다" 메시지
- 디바운스: 500ms (타이핑 중 API 호출 최소화)

#### 책 정보 카드 모드 (선택 후 / initialBook prop 있을 때)
**선택된 책 카드**:
- 배경색: #FFFFFF
- Border: 1px solid #E1E5E9
- Border Radius: 12px
- Padding: 16px
- Shadow: 0 2px 8px rgba(0, 0, 0, 0.08)
- 레이아웃: 가로 방향 flexbox
  - 왼쪽: 책 표지 이미지 (64px × 96px)
  - 중앙: 책 정보 텍스트
    - 제목: 14px, Font Weight 600, 최대 2줄 말줄임
    - 저자: 12px, Font Weight 400, #6B7280
    - 출판사: 11px, Font Weight 400, #9CA3AF
  - 오른쪽: X 버튼 (24px × 24px, #6B7280)

**X 버튼 (선택 취소)**:
- 크기: 24px × 24px
- 아이콘: Lucide React X icon
- 색상: #6B7280
- Hover: 배경색 #F5F7FA, 색상 #EF4444
- 동작: 책 선택 취소 및 메타데이터 초기화

**수동 입력 경고**:
- 조건: 자동완성 선택 없이 직접 텍스트 입력 시
- 방식: `window.confirm()` 다이얼로그
- 메시지: "수동으로 입력하시면 책 정보(저자, 표지 등)가 자동으로 저장되지 않습니다. 계속하시겠습니까?"
- 취소 선택 시: 입력 필드 초기화

#### 상태별 UI
1. **초기 상태 (빈 입력)**:
   - 입력 필드만 표시
   - placeholder 표시

2. **검색 중 (타이핑)**:
   - 드롭다운 표시
   - 로딩 스피너 (디바운스 중)
   - 검색 결과 리스트

3. **책 선택 완료**:
   - 입력 필드 숨김
   - 책 정보 카드 표시
   - X 버튼으로 취소 가능

4. **initialBook prop 존재 (이전 독서)**:
   - 컴포넌트 마운트 시 즉시 책 정보 카드 표시
   - 사용자가 X 버튼으로 변경 가능

#### Props 인터페이스
```typescript
interface BookSearchAutocompleteProps {
  value?: string;                    // 입력된 책 제목
  onBookSelect: (book: Book) => void; // 책 선택 시 콜백
  onClear?: () => void;              // 선택 취소 시 콜백 (메타데이터 초기화)
  initialBook?: {                    // 이전 독서 정보 (선택사항)
    title: string;                   // 필수: 책 제목
    author?: string;                 // 선택: 저자
    publisher?: string;              // 선택: 출판사
    image?: string;                  // 선택: 표지 URL
  };
}
```

#### 반응형 디자인
- **모바일 (< 768px)**:
  - 책 정보 카드: 전체 너비
  - 표지 이미지: 56px × 84px (작게 조정)
  - 제목: 최대 2줄 말줄임

- **태블릿/데스크톱 (≥ 768px)**:
  - 책 정보 카드: 최대 600px
  - 표지 이미지: 64px × 96px
  - 제목: 최대 2줄 말줄임

---

## 🎨 Shimmer Animation System

**Last Updated**: 2025-10-13

통일된 로딩 상태 UI를 위한 Shimmer 애니메이션 시스템입니다.

### 개요

전역 utility class로 제공되는 shimmer 애니메이션은 모든 스켈레톤 로딩 상태에서 일관된 UX를 제공합니다.

### 구현 위치

**파일**: `src/app/globals.css`

```css
@layer utilities {
  .shimmer {
    @apply bg-linear-to-r from-gray-200 via-white to-gray-200 bg-size-[200%_100%] animate-shimmer;
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

### 사용 예시

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

### 디자인 토큰

| 속성 | 값 | 설명 |
|------|-----|------|
| **Duration** | 1.5s | 애니메이션 지속 시간 |
| **Timing Function** | ease-in-out | 부드러운 가속/감속 |
| **Gradient Colors** | gray-200 → white → gray-200 | 3-stop 그라데이션 |
| **Border Radius** | 8px | 기본 둥근 모서리 |
| **GPU Acceleration** | `will-change: background-position` | 성능 최적화 |

### 접근성 (WCAG 2.1 준수)

#### prefers-reduced-motion 지원

모션 민감도가 있는 사용자를 위해 애니메이션을 자동으로 비활성화합니다:

```css
@media (prefers-reduced-motion: reduce) {
  .shimmer {
    animation: none;
    background: theme('colors.gray.200') !important;
    will-change: auto;
  }
}
```

**사용자 경험**:
- 일반 사용자: 부드러운 shimmer 애니메이션
- 모션 민감도 설정 사용자: 정적인 회색 배경

### 성능 최적화

1. **GPU 가속**: `will-change: background-position`으로 레이어 분리
2. **CSS 애니메이션**: JavaScript 없이 순수 CSS로 구현
3. **DRY 원칙**: 15개 중복 애니메이션 정의 제거
4. **Tailwind Integration**: `tailwind.config.ts`에 keyframe 정의

### Tailwind 설정

```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      animation: {
        shimmer: 'shimmer 1.5s ease-in-out infinite'
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        }
      }
    }
  }
}
```

### 사용 가이드라인

#### ✅ 언제 사용하는가

- 데이터 로딩 중 (프로필, 공지사항, 독서 인증 리스트)
- 이미지 로딩 중 (아바타, 책 표지)
- 네트워크 요청 대기 중
- 무한 스크롤 로딩 상태

#### ❌ 사용하지 말아야 할 때

- 즉시 완료되는 작업 (< 300ms)
- 진행률 표시가 필요한 긴 작업 (진행 바 사용)
- 사용자 액션 피드백 (버튼 로딩 스피너 사용)

### 적용 컴포넌트 예시

#### ProfileCardSkeleton
```tsx
export function ProfileCardSkeleton() {
  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="flex items-start gap-3">
        {/* 아바타 */}
        <div className="shimmer h-12 w-12 rounded-full" />

        <div className="flex-1 space-y-2">
          {/* 이름 */}
          <div className="shimmer h-5 w-24 rounded" />
          {/* 직업 */}
          <div className="shimmer h-4 w-32 rounded" />
        </div>
      </div>

      {/* Bio */}
      <div className="mt-3 space-y-2">
        <div className="shimmer h-4 w-full rounded" />
        <div className="shimmer h-4 w-3/4 rounded" />
      </div>
    </div>
  );
}
```

#### NoticeSkeleton
```tsx
export function NoticeSkeleton() {
  return (
    <div className="rounded-lg bg-white p-4">
      {/* 헤더 */}
      <div className="flex items-center gap-2 mb-3">
        <div className="shimmer h-8 w-8 rounded-full" />
        <div className="shimmer h-4 w-20 rounded" />
      </div>

      {/* 본문 */}
      <div className="space-y-2">
        <div className="shimmer h-4 w-full rounded" />
        <div className="shimmer h-4 w-full rounded" />
        <div className="shimmer h-4 w-2/3 rounded" />
      </div>

      {/* 이미지 (선택) */}
      <div className="shimmer mt-3 h-48 w-full rounded-lg" />
    </div>
  );
}
```

### 이점

- ✅ **일관성**: 전체 앱에서 동일한 로딩 UX
- ✅ **접근성**: WCAG 2.1 준수 (prefers-reduced-motion)
- ✅ **성능**: GPU 가속으로 60fps 유지
- ✅ **유지보수성**: 단일 utility class로 관리
- ✅ **DRY 원칙**: 중복 코드 15개 제거

---

**Last Updated**: 2025-11-04
**Document Version**: 1.1
**Project Version**: V1.0 (프로덕션 배포 완료)
**Location**: `docs/design/ui-guide.md`

**업데이트 내역**:
- 2025-11-04: 현재 구현과 일치하도록 검토 및 검증 완료
  - Shimmer 애니메이션 구현 확인 (globals.css + tailwind.config.ts)
  - BookSearchAutocomplete 컴포넌트 props 인터페이스 검증
  - 모든 코드 예제의 실제 작동 여부 확인
- 2025-10-13: 초기 작성