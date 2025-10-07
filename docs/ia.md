# 필립앤소피 독서 소셜클럽 플랫폼 Information Architecture (IA)

## 1. 사이트맵

```
필립앤소피 플랫폼
├── / (랜딩페이지)
│   ├── 프로그램 소개
│   ├── 비전 & 미션
│   ├── 카카오톡 문의 버튼
│   └── 멤버 입장 링크 → /app
│
├── /app (멤버 전용 영역)
│   ├── /app (접근 코드 입력)
│   ├── /app/chat (공지사항 및 채팅)
│   │   ├── 운영자 공지 목록
│   │   ├── 독서 인증 다이얼로그
│   │   └── Today's Library 링크
│   ├── /app/chat/today-library (오늘의 서재)
│   │   ├── 금일 독서 인증 카드 그리드
│   │   └── 인증 상세 모달
│   ├── /app/profile/[participantId] (참가자 프로필)
│   │   ├── 프로필 정보
│   │   ├── 독서 인증 기록
│   │   └── 다이렉트 메시지 버튼
│   └── /app/program (프로그램 소개)
│
├── /privacy-policy.html (개인정보처리방침)
├── /terms-of-service.html (이용약관)
├── /404 (페이지 없음)
└── /500 (서버 오류)
```

### Legacy 리다이렉트 (301 Permanent)

```
/member10           → /app
/chat               → /app/chat
/profile/*          → /app/profile/*
/program            → /app/program
```

## 2. 라우트 구조

### 공개 영역

| 경로 | 페이지 | 접근 권한 | 설명 |
|------|--------|-----------|------|
| `/` | 랜딩페이지 | 공개 | 필립앤소피 브랜드 소개, Glassmorphism 디자인 |
| `/privacy-policy.html` | 개인정보처리방침 | 공개 | 정적 HTML 페이지 |
| `/terms-of-service.html` | 이용약관 | 공개 | 정적 HTML 페이지 |

### 멤버 전용 영역 (/app)

| 경로 | 페이지 | 접근 권한 | 설명 |
|------|--------|-----------|------|
| `/app` | 접근 코드 입력 | 공개 | 4자리 코드 입력 후 채팅방 진입 |
| `/app/chat` | 공지사항 및 채팅 | 로그인 필요 | 운영자 공지, 독서 인증 CTA |
| `/app/chat/today-library` | Today's Library | 로그인 필요 | 오늘 독서 인증 모음 |
| `/app/profile/[id]` | 참가자 프로필 | 로그인 필요 | 참가자 상세 프로필 및 독서 기록 |
| `/app/program` | 프로그램 소개 | 로그인 필요 | 필립앤소피 프로그램 상세 정보 |

### 에러 페이지

| 경로 | 페이지 | 설명 |
|------|--------|------|
| `/404` | Not Found | 존재하지 않는 페이지 접근 시 |
| `/500` | Server Error | 서버 오류 발생 시 |

## 3. 사용자 흐름

### 흐름 1: 프로그램 지원자 → 참가자 전환

```
1. 랜딩페이지 방문 (/)
   ↓
2. 프로그램 소개 읽기
   ↓
3. 카카오톡 문의 버튼 클릭
   ↓
4. 운영팀과 상담 (외부)
   ↓
5. 참가 승인 후 4자리 코드 발급받음
   ↓
6. "멤버 입장" 버튼 클릭 → /app
   ↓
7. 4자리 코드 입력
   ↓
8. 채팅방 입장 (/app/chat)
```

### 흐름 2: 참가자 - 공지 확인 및 독서 인증

```
1. /app에서 4자리 코드 입력
   ↓
2. 코드 검증 후 /app/chat으로 자동 이동
   ↓
3. 최신 공지 확인 (자동 스크롤)
   ↓
4. 공지 내용 읽기 (텍스트, 이미지, 링크)
   ↓
5. "독서 인증하기" 버튼 클릭
   ↓
6. 독서 인증 다이얼로그 오픈
   ↓
7. 독서 사진 업로드 + 한줄 리뷰 작성
   ↓
8. 제출 버튼 클릭
   ↓
9. Firestore에 저장
   ↓
10. Today's Library에 자동 반영
```

