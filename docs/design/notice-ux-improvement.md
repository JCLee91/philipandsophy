# 공지사항 관리 UX 개선 가이드

**Last Updated**: 2025-10-30
**Category**: design

## Overview

데이터센터 공지사항 관리 페이지의 UX를 Notion, Linear, Slack, Figma 등 최신 앱 스타일로 개선하여 사용성과 시각적 계층 구조를 향상시켰습니다.

## 개선 목표

### Before (문제점)
1. **혼란스러운 액션 배치**: 기수당 3개 버튼 (공지 작성, 템플릿 사용, 템플릿 관리)이 동일한 비중으로 노출
2. **불필요한 버튼 노출**: 각 공지마다 "템플릿으로 저장" 버튼이 항상 표시되어 자주 안 쓰는 기능이 과도하게 강조됨
3. **플로우 끊김**: 템플릿 관리가 별도 페이지로 분리되어 컨텍스트 전환 필요
4. **드래그 핸들 부재**: DndKit 사용 중이지만 드래그 가능 여부가 시각적으로 불명확
5. **색상 불일치**: Green, Blue, Gray 등 다양한 색상으로 통일감 부재

### After (개선안)
1. **명확한 액션 계층**: Primary CTA 1개 + Secondary 액션은 메뉴로 숨김
2. **컨텍스트 메뉴 패턴**: 자주 안 쓰는 액션은 "..." 메뉴로 분리
3. **드래그 핸들 명시**: 6-dot grip icon으로 드래그 가능성 명확하게 표시
4. **통일된 디자인 시스템**: Black (Primary), Gray (Neutral), Red (Destructive)

## 디자인 패턴

### 1. 기수 헤더 (CohortHeader)

**레이아웃:**
```
[기수명]                    [+ 공지 작성] [⋮]
                                        └─ 템플릿 사용
                                        └─ 템플릿 관리
```

**구현:**
```tsx
<CohortHeader
  cohortName="10기"
  cohortId="cohort-10"
  onCreateNotice={() => router.push('/datacntr/notices/create')}
  onUseTemplate={() => handleOpenTemplateModal()}
  onManageTemplates={() => router.push('/datacntr/notice-templates')}
/>
```

**디자인 원칙:**
- **Primary CTA**: "공지 작성" 버튼만 강조 (Black 배경, 우측 상단)
- **Secondary 액션**: MoreVertical (⋮) 아이콘으로 드롭다운 메뉴
- **메뉴 위치**: 우측 상단 정렬, 버튼 아래 8px margin
- **메뉴 스타일**: White 배경, shadow-lg, 1px border

**Tailwind Classes:**
```tsx
// Primary Button
className="bg-black text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-800"

// More Button
className="border border-gray-200 p-2.5 rounded-lg text-gray-600 hover:bg-gray-50"

// Dropdown Menu
className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10"

// Menu Item
className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
```

### 2. 공지 카드 (NoticeCard)

**레이아웃:**
```
[⋮⋮]  [작성자 · 시간]           [편집] [⋮]
       공지 내용...                    └─ 템플릿으로 저장
       [이미지]                         └─ 삭제
```

**구현:**
```tsx
<NoticeCard
  notice={notice}
  onEdit={() => router.push(`/datacntr/notices/edit/${notice.id}`)}
  onSaveAsTemplate={() => handleSaveAsTemplate(notice.id)}
  onDelete={() => handleDeleteNotice(notice.id)}
/>
```

**디자인 원칙:**
- **Drag Handle**: 좌측 GripVertical (⋮⋮) 아이콘, gray-400 색상
- **Primary 액션**: 편집 버튼만 노출 (Gray, hover시 Black)
- **Secondary 액션**: MoreVertical (⋮) 메뉴로 템플릿 저장, 삭제 숨김
- **Destructive 액션**: 삭제는 Red 텍스트, 메뉴 상단에 border separator

**Tailwind Classes:**
```tsx
// Drag Handle
className="p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"

// Primary Edit Button
className="p-1.5 text-gray-600 rounded hover:text-black hover:bg-gray-100"

// More Button
className="p-1.5 text-gray-600 rounded hover:text-black hover:bg-gray-100"

// Menu Item (Save as Template)
className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"

// Menu Item (Delete - Destructive)
className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"

// Menu Separator
className="border-t border-gray-100 my-1"
```

### 3. 드롭다운 메뉴 인터랙션

**Outside Click 처리:**
```tsx
const [isMenuOpen, setIsMenuOpen] = useState(false);
const menuRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
      setIsMenuOpen(false);
    }
  };

  if (isMenuOpen) {
    document.addEventListener('mousedown', handleClickOutside);
  }

  return () => {
    document.removeEventListener('mousedown', handleClickOutside);
  };
}, [isMenuOpen]);
```

**메뉴 토글:**
```tsx
<button onClick={() => setIsMenuOpen(!isMenuOpen)}>
  <MoreVertical className="h-5 w-5" />
</button>

{isMenuOpen && (
  <div ref={menuRef} className="absolute right-0 mt-2 ...">
    {/* Menu items */}
  </div>
)}
```

## 색상 시스템

### Primary Actions
- **배경**: `bg-black`
- **텍스트**: `text-white`
- **Hover**: `hover:bg-gray-800`
- **사용처**: 공지 작성 버튼

### Secondary Actions
- **배경**: `bg-white` 또는 transparent
- **테두리**: `border border-gray-200`
- **텍스트**: `text-gray-600`
- **Hover**: `hover:bg-gray-50`, `hover:text-black`
- **사용처**: 편집 버튼, 더보기 버튼

