# 공지 템플릿 시스템 설계

**Last Updated**: 2025-10-25
**Category**: architecture

## 📋 Overview

기수별로 재활용 가능한 공지를 템플릿으로 관리하고, datacntr에서 클릭 몇 번으로 공지를 생성할 수 있는 시스템.

## 🎯 Goals

1. **재활용성**: 공통 공지를 템플릿으로 한 번만 작성
2. **관리 편의성**: datacntr UI에서 쉽게 공지 생성
3. **유연성**: 템플릿 공지 + 커스텀 공지 병행 가능
4. **추적성**: 어떤 템플릿에서 생성되었는지 추적

## 🗂️ Database Schema

### 1. `notice_templates` Collection (NEW)

```typescript
interface NoticeTemplate {
  id: string;                    // 문서 ID: welcome-guide, reading-tips 등
  category: 'onboarding' | 'guide' | 'milestone' | 'event';
  title: string;                 // "프로그램 시작 안내"
  content: string;               // 실제 공지 내용
  imageUrl?: string;             // 이미지 URL (선택)
  order: number;                 // 정렬 순서 (같은 카테고리 내)
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Categories**:
- `onboarding`: 온보딩 (프로그램 시작, 첫 매칭 등)
- `guide`: 사용법 가이드 (독서 인증, 프로필 작성 등)
- `milestone`: 마일스톤 (중간 점검, 마지막 날 등)
- `event`: 특별 이벤트 (선택 사항)

### 2. `notices` Collection (기존 확장)

```typescript
interface Notice {
  id: string;
  cohortId: string;
  author: string;
  content: string;
  imageUrl?: string;
  templateId?: string;           // 👈 NEW: 템플릿 ID (템플릿에서 생성된 경우)
  isCustom: boolean;             // 👈 NEW: true=커스텀 공지, false=템플릿 공지
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

## 🔧 Implementation Plan

### Phase 1: DB & Types (Step 2-3)
- [ ] `src/types/database.ts`에 NoticeTemplate 타입 정의
- [ ] Notice 타입에 templateId, isCustom 필드 추가
- [ ] `src/lib/firebase/notice-templates.ts` 모듈 생성

### Phase 2: API Layer (Step 4)
- [x] `GET /api/datacntr/notice-templates` - 템플릿 목록 조회
- [x] `POST /api/datacntr/notice-templates` - 템플릿 생성 (슈퍼 관리자)
- [x] `PUT /api/datacntr/notice-templates/:id` - 템플릿 수정
- [x] `DELETE /api/datacntr/notice-templates/:id` - 템플릿 삭제
- [x] `POST /api/datacntr/notices/from-templates` - 템플릿에서 공지 생성 (배치)
- [x] `POST /api/datacntr/notices/:id/to-template` - 기존 공지를 템플릿으로 저장

### Phase 3: UI Components (Step 5)
- [ ] `NoticeTemplateSelector.tsx` - 템플릿 선택 모달
- [ ] `NoticeTemplateList.tsx` - 템플릿 관리 페이지 (슈퍼 관리자)
- [ ] 기존 공지 작성 화면에 "템플릿에서 선택" 탭 추가

### Phase 4: Seed Data (Step 6)
- [ ] 기본 템플릿 생성 스크립트 (현재 레포지토리에는 별도 seed 스크립트 없음 — 필요 시 `scripts/` 또는 `src/scripts/`에 추가)

### Phase 5: Integration (Step 7-8)
- [ ] datacntr 공지 관리 페이지 통합
- [ ] 테스트 및 검증

## 📊 Default Templates (Seed Data)

### Onboarding (온보딩)
1. **welcome-guide**: 프로그램 시작 안내
2. **first-matching**: 첫 매칭 안내
3. **daily-routine**: 일일 루틴 소개

### Guide (가이드)
1. **reading-certification**: 독서 인증 방법
2. **profile-tips**: 프로필 작성 팁
3. **chat-guide**: 채팅 사용법

### Milestone (마일스톤)
1. **midpoint-check**: 중간 점검 (7일차)
2. **final-day**: 마지막 날 안내 (14일차)

## 🎨 User Flow

### 관리자: 새 기수 공지 설정
1. datacntr → "2기" 선택 → "공지 관리"
2. "📚 템플릿 추가" 버튼 클릭
3. 템플릿 선택 모달:
   - 온보딩 3개 체크
   - 가이드 3개 체크
   - 마일스톤 2개 체크
4. "선택한 템플릿 8개 적용하기" → 완료!
5. 필요시 "📝 새 공지 쓰기"로 커스텀 공지 추가

### 관리자: 커스텀 공지 작성
1. "📝 새 공지 쓰기" 탭
2. 내용 입력
3. "작성 완료" → `isCustom: true`로 저장

### 관리자: 기존 공지를 템플릿으로 저장
1. 공지 목록에서 공지 선택
2. "템플릿으로 저장" 버튼 클릭
3. 템플릿 ID, 카테고리, 제목, 순서 입력
4. 저장 → 다음 기수에서 재사용 가능

### 슈퍼 관리자: 템플릿 관리
1. datacntr → "템플릿 관리" 메뉴
2. 템플릿 목록 확인
3. 수정/삭제/추가

## 🔍 API Specifications

### GET /api/datacntr/notice-templates

**Response**:
```json
{
  "templates": [
    {
      "id": "welcome-guide",
      "category": "onboarding",
      "title": "프로그램 시작 안내",
      "content": "필립앤소피에 오신 것을 환영합니다...",
      "order": 1,
      "createdAt": "2025-10-25T00:00:00Z",
      "updatedAt": "2025-10-25T00:00:00Z"
    }
  ]
}
```

### POST /api/datacntr/notices/from-templates

**Request**:
```json
{
  "cohortId": "2",
  "templateIds": ["welcome-guide", "reading-certification"],
  "author": "운영자"
}
```

**Response**:
```json
{
  "success": true,
  "createdCount": 2,
  "noticeIds": ["abc123", "def456"]
}
```

### POST /api/datacntr/notices/:noticeId/to-template

**Request**:
```json
{
  "templateId": "special-event",
  "category": "event",
  "title": "특별 이벤트 안내",
  "order": 1
}
```

**Response**:
```json
{
  "success": true,
  "templateId": "special-event",
  "message": "공지가 템플릿으로 저장되었습니다"
}
```

## 🚀 Migration Strategy

### 기존 공지 처리
- 기존 공지: `isCustom: true`, `templateId: null`로 간주
- 마이그레이션 스크립트 불필요 (읽기 시 기본값 적용)

### 롤백 계획
- `notice_templates` 컬렉션 삭제
- Notice 타입에서 `templateId`, `isCustom` 필드 무시
- 기존 공지 시스템으로 복귀

## 📈 Success Metrics

- [ ] 새 기수 공지 설정 시간: 5분 이내
- [ ] 템플릿 재활용률: 80% 이상
- [ ] 관리자 만족도: datacntr에서 DB 직접 조작 불필요

---

**Next Steps**:
1. NoticeTemplate 타입 정의
2. Firebase 모듈 구현
3. API 엔드포인트 구현
4. UI 컴포넌트 구현
5. Seed 스크립트 작성
6. 통합 및 테스트