### 흐름 3: 참가자 - 프로필 탐색 및 소통

```
1. /app/chat 상단 "프로필북" 버튼 클릭
   ↓
2. 참가자 목록 표시 (그리드 또는 리스트)
   ↓
3. 관심 있는 참가자 프로필 클릭
   ↓
4. /app/profile/[participantId]로 이동
   ↓
5. 프로필 정보 확인 (이름, MBTI, 관심사, 독서 기록)
   ↓
6. "다이렉트 메시지" 버튼 클릭
   ↓
7. 메시지 작성 및 전송
   ↓
8. 상대방/운영자에게 메시지 전달
```

### 흐름 4: 참가자 - Today's Library 탐색

```
1. /app/chat 내 "Today's Library" 링크 클릭
   ↓
2. /app/chat/today-library로 이동
   ↓
3. 오늘 독서 인증한 참가자 카드 그리드 확인
   ↓
4. 관심 가는 독서 인증 카드 클릭
   ↓
5. 상세 모달에서 이미지 + 리뷰 전체 보기
   ↓
6. 참가자 프로필 링크 클릭 시 프로필 페이지로 이동
```

### 흐름 5: 운영자 - 공지 발행

```
1. /app/chat에서 "공지 작성" 버튼 클릭 (운영자만 보임)
   ↓
2. 공지 작성 다이얼로그 오픈
   ↓
3. 공지 내용 작성 (텍스트, 이미지, 링크)
   ↓
4. "발행" 버튼 클릭
   ↓
5. Firestore에 저장
   ↓
6. 모든 참가자의 채팅방에 실시간 반영
```

## 4. 네비게이션 구조

### 글로벌 네비게이션 (GNB)

#### 랜딩페이지 헤더
```
┌─────────────────────────────────────────────────┐
│  [필립앤소피 로고]                     [멤버 입장]  │
└─────────────────────────────────────────────────┘
```

#### 멤버 영역 헤더 (/app/*)
```
┌─────────────────────────────────────────────────┐
│  [← 뒤로가기]  [필립앤소피 1기]  [알림 🔔]  [프로필] │
└─────────────────────────────────────────────────┘
```

### 로컬 네비게이션 (LNB)

#### 채팅방 하단 탭 (/app/chat)
```
┌─────────────────────────────────────────────────┐
│  [공지사항]  [Today's Library]  [프로필북]  [설정]  │
└─────────────────────────────────────────────────┘
```

#### 프로필 탭 (/app/profile/[id])
```
┌─────────────────────────────────────────────────┐
│  [프로필]  [독서 기록]  [다이렉트 메시지]           │
└─────────────────────────────────────────────────┘
```

### 푸터 (모든 페이지)

```
┌─────────────────────────────────────────────────┐
│  [개인정보처리방침]  |  [이용약관]  |  [문의하기]   │
│  © 2025 Philip & Sophy. All rights reserved.  │
└─────────────────────────────────────────────────┘
```

## 5. 페이지 계층 구조

```
Depth 1: 랜딩페이지 (/)
Depth 1: 멤버 영역 (/app)
  Depth 2: 접근 코드 입력 (/app)
  Depth 2: 채팅방 (/app/chat)
    Depth 3: Today's Library (/app/chat/today-library)
  Depth 2: 프로필 (/app/profile/[id])
  Depth 2: 프로그램 소개 (/app/program)
Depth 1: 법적 페이지 (/*.html)
Depth 1: 에러 페이지 (/404, /500)
```

## 6. 콘텐츠 구성

### 랜딩페이지 (/)

| 섹션 | 콘텐츠 요소 | 우선순위 |
|------|-------------|----------|
| 히어로 | 프로그램 타이틀, 서브 헤드라인, 멤버 입장 CTA | 높음 |
| 소개 | 필립앤소피 비전, 미션, 프로그램 차별점 | 높음 |
| 프로그램 설명 | 진행 방식, 일정, 혜택 | 중간 |
| 후기 | 지난 기수 참가자 후기 (이미지 + 텍스트) | 중간 |
| CTA | 카카오톡 문의 버튼, 멤버 입장 버튼 | 높음 |