### Destructive Actions
- **텍스트**: `text-red-600`
- **Hover 배경**: `hover:bg-red-50`
- **사용처**: 삭제 버튼

### Drag Handle
- **기본**: `text-gray-400`
- **Hover**: `hover:text-gray-600`
- **Cursor**: `cursor-grab`, `active:cursor-grabbing`

## 아이콘 시스템

### Lucide React Icons

**사용 아이콘:**
- `PenSquare` - 공지 작성 (h-4 w-4)
- `MoreVertical` - 더보기 메뉴 (h-5 w-5)
- `GripVertical` - 드래그 핸들 (h-5 w-5)
- `Edit` - 편집 (h-4 w-4)
- `Save` - 템플릿으로 저장 (h-4 w-4)
- `Trash2` - 삭제 (h-4 w-4)
- `User` - 작성자 (h-3 w-3)

**크기 가이드:**
- **Large**: h-6 w-6 (페이지 레벨 아이콘)
- **Medium**: h-5 w-5 (버튼 아이콘)
- **Small**: h-4 w-4 (인라인 액션)
- **Tiny**: h-3 w-3 (메타데이터 아이콘)

## 반응형 고려사항

### 모바일 (< 768px)
- 기수 헤더: 버튼 스택 배치 고려
- 공지 카드: 드래그 핸들 크기 증가 (터치 타겟 44px)
- 메뉴: Full-width 드롭다운

### 태블릿 (768px ~ 1024px)
- 기수 헤더: 현재 레이아웃 유지
- 공지 카드: 현재 레이아웃 유지

### 데스크탑 (> 1024px)
- 공지 카드: max-width 고려 (가독성)
- 메뉴: Hover 상태 강조

## 접근성 (a11y)

### 키보드 내비게이션
- **Tab**: 버튼 간 이동
- **Enter/Space**: 버튼 클릭
- **Escape**: 메뉴 닫기

### ARIA 속성
```tsx
// 더보기 버튼
<button
  aria-label="더보기 메뉴"
  aria-expanded={isMenuOpen}
  aria-haspopup="menu"
>
  <MoreVertical />
</button>

// 드롭다운 메뉴
<div role="menu" aria-labelledby="menu-button">
  <button role="menuitem">템플릿 사용</button>
  <button role="menuitem">템플릿 관리</button>
</div>
```

### Focus 관리
- 메뉴 열릴 때: 첫 번째 항목으로 focus 이동
- 메뉴 닫힐 때: 트리거 버튼으로 focus 복귀

## 애니메이션

### 드롭다운 메뉴
```css
/* 추후 framer-motion 적용 가능 */
<motion.div
  initial={{ opacity: 0, y: -10 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -10 }}
  transition={{ duration: 0.15 }}
>
  {/* Menu items */}
</motion.div>
```

### 드래그 앤 드롭
- **isDragging**: `opacity: 0.5`
- **transform**: CSS Transform (DndKit 제공)
- **transition**: 자동 애니메이션

## 구현 파일

### 새로 생성된 컴포넌트
1. `/src/components/datacntr/CohortHeader.tsx` - 기수 헤더
2. `/src/components/datacntr/NoticeCard.tsx` - 공지 카드

### 수정된 페이지
1. `/src/app/datacntr/notices/page.tsx` - 메인 공지사항 페이지

## 마이그레이션 가이드

### Before
```tsx
// Old: 모든 버튼이 동일한 비중
<button className="bg-green-600">공지 작성</button>
<button className="bg-blue-600">템플릿 사용</button>
<button className="bg-gray-100">템플릿 관리</button>

// Old: 모든 액션이 항상 노출
<button className="hover:text-green-600"><Edit /></button>
<button className="hover:text-blue-600"><Save /></button>
<button className="hover:text-red-600"><Trash2 /></button>
```

### After
```tsx
// New: Primary CTA + 메뉴
<CohortHeader
  onCreateNotice={() => {}}
  onUseTemplate={() => {}}
  onManageTemplates={() => {}}
/>

// New: Primary 액션 + 컨텍스트 메뉴
<NoticeCard
  onEdit={() => {}}
  onSaveAsTemplate={() => {}}
  onDelete={() => {}}
/>
```

## 참고한 디자인 패턴

### Notion
- 컨텍스트 메뉴 (⋮) 사용
- 드래그 핸들 명시적 표현
- 미니멀한 색상 팔레트

### Linear
- Primary/Secondary 액션 명확한 분리
- Black & White 디자인 시스템
- 간결한 버튼 스타일

### Slack
- 주요/부가 기능 계층 구조
- Hover 상태 일관성
- 직관적인 아이콘 사용

### Figma
- 드래그 인터랙션 명확성
- Grip icon (⋮⋮) 표준 사용
- 효율적인 메뉴 구조

## 추가 개선 제안

### 단기 (1-2주)
- [ ] 메뉴 애니메이션 추가 (framer-motion)
- [ ] 키보드 내비게이션 완성
- [ ] 모바일 반응형 최적화

### 중기 (1개월)
- [ ] 공지 카드 확장/축소 기능
- [ ] 대량 선택/삭제 기능
- [ ] 필터링/정렬 UI 개선

### 장기 (3개월)
- [ ] 템플릿 인라인 미리보기
- [ ] 드래그 앤 드롭 기수 간 이동
- [ ] 공지 복사/붙여넣기 기능

---

*이 문서는 데이터센터 공지사항 관리 UX 개선의 권위있는 가이드입니다.*
