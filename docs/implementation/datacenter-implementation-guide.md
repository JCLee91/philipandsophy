# Data Center 구현 가이드

**버전**: 1.0.0
**최종 업데이트**: 2025-10-14
**예상 기간**: 7-11일 (집중 개발 시)

---

## 📋 목차

1. [프로젝트 개요](#프로젝트-개요)
2. [Phase 1: 기반 구조](#phase-1-기반-구조-1-2일)
3. [Phase 2: 개요 대시보드](#phase-2-개요-대시보드-2-3일)
4. [Phase 3: 데이터 관리 페이지](#phase-3-데이터-관리-페이지-3-4일)
5. [Phase 4: 메시지 & 설정](#phase-4-메시지--설정-1-2일)
6. [테스트 체크리스트](#테스트-체크리스트)
7. [배포 전 최종 점검](#배포-전-최종-점검)

---

## 프로젝트 개요

### 목적
관리자용 데이터 분석 센터 구축 - 모든 코호트, 참가자, 인증 내역을 한 곳에서 조회

### 라우팅 구조
```
/datacntr                   # 개요 대시보드
/datacntr/cohorts          # 코호트 목록
/datacntr/cohorts/[id]     # 코호트 상세
/datacntr/participants     # 참가자 관리
/datacntr/submissions      # 독서 인증 관리
/datacntr/notices          # 공지사항 분석
/datacntr/messages         # 메시지 분석
/datacntr/settings         # 시스템 설정
```

### 권한
- `isAdmin` 또는 `isAdministrator` 필드가 true인 사용자만 접근 가능
- 비관리자는 `/app`으로 자동 리다이렉트

### 기술 스택
- Next.js 15 App Router
- React Query (데이터 페칭)
- Recharts (차트)
- Firebase Firestore (데이터베이스)
- Tailwind CSS (스타일링)

---

## Phase 1: 기반 구조 (1-2일)

### 목표
✅ Data Center 독립 레이아웃 및 라우팅 설정
✅ 권한 체크 시스템 구축
✅ 사이드바 네비게이션 구현

---

### 📝 작업 1.1: 디렉토리 구조 생성

**체크리스트**:
- [ ] `src/app/datacntr/` 디렉토리 생성
- [ ] `src/components/datacntr/` 디렉토리 생성
- [ ] `src/hooks/datacntr/` 디렉토리 생성
- [ ] `src/lib/datacntr/` 디렉토리 생성
- [ ] `src/types/datacntr.ts` 파일 생성

**명령어**:
```bash
mkdir -p src/app/datacntr
mkdir -p src/components/datacntr
mkdir -p src/hooks/datacntr
mkdir -p src/lib/datacntr
touch src/types/datacntr.ts
```

---

### 📝 작업 1.2: 타입 정의 생성

**파일**: `src/types/datacntr.ts`

**내용**:
```typescript
/**
 * Data Center 타입 정의
 */

// 통계 메트릭
export interface OverviewStats {
  totalCohorts: number;
  totalParticipants: number;
  todaySubmissions: number;
  totalSubmissions: number;
  totalNotices: number;
  totalMessages: number;
}

// 활동 지표 (일별)
export interface DailyActivity {
  date: string; // YYYY-MM-DD
  submissions: number;
  newParticipants: number;
  messages: number;
}

// 코호트 통계
export interface CohortStats {
  id: string;
  name: string;
  participantCount: number;
  submissionCount: number;
  averageSubmissionRate: number; // 0-100
  matchingCount: number;
  isActive: boolean;
  startDate: string;
  endDate: string;
}

// 참가자 데이터 (테이블용)
export interface ParticipantRowData {
  id: string;
  name: string;
  cohortName: string;
  phoneNumber: string;
  gender?: 'male' | 'female' | 'other';
  joinedAt: string;
  lastActivityAt: string;
  submissionCount: number;
  currentBookTitle?: string;
  isActive: boolean; // 세션 활성 여부
}

// 인증 데이터 (카드용)
export interface SubmissionCardData {
  id: string;
  participantId: string;
  participantName: string;
  participantImage?: string;
  bookTitle: string;
  bookAuthor?: string;
  bookCoverUrl?: string;
  bookImageUrl: string; // 인증 사진
  review: string;
  dailyQuestion: string;
  dailyAnswer: string;
  submittedAt: string;
  submissionDate: string;
}

// 페이지네이션 응답
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// 필터 옵션
export interface ParticipantFilter {
  cohortId?: string;
  gender?: 'male' | 'female' | 'other';
  submissionRateRange?: '0-25' | '25-50' | '50-75' | '75-100';
  isActive?: boolean;
  search?: string; // 이름 또는 전화번호
}

export interface SubmissionFilter {
  cohortId?: string;
  participantId?: string;
  startDate?: string;
  endDate?: string;
}

// CSV 내보내기 요청
export interface ExportRequest {
  type: 'participants' | 'submissions';
  filter?: ParticipantFilter | SubmissionFilter;
}
```

**체크리스트**:
- [ ] 타입 파일 생성 완료
- [ ] 모든 인터페이스 정의 확인
- [ ] TypeScript 컴파일 에러 없음

---

### 📝 작업 1.3: 권한 체크 훅 생성

**파일**: `src/hooks/datacntr/use-datacntr-auth.ts`

**내용**:
```typescript
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/use-session';
import { useToast } from '@/hooks/use-toast';

/**
 * Data Center 권한 체크 훅
 *
 * 관리자만 접근 가능하며, 비관리자는 /app으로 리다이렉트
 */
export function useDataCenterAuth() {
  const router = useRouter();
  const { currentUser, isLoading, sessionToken } = useSession();
  const { toast } = useToast();

  const isAdmin = currentUser?.isAdmin === true || currentUser?.isAdministrator === true;

  useEffect(() => {
    if (!isLoading) {
      // 세션이 없으면 로그인 페이지로
      if (!currentUser || !sessionToken) {
        toast({
          title: '로그인 필요',
          description: '데이터 센터는 관리자만 접근할 수 있습니다.',
          variant: 'destructive',
        });
        router.replace('/app');
        return;
      }

      // 관리자가 아니면 웹앱으로
      if (!isAdmin) {
        toast({
          title: '접근 권한 없음',
          description: '데이터 센터는 관리자만 접근할 수 있습니다.',
          variant: 'destructive',
        });
        router.replace('/app');
        return;
      }
    }
  }, [isLoading, currentUser, sessionToken, isAdmin, router, toast]);

  return {
    isLoading,
    isAdmin,
    currentUser,
    sessionToken,
  };
}
```

**체크리스트**:
- [ ] 훅 파일 생성 완료
- [ ] useSession 훅 import 확인
- [ ] 리다이렉트 로직 테스트

---

### 📝 작업 1.4: Data Center 레이아웃 컴포넌트

**파일 1**: `src/components/datacntr/DataCenterSidebar.tsx`

**내용**:
```typescript
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  MessageSquare,
  Bell,
  Settings,
  FolderKanban,
  ArrowLeft,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    href: '/datacntr',
    label: '개요',
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    href: '/datacntr/cohorts',
    label: '코호트 관리',
    icon: <FolderKanban className="h-5 w-5" />,
  },
  {
    href: '/datacntr/participants',
    label: '참가자 관리',
    icon: <Users className="h-5 w-5" />,
  },
  {
    href: '/datacntr/submissions',
    label: '독서 인증',
    icon: <BookOpen className="h-5 w-5" />,
  },
  {
    href: '/datacntr/notices',
    label: '공지사항',
    icon: <Bell className="h-5 w-5" />,
  },
  {
    href: '/datacntr/messages',
    label: '메시지',
    icon: <MessageSquare className="h-5 w-5" />,
  },
  {
    href: '/datacntr/settings',
    label: '설정',
    icon: <Settings className="h-5 w-5" />,
  },
];

export default function DataCenterSidebar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/datacntr') {
      return pathname === '/datacntr';
    }
    return pathname?.startsWith(href);
  };

  return (
    <>
      {/* 모바일 햄버거 버튼 */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-white rounded-lg p-2 shadow-lg"
      >
        {isMobileMenuOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <Menu className="h-6 w-6" />
        )}
      </button>

      {/* 오버레이 (모바일) */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* 사이드바 */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-screen bg-white border-r border-gray-200 z-40 transition-transform duration-300",
          "w-[240px]",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* 헤더 */}
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <h1 className="text-lg font-bold text-gray-900">📊 Data Center</h1>
        </div>

        {/* 네비게이션 */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                isActive(item.href)
                  ? "bg-blue-50 text-blue-600 font-semibold"
                  : "text-gray-700 hover:bg-gray-50"
              )}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* 하단: 웹앱으로 돌아가기 */}
        <div className="p-4 border-t border-gray-200">
          <Link
            href="/app/chat"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>웹앱으로 돌아가기</span>
          </Link>
        </div>
      </aside>
    </>
  );
}
```

**파일 2**: `src/components/datacntr/DataCenterHeader.tsx`

**내용**:
```typescript
'use client';

import { useSession } from '@/hooks/use-session';
import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function DataCenterHeader() {
  const { currentUser, clearSession } = useSession();
  const router = useRouter();

  const handleLogout = () => {
    clearSession();
    router.push('/app');
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-bold text-gray-900">Data Center</h2>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-semibold text-gray-900">{currentUser?.name}</p>
          <p className="text-xs text-gray-500">관리자</p>
        </div>
        <button
          onClick={handleLogout}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          title="로그아웃"
        >
          <LogOut className="h-5 w-5 text-gray-600" />
        </button>
      </div>
    </header>
  );
}
```

**파일 3**: `src/components/datacntr/DataCenterLayout.tsx`

**내용**:
```typescript
'use client';

import { ReactNode } from 'react';
import DataCenterSidebar from './DataCenterSidebar';
import DataCenterHeader from './DataCenterHeader';

interface DataCenterLayoutProps {
  children: ReactNode;
}

export default function DataCenterLayout({ children }: DataCenterLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* 사이드바 */}
      <DataCenterSidebar />

      {/* 메인 콘텐츠 영역 */}
      <div className="flex-1 flex flex-col lg:ml-[240px]">
        {/* 헤더 */}
        <DataCenterHeader />

        {/* 메인 콘텐츠 */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
}
```

**체크리스트**:
- [ ] 3개 컴포넌트 파일 생성 완료
- [ ] 사이드바 네비게이션 동작 확인
- [ ] 모바일 햄버거 메뉴 동작 확인
- [ ] 헤더 로그아웃 버튼 동작 확인

---

### 📝 작업 1.5: Data Center 루트 레이아웃 & 페이지

**파일 1**: `src/app/datacntr/layout.tsx`

**내용**:
```typescript
import type { Metadata } from 'next';
import DataCenterLayout from '@/components/datacntr/DataCenterLayout';

export const metadata: Metadata = {
  title: 'Data Center | 필립앤소피',
  description: '필립앤소피 데이터 분석 센터',
  robots: 'noindex, nofollow', // 검색 엔진 차단
};

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DataCenterLayout>{children}</DataCenterLayout>;
}
```

**파일 2**: `src/app/datacntr/page.tsx`

**내용**:
```typescript
'use client';

import { useDataCenterAuth } from '@/hooks/datacntr/use-datacntr-auth';
import { Loader2 } from 'lucide-react';

export default function DataCenterPage() {
  const { isLoading, isAdmin } = useDataCenterAuth();

  // 권한 체크 중
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // 관리자가 아니면 리다이렉트됨 (useDataCenterAuth에서 처리)
  if (!isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">개요 대시보드</h1>
        <p className="text-gray-600 mt-2">전체 서비스 현황을 한눈에 확인하세요</p>
      </div>

      {/* TODO: Phase 2에서 통계 컴포넌트 추가 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600">Phase 2에서 구현 예정</p>
          <h3 className="text-2xl font-bold text-gray-900 mt-2">통계 카드</h3>
        </div>
      </div>
    </div>
  );
}
```

**체크리스트**:
- [ ] 레이아웃 파일 생성 완료
- [ ] 루트 페이지 생성 완료
- [ ] `/datacntr` 접속 시 페이지 표시 확인
- [ ] 권한 체크 동작 확인

---

### 📝 작업 1.6: 웹앱에서 Data Center 진입 버튼 추가

**파일**: `src/app/app/chat/page.tsx`

**수정 내용**:
채팅 페이지의 헤더 또는 하단에 관리자 전용 버튼 추가

```typescript
// 기존 import에 추가
import Link from 'next/link';

// 컴포넌트 내부 (관리자 체크 후)
{(currentUser?.isAdmin || currentUser?.isAdministrator) && (
  <div className="p-4 border-t border-gray-200">
    <Link href="/datacntr">
      <button className="w-full bg-blue-600 text-white rounded-lg px-4 py-3 font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
        📊 데이터 센터
      </button>
    </Link>
  </div>
)}
```

**체크리스트**:
- [ ] 채팅 페이지에 버튼 추가 완료
- [ ] 관리자만 버튼 표시 확인
- [ ] 버튼 클릭 시 `/datacntr` 이동 확인

---

### ✅ Phase 1 완료 기준

**필수 체크리스트**:
- [ ] `/datacntr` 접속 시 독립된 레이아웃 표시
- [ ] 사이드바 네비게이션 8개 메뉴 표시
- [ ] 모바일 햨버거 메뉴 동작
- [ ] 비관리자 접근 시 `/app`으로 리다이렉트
- [ ] 웹앱에서 데이터 센터 진입 버튼 동작
- [ ] 헤더 로그아웃 버튼 동작
- [ ] TypeScript 컴파일 에러 없음
- [ ] 콘솔 에러 없음

**테스트**:
```bash
# 개발 서버 실행
npm run dev

# 테스트 시나리오
1. 비관리자 계정으로 /datacntr 접속 → /app으로 리다이렉트 확인
2. 관리자 계정으로 로그인 → 채팅 페이지에 "데이터 센터" 버튼 표시 확인
3. "데이터 센터" 버튼 클릭 → /datacntr 이동 확인
4. 사이드바 메뉴 클릭 → 각 페이지 이동 확인 (아직 404 정상)
5. "웹앱으로 돌아가기" 클릭 → /app/chat 이동 확인
6. 모바일 화면에서 햄버거 메뉴 동작 확인
```

---

## Phase 2: 개요 대시보드 (2-3일)

### 목표
✅ 전체 통계 메트릭 6개 표시
✅ 7일 활동 추이 그래프 구현
✅ 최근 활동 목록 표시
✅ 주요 알림 패널

---

### 📝 작업 2.1: Recharts 설치

**명령어**:
```bash
npm install recharts
```

**체크리스트**:
- [ ] recharts 설치 완료
- [ ] package.json에 추가 확인

---

### 📝 작업 2.2: 통계 API 라우트 생성

**파일 1**: `src/app/api/datacntr/stats/overview/route.ts`

**내용**:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/api-auth';
import { getDb } from '@/lib/firebase';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { COLLECTIONS } from '@/types/database';
import type { OverviewStats } from '@/types/datacntr';

export async function GET(request: NextRequest) {
  try {
    // 권한 체크
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '인증 토큰이 필요합니다' },
        { status: 401 }
      );
    }

    const sessionToken = authHeader.substring(7);
    const user = await verifySessionToken(sessionToken);

    if (!user || (!user.isAdmin && !user.isAdministrator)) {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다' },
        { status: 403 }
      );
    }

    const db = getDb();

    // 오늘 날짜 (KST)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = Timestamp.fromDate(today);

    // 병렬로 통계 조회
    const [cohortsSnapshot, participantsSnapshot, submissionsSnapshot, todaySubmissionsSnapshot, noticesSnapshot, messagesSnapshot] = await Promise.all([
      getDocs(collection(db, COLLECTIONS.COHORTS)),
      getDocs(collection(db, COLLECTIONS.PARTICIPANTS)),
      getDocs(collection(db, COLLECTIONS.READING_SUBMISSIONS)),
      getDocs(query(collection(db, COLLECTIONS.READING_SUBMISSIONS), where('submittedAt', '>=', todayTimestamp))),
      getDocs(collection(db, COLLECTIONS.NOTICES)),
      getDocs(collection(db, COLLECTIONS.MESSAGES)),
    ]);

    const stats: OverviewStats = {
      totalCohorts: cohortsSnapshot.size,
      totalParticipants: participantsSnapshot.size,
      todaySubmissions: todaySubmissionsSnapshot.size,
      totalSubmissions: submissionsSnapshot.size,
      totalNotices: noticesSnapshot.size,
      totalMessages: messagesSnapshot.size,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('통계 조회 실패:', error);
    return NextResponse.json(
      { error: '통계 조회 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
```

**파일 2**: `src/app/api/datacntr/stats/activity/route.ts`

**내용**:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/api-auth';
import { getDb } from '@/lib/firebase';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { COLLECTIONS } from '@/types/database';
import { format, subDays } from 'date-fns';
import type { DailyActivity } from '@/types/datacntr';

export async function GET(request: NextRequest) {
  try {
    // 권한 체크
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '인증 토큰이 필요합니다' },
        { status: 401 }
      );
    }

    const sessionToken = authHeader.substring(7);
    const user = await verifySessionToken(sessionToken);

    if (!user || (!user.isAdmin && !user.isAdministrator)) {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다' },
        { status: 403 }
      );
    }

    // days 파라미터 (기본 7일)
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '7', 10);

    const db = getDb();
    const now = new Date();

    // 지난 N일 데이터 조회
    const startDate = subDays(now, days);
    startDate.setHours(0, 0, 0, 0);
    const startTimestamp = Timestamp.fromDate(startDate);

    // 독서 인증 & 참가자 조회
    const [submissionsSnapshot, participantsSnapshot, messagesSnapshot] = await Promise.all([
      getDocs(query(collection(db, COLLECTIONS.READING_SUBMISSIONS), where('submittedAt', '>=', startTimestamp))),
      getDocs(query(collection(db, COLLECTIONS.PARTICIPANTS), where('createdAt', '>=', startTimestamp))),
      getDocs(query(collection(db, COLLECTIONS.MESSAGES), where('createdAt', '>=', startTimestamp))),
    ]);

    // 날짜별로 그룹화
    const activityMap = new Map<string, DailyActivity>();

    // 날짜 초기화 (최근 N일)
    for (let i = 0; i < days; i++) {
      const date = subDays(now, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      activityMap.set(dateStr, {
        date: dateStr,
        submissions: 0,
        newParticipants: 0,
        messages: 0,
      });
    }

    // 독서 인증 집계
    submissionsSnapshot.forEach((doc) => {
      const data = doc.data();
      const date = format(data.submittedAt.toDate(), 'yyyy-MM-dd');
      const activity = activityMap.get(date);
      if (activity) {
        activity.submissions += 1;
      }
    });

    // 신규 참가자 집계
    participantsSnapshot.forEach((doc) => {
      const data = doc.data();
      const date = format(data.createdAt.toDate(), 'yyyy-MM-dd');
      const activity = activityMap.get(date);
      if (activity) {
        activity.newParticipants += 1;
      }
    });

    // 메시지 집계
    messagesSnapshot.forEach((doc) => {
      const data = doc.data();
      const date = format(data.createdAt.toDate(), 'yyyy-MM-dd');
      const activity = activityMap.get(date);
      if (activity) {
        activity.messages += 1;
      }
    });

    // 배열로 변환 (최신순 정렬)
    const activities = Array.from(activityMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json(activities);
  } catch (error) {
    console.error('활동 지표 조회 실패:', error);
    return NextResponse.json(
      { error: '활동 지표 조회 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
```

**체크리스트**:
- [ ] 2개 API 라우트 생성 완료
- [ ] 권한 체크 로직 확인
- [ ] Postman/Thunder Client로 API 테스트

---

### 📝 작업 2.3: 통계 훅 생성

**파일 1**: `src/hooks/datacntr/use-datacntr-stats.ts`

**내용**:
```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/hooks/use-session';
import type { OverviewStats } from '@/types/datacntr';

export function useDataCenterStats() {
  const { sessionToken } = useSession();

  return useQuery<OverviewStats>({
    queryKey: ['datacntr', 'stats', 'overview'],
    queryFn: async () => {
      const response = await fetch('/api/datacntr/stats/overview', {
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('통계 조회 실패');
      }

      return response.json();
    },
    enabled: !!sessionToken,
    staleTime: 5 * 60 * 1000, // 5분
    refetchInterval: 60 * 1000, // 1분마다 갱신
  });
}
```

**파일 2**: `src/hooks/datacntr/use-activity-chart.ts`

**내용**:
```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/hooks/use-session';
import type { DailyActivity } from '@/types/datacntr';

export function useActivityChart(days: number = 7) {
  const { sessionToken } = useSession();

  return useQuery<DailyActivity[]>({
    queryKey: ['datacntr', 'stats', 'activity', days],
    queryFn: async () => {
      const response = await fetch(`/api/datacntr/stats/activity?days=${days}`, {
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('활동 지표 조회 실패');
      }

      return response.json();
    },
    enabled: !!sessionToken,
    staleTime: 5 * 60 * 1000, // 5분
  });
}
```

**체크리스트**:
- [ ] 2개 훅 파일 생성 완료
- [ ] React Query 설정 확인
- [ ] TypeScript 타입 확인

---

### 📝 작업 2.4: 대시보드 컴포넌트 생성

**파일 1**: `src/components/datacntr/dashboard/MetricCard.tsx`

**내용**:
```typescript
'use client';

import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color?: 'blue' | 'green' | 'orange' | 'purple' | 'pink' | 'gray';
  isLoading?: boolean;
}

const colorClasses = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-green-50 text-green-600',
  orange: 'bg-orange-50 text-orange-600',
  purple: 'bg-purple-50 text-purple-600',
  pink: 'bg-pink-50 text-pink-600',
  gray: 'bg-gray-50 text-gray-600',
};

export default function MetricCard({
  title,
  value,
  icon: Icon,
  color = 'blue',
  isLoading,
}: MetricCardProps) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          {isLoading ? (
            <div className="h-8 w-24 shimmer rounded" />
          ) : (
            <p className="text-3xl font-bold text-gray-900">{value}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
```

**파일 2**: `src/components/datacntr/dashboard/ActivityChart.tsx`

**내용**:
```typescript
'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { DailyActivity } from '@/types/datacntr';

interface ActivityChartProps {
  data: DailyActivity[];
  isLoading?: boolean;
}

export default function ActivityChart({ data, isLoading }: ActivityChartProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="h-8 w-48 shimmer rounded mb-4" />
        <div className="h-[300px] shimmer rounded" />
      </div>
    );
  }

  // 날짜 포맷팅
  const formattedData = data.map((item) => ({
    ...item,
    dateLabel: format(parseISO(item.date), 'M/d', { locale: ko }),
  }));

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <h3 className="text-lg font-bold text-gray-900 mb-4">활동 추이 (최근 7일)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={formattedData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="dateLabel"
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: '12px' }}
          />
          <Line
            type="monotone"
            dataKey="submissions"
            stroke="#3b82f6"
            strokeWidth={2}
            name="독서 인증"
            dot={{ fill: '#3b82f6', r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="newParticipants"
            stroke="#10b981"
            strokeWidth={2}
            name="신규 참가자"
            dot={{ fill: '#10b981', r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="messages"
            stroke="#f59e0b"
            strokeWidth={2}
            name="메시지"
            dot={{ fill: '#f59e0b', r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

**체크리스트**:
- [ ] 2개 컴포넌트 생성 완료
- [ ] Recharts 그래프 렌더링 확인
- [ ] 반응형 동작 확인

---

### 📝 작업 2.5: 개요 페이지 업데이트

**파일**: `src/app/datacntr/page.tsx` (업데이트)

**내용**:
```typescript
'use client';

import { useDataCenterAuth } from '@/hooks/datacntr/use-datacntr-auth';
import { useDataCenterStats } from '@/hooks/datacntr/use-datacntr-stats';
import { useActivityChart } from '@/hooks/datacntr/use-activity-chart';
import MetricCard from '@/components/datacntr/dashboard/MetricCard';
import ActivityChart from '@/components/datacntr/dashboard/ActivityChart';
import { Loader2, Users, BookOpen, MessageSquare, Bell, FolderKanban, FileText } from 'lucide-react';

export default function DataCenterPage() {
  const { isLoading: authLoading, isAdmin } = useDataCenterAuth();
  const { data: stats, isLoading: statsLoading } = useDataCenterStats();
  const { data: activities, isLoading: activityLoading } = useActivityChart(7);

  // 권한 체크 중
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // 관리자가 아니면 리다이렉트됨
  if (!isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">개요 대시보드</h1>
        <p className="text-gray-600 mt-2">전체 서비스 현황을 한눈에 확인하세요</p>
      </div>

      {/* 통계 메트릭 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <MetricCard
          title="총 코호트"
          value={stats?.totalCohorts ?? 0}
          icon={FolderKanban}
          color="blue"
          isLoading={statsLoading}
        />
        <MetricCard
          title="총 참가자"
          value={stats?.totalParticipants ?? 0}
          icon={Users}
          color="green"
          isLoading={statsLoading}
        />
        <MetricCard
          title="오늘 인증"
          value={stats?.todaySubmissions ?? 0}
          icon={BookOpen}
          color="orange"
          isLoading={statsLoading}
        />
        <MetricCard
          title="전체 인증"
          value={stats?.totalSubmissions ?? 0}
          icon={FileText}
          color="purple"
          isLoading={statsLoading}
        />
        <MetricCard
          title="공지사항"
          value={stats?.totalNotices ?? 0}
          icon={Bell}
          color="pink"
          isLoading={statsLoading}
        />
        <MetricCard
          title="메시지"
          value={stats?.totalMessages ?? 0}
          icon={MessageSquare}
          color="gray"
          isLoading={statsLoading}
        />
      </div>

      {/* 활동 추이 그래프 */}
      <ActivityChart data={activities ?? []} isLoading={activityLoading} />
    </div>
  );
}
```

**체크리스트**:
- [ ] 개요 페이지 업데이트 완료
- [ ] 6개 메트릭 카드 표시 확인
- [ ] 활동 추이 그래프 표시 확인
- [ ] 로딩 상태 shimmer 확인

---

### ✅ Phase 2 완료 기준

**필수 체크리스트**:
- [ ] `/datacntr` 접속 시 6개 통계 카드 표시
- [ ] 각 카드에 실제 데이터 표시 (로딩 중 shimmer)
- [ ] 7일 활동 추이 그래프 표시
- [ ] 그래프에 3개 라인 (독서 인증, 신규 참가자, 메시지)
- [ ] API 응답 시간 2초 이내
- [ ] 모바일/데스크톱 반응형 확인
- [ ] TypeScript 컴파일 에러 없음
- [ ] 콘솔 에러 없음

**테스트**:
```bash
# 개발 서버 실행
npm run dev

# 테스트 시나리오
1. /datacntr 접속
2. 통계 카드 6개 표시 확인
3. 각 카드에 숫자 표시 확인
4. 활동 추이 그래프 표시 확인
5. 그래프 데이터 확인 (최근 7일)
6. 모바일 화면에서 카드 1열 정렬 확인
7. 1분 후 자동 갱신 확인
```

---

## Phase 3: 데이터 관리 페이지 (3-4일)

### 목표
✅ 코호트 목록 및 상세 페이지
✅ 참가자 관리 (테이블, 필터, 검색, CSV)
✅ 독서 인증 관리 (카드 리스트, 필터)

---

### 📝 작업 3.1: 공통 테이블 컴포넌트

**파일 1**: `src/components/datacntr/table/DataTable.tsx`

**내용**:
```typescript
'use client';

import { ReactNode } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

export type SortDirection = 'asc' | 'desc' | null;

export interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => ReactNode;
  sortable?: boolean;
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onSort?: (key: string, direction: SortDirection) => void;
  sortKey?: string;
  sortDirection?: SortDirection;
  isLoading?: boolean;
  emptyMessage?: string;
}

export default function DataTable<T extends { id: string }>({
  columns,
  data,
  onSort,
  sortKey,
  sortDirection,
  isLoading,
  emptyMessage = '데이터가 없습니다',
}: DataTableProps<T>) {
  const handleSort = (key: string, sortable?: boolean) => {
    if (!sortable || !onSort) return;

    const newDirection: SortDirection =
      sortKey === key
        ? sortDirection === 'asc'
          ? 'desc'
          : sortDirection === 'desc'
          ? null
          : 'asc'
        : 'asc';

    onSort(key, newDirection);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {columns.map((col, idx) => (
                  <th
                    key={idx}
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider"
                    style={{ width: col.width }}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {Array.from({ length: 5 }).map((_, idx) => (
                <tr key={idx}>
                  {columns.map((col, colIdx) => (
                    <td key={colIdx} className="px-6 py-4">
                      <div className="h-4 shimmer rounded w-full" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={`px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider ${
                    col.sortable ? 'cursor-pointer hover:bg-gray-100 select-none' : ''
                  }`}
                  style={{ width: col.width }}
                  onClick={() => handleSort(col.key as string, col.sortable)}
                >
                  <div className="flex items-center gap-2">
                    {col.header}
                    {col.sortable && (
                      <div className="flex flex-col">
                        <ChevronUp
                          className={`h-3 w-3 ${
                            sortKey === col.key && sortDirection === 'asc'
                              ? 'text-blue-600'
                              : 'text-gray-400'
                          }`}
                        />
                        <ChevronDown
                          className={`h-3 w-3 -mt-1 ${
                            sortKey === col.key && sortDirection === 'desc'
                              ? 'text-blue-600'
                              : 'text-gray-400'
                          }`}
                        />
                      </div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                {columns.map((col, idx) => (
                  <td key={idx} className="px-6 py-4 text-sm text-gray-900">
                    {col.render ? col.render(item) : String(item[col.key as keyof T] ?? '-')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

**파일 2**: `src/components/datacntr/table/TablePagination.tsx`

**내용**:
```typescript
'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  itemsPerPage: number;
}

export default function TablePagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
}: TablePaginationProps) {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-between">
      <div className="text-sm text-gray-600">
        {totalItems}개 중 {startItem}-{endItem}개 표시
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-1">
          {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((page) => {
            // 첫 페이지, 마지막 페이지, 현재 페이지 주변만 표시
            if (
              page === 1 ||
              page === totalPages ||
              (page >= currentPage - 1 && page <= currentPage + 1)
            ) {
              return (
                <button
                  key={page}
                  onClick={() => onPageChange(page)}
                  className={`px-3 py-2 rounded-lg transition-colors ${
                    page === currentPage
                      ? 'bg-blue-600 text-white'
                      : 'border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              );
            }

            // 생략 표시 (...)
            if (page === currentPage - 2 || page === currentPage + 2) {
              return (
                <span key={page} className="px-2 text-gray-400">
                  ...
                </span>
              );
            }

            return null;
          })}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
```

**체크리스트**:
- [ ] 2개 컴포넌트 생성 완료
- [ ] 정렬 기능 동작 확인
- [ ] 페이지네이션 동작 확인

---

### 📝 작업 3.2: 참가자 관리 페이지

이 작업은 문서가 너무 길어지므로 생략하고, 실제 구현 시 다음 단계로 진행합니다.

**참고**: Phase 3, 4는 유사한 패턴이므로, Phase 1-2 완료 후 이어서 진행하겠습니다.

---

## 테스트 체크리스트

### 기능 테스트
- [ ] 모든 페이지 접속 가능
- [ ] 비관리자 접근 차단
- [ ] 통계 데이터 정확성
- [ ] 필터/검색 동작
- [ ] 정렬 동작
- [ ] 페이지네이션 동작
- [ ] CSV 내보내기 동작

### UI/UX 테스트
- [ ] 모바일 반응형
- [ ] 태블릿 반응형
- [ ] 로딩 상태 표시
- [ ] 에러 상태 표시
- [ ] 빈 데이터 상태 표시

### 성능 테스트
- [ ] API 응답 시간 < 2초
- [ ] 페이지 로드 시간 < 3초
- [ ] 메모리 누수 없음
- [ ] 불필요한 리렌더링 없음

---

## 배포 전 최종 점검

### 코드 품질
- [ ] TypeScript 에러 없음: `npx tsc --noEmit`
- [ ] ESLint 에러 없음: `npm run lint`
- [ ] 콘솔 에러 없음
- [ ] 콘솔 경고 최소화

### 보안
- [ ] 모든 API에 권한 체크
- [ ] 세션 토큰 검증
- [ ] SQL Injection 방지
- [ ] XSS 방지

### SEO
- [ ] robots.txt에 /datacntr 차단 확인
- [ ] noindex, nofollow 메타태그 확인

### 문서화
- [ ] README.md 업데이트
- [ ] CLAUDE.md 업데이트
- [ ] API 문서 작성 (선택)

---

## 다음 단계

Phase 1 완료 후:
1. Phase 2 진행
2. Phase 3 진행
3. Phase 4 진행
4. 최종 테스트
5. 배포

---

**Last Updated**: 2025-10-14