### 접근 코드 입력 (/app)

| 섹션 | 콘텐츠 요소 | 우선순위 |
|------|-------------|----------|
| 헤더 | 프로그램명, 기수 정보 | 중간 |
| 메인 | 4자리 코드 입력 필드 (4개 칸), 입장 버튼 | 높음 |
| 안내 | 코드 입력 가이드 텍스트, 오류 메시지 | 중간 |

### 공지사항 및 채팅 (/app/chat)

| 섹션 | 콘텐츠 요소 | 우선순위 |
|------|-------------|----------|
| 헤더 | 기수명, 알림 아이콘, 프로필 아이콘 | 높음 |
| 공지 목록 | 공지 카드 (시간 순), 텍스트, 이미지, 링크 | 높음 |
| CTA 영역 | 독서 인증하기 버튼, Today's Library 링크 | 높음 |
| 하단 탭 | 공지사항, Today's Library, 프로필북, 설정 | 중간 |

### Today's Library (/app/chat/today-library)

| 섹션 | 콘텐츠 요소 | 우선순위 |
|------|-------------|----------|
| 헤더 | 날짜 표시, 뒤로가기 버튼 | 높음 |
| 카드 그리드 | 독서 인증 카드 (이미지, 이름, 리뷰 미리보기) | 높음 |
| 모달 | 카드 클릭 시 상세 보기 (전체 이미지, 전체 리뷰) | 중간 |

### 참가자 프로필 (/app/profile/[id])

| 섹션 | 콘텐츠 요소 | 우선순위 |
|------|-------------|----------|
| 헤더 | 프로필 사진, 이름, 닉네임 | 높음 |
| 기본 정보 | MBTI, 자기소개, 관심사 | 높음 |
| 독서 정보 | 좋아하는 장르/작가/책, 최근 읽은 책 | 중간 |
| 독서 기록 | 독서 인증 이력 (타임라인) | 중간 |
| CTA | 다이렉트 메시지 버튼, 공유 버튼 | 높음 |

### 프로그램 소개 (/app/program)

| 섹션 | 콘텐츠 요소 | 우선순위 |
|------|-------------|----------|
| 프로그램 개요 | 비전, 미션, 목표 | 높음 |
| 진행 방식 | 일정, 활동 내용, 혜택 | 높음 |
| FAQ | 자주 묻는 질문 | 중간 |

## 7. 인터랙션 패턴

### 코드 입력 패턴
- **4개 독립 입력 칸**: 각 칸에 1자리씩 입력
- **자동 포커스 이동**: 한 칸 입력 완료 시 다음 칸으로
- **백스페이스 처리**: 빈 칸에서 백스페이스 시 이전 칸으로
- **실시간 검증**: 4자리 모두 입력 시 서버 검증
- **오류 표시**: 잘못된 코드 입력 시 전체 필드 빨간색 테두리 + 오류 메시지

### 공지사항 표시 패턴
- **카드 레이아웃**: 각 공지를 독립된 카드로 표시
- **시간 순 정렬**: 최신 공지가 하단 (채팅 UX)
- **자동 스크롤**: 페이지 로드 시 최신 공지로 자동 스크롤
- **이미지 미리보기**: 클릭 시 전체 화면 모달
- **링크 처리**: 외부 링크는 새 탭에서 열기

### 독서 인증 패턴
- **다이얼로그 폼**: 버튼 클릭 시 모달 오픈
- **드래그 앤 드롭**: 이미지 파일 드래그하여 업로드
- **이미지 미리보기**: 업로드 전 미리보기 제공
- **한줄 리뷰**: 최대 200자 제한, 실시간 글자 수 표시
- **제출 완료**: 성공 시 토스트 메시지 + Today's Library로 자동 이동

### 프로필 탐색 패턴
- **카드 그리드**: 참가자 프로필 카드 그리드 레이아웃
- **호버 효과**: 카드 호버 시 그림자 + 약간 확대
- **클릭 액션**: 카드 클릭 시 상세 프로필 페이지로 이동
- **다이렉트 메시지**: 프로필 내 버튼 클릭 시 메시지 다이얼로그

### 애니메이션 패턴
- **페이지 전환**: Fade-in (duration-normal, ease-smooth)
- **카드 등장**: Slide-up + Fade-in (stagger 0.1s)
- **버튼 호버**: Scale 1.05 (duration-fast)
- **모달 오픈**: Scale 0.95 → 1.0 + Fade-in
- **스켈레톤 로딩**: Pulse 애니메이션

## 8. URL 구조

### URL 규칙
- 소문자 사용
- 하이픈(-) 구분자 (not 언더스코어)
- RESTful 패턴 준수
- 동적 파라미터는 대괄호 표기 [id]

### URL 매핑

```
# 공개 영역
GET  /                               # 랜딩페이지
GET  /privacy-policy.html            # 개인정보처리방침
GET  /terms-of-service.html          # 이용약관

# 멤버 영역
GET  /app                            # 접근 코드 입력
GET  /app/chat                       # 공지사항 채팅
GET  /app/chat/today-library         # 오늘의 서재
GET  /app/profile/[participantId]    # 참가자 프로필
GET  /app/program                    # 프로그램 소개

# Legacy 리다이렉트 (301)
GET  /member10                       → /app
GET  /chat                           → /app/chat
GET  /profile/*                      → /app/profile/*
GET  /program                        → /app/program

# 에러 페이지
GET  /404                            # Not Found
GET  /500                            # Server Error
```

### 쿼리 파라미터

```
# 공지 하이라이트
/app/chat?highlight=[noticeId]

# 프로필 필터링 (향후)
/app/profile?filter=recent&sort=name

# Today's Library 날짜 (향후)
/app/chat/today-library?date=2025-10-07
```

## 9. 컴포넌트 계층 구조

### 글로벌 컴포넌트 (모든 페이지 공통)

```
App
├── Layout
│   ├── Header (조건부: 멤버 영역에만 표시)
│   ├── Main (페이지 컨텐츠)
│   └── Footer
├── Providers
│   ├── ReactQueryProvider
│   ├── ThemeProvider
│   └── ToastProvider
└── GlobalModals
    ├── Toast
    └── ConfirmDialog
```

### 랜딩페이지 컴포넌트

```
LandingPage
├── HeroSection
│   ├── Title
│   ├── Subtitle
│   └── CTAButton
├── IntroSection
│   ├── Vision
│   └── Mission
├── ProgramSection
│   └── FeatureCards[]
├── TestimonialSection
│   └── TestimonialCards[]
└── CTASection
    ├── KakaoButton
    └── MemberEnterButton
```

### 접근 코드 입력 페이지 컴포넌트

```
AccessCodePage
└── CodeInputCard
    ├── CodeInputFields[4]
    ├── EnterButton
    └── ErrorMessage
```

### 채팅방 페이지 컴포넌트

```
ChatPage
├── ChatHeader
│   ├── CohortName
│   ├── NotificationIcon
│   └── ProfileIcon
├── NoticeList
│   └── NoticeCard[]
│       ├── NoticeContent
│       ├── NoticeImages[]
│       └── NoticeLinks[]
├── CTASection
│   ├── ReadingCertButton
│   └── TodaysLibraryLink
└── BottomTabs
    ├── NoticesTab
    ├── LibraryTab
    ├── ProfileTab
    └── SettingsTab
```

### Today's Library 페이지 컴포넌트

```
TodaysLibraryPage
├── LibraryHeader
│   ├── DateDisplay
│   └── BackButton
├── CertificationGrid
│   └── CertificationCard[]
│       ├── UserAvatar
│       ├── UserName
│       ├── BookImage
│       └── ReviewPreview
└── CertificationModal (조건부)
    ├── FullBookImage
    ├── FullReview
    └── ProfileLink
```

### 참가자 프로필 페이지 컴포넌트

```
ProfilePage
├── ProfileHeader
│   ├── Avatar
│   ├── Name
│   └── Nickname
├── ProfileTabs
│   ├── InfoTab
│   │   ├── MBTI
│   │   ├── Bio
│   │   ├── Interests
│   │   └── FavoriteBooks
│   ├── ReadingHistoryTab
│   │   └── CertificationTimeline[]
│   └── MessageTab
│       └── DirectMessageList[]
└── CTAButtons
    ├── SendMessageButton
    └── ShareButton
```

### 공통 UI 컴포넌트

```
UI Components (Shadcn UI)
├── Button (Primary, Secondary, Ghost, Outline)
├── Input
├── Textarea
├── Card
├── Badge
├── Avatar
├── Dialog (Modal)
├── Toast
├── Skeleton
├── Tabs
└── ScrollArea
```

## 10. 데이터 플로우

### 접근 코드 인증 플로우

```
User Input (4자리 코드)
  ↓
LocalStorage 체크 (기존 세션 확인)
  ↓
Firestore Query (cohorts collection)
  ↓
코드 검증 (accessCode 일치 여부)
  ↓
세션 저장 (LocalStorage)
  ↓
Redirect (/app/chat)
```

### 공지사항 로딩 플로우

```
Page Load (/app/chat)
  ↓
React Query (useNotices hook)
  ↓
Firestore Query (notices collection, cohortId 필터)
  ↓
realtime listener (onSnapshot)
  ↓
State Update (자동 리렌더링)
  ↓
Auto Scroll (최신 공지)
```

### 독서 인증 제출 플로우

```
User 독서 인증 버튼 클릭
  ↓
Dialog 오픈
  ↓
이미지 업로드 (Firebase Storage)
  ↓
Storage URL 받기
  ↓
Firestore 저장 (reading_submissions collection)
  ↓
Toast 알림 ("인증 완료!")
  ↓
Redirect (/app/chat/today-library)
```

### 프로필 조회 플로우

```
User 프로필 카드 클릭
  ↓
Navigate (/app/profile/[participantId])
  ↓
React Query (useParticipant hook)
  ↓
Firestore Query (participants collection)
  ↓
State Update
  ↓
Render 프로필 정보
```

## 11. 접근성 (Accessibility)

### WCAG 2.1 AA 준수

- **키보드 네비게이션**: Tab, Shift+Tab으로 모든 인터랙티브 요소 접근 가능
- **포커스 인디케이터**: 포커스된 요소에 명확한 outline 표시
- **색상 대비**: 텍스트와 배경 색상 대비 4.5:1 이상
- **대체 텍스트**: 모든 이미지에 alt 속성 제공
- **ARIA 레이블**: 버튼, 링크에 명확한 레이블
- **스크린 리더**: 시맨틱 HTML 태그 사용 (header, main, nav, footer)

### 반응형 디자인

```
Mobile First 접근
- 320px~: 모바일 (세로)
- 768px~: 태블릿
- 1024px~: 데스크톱
- 1440px~: 와이드 데스크톱
```

## 12. SEO 구조

### 메타 데이터 (모든 페이지)

```html
<meta name="description" content="필립앤소피 독서 소셜클럽" />
<meta property="og:title" content="필립앤소피 - 독서로 연결되는 사람들" />
<meta property="og:description" content="2주간의 특별한 독서 여정" />
<meta property="og:image" content="/og-image.png" />
<meta name="twitter:card" content="summary_large_image" />
```

### Sitemap.xml

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://philipandsophy.com/</loc>
    <lastmod>2025-10-07</lastmod>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://philipandsophy.com/app</loc>
    <priority>0.8</priority>
  </url>
</urlset>
```

### Robots.txt

```
User-agent: *
Allow: /
Disallow: /app/profile/
Disallow: /app/chat/

Sitemap: https://philipandsophy.com/sitemap.xml
```

---

## 변경 이력

- **v1.0** (2025-01-01): 초기 IA 작성 (멤버 전용 단방향 채팅방)
- **v2.0** (2025-10-07): 실제 구현 반영 - 랜딩페이지, 프로필북, Today's Library, 라우트 구조 전면 수정, /admin 제거

---

본 IA는 현재 구현된 라우트 구조와 사용자 흐름을 정확히 반영하여 작성되었습니다.
