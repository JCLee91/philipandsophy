'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Bell,
  Settings,
  FolderKanban,
  Menu,
  X,
  Table,
  Send,
  TrendingDown,
  ChevronDown,
  Check,
  GraduationCap,
  BarChart3,
  UserCog,
  Megaphone,
  Cog,
  Trophy,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useDatacntrStore } from '@/stores/datacntr-store';
import type { Cohort } from '@/types/database';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

interface NavGroup {
  id: string;
  label: string;
  icon: React.ReactNode;
  items: NavItem[];
  requiresCohort: boolean;
}

// 그룹화된 네비게이션 구조
const navGroups: NavGroup[] = [
  {
    id: 'global',
    label: '전체 관리',
    icon: <Cog className="h-4 w-4" />,
    requiresCohort: false,
    items: [
      {
        href: '/datacntr/funnel',
        label: '퍼널 분석',
        icon: <TrendingDown className="h-5 w-5" />,
      },
      {
        href: '/datacntr/notifications',
        label: '커스텀 알림',
        icon: <Send className="h-5 w-5" />,
      },
      {
        href: '/datacntr/cohorts',
        label: '코호트 관리',
        icon: <FolderKanban className="h-5 w-5" />,
      },
    ],
  },
  {
    id: 'analytics',
    label: '분석',
    icon: <BarChart3 className="h-4 w-4" />,
    requiresCohort: true,
    items: [
      {
        href: '/datacntr',
        label: '개요',
        icon: <LayoutDashboard className="h-5 w-5" />,
      },
      {
        href: '/datacntr/board',
        label: '독서 인증 현황판',
        icon: <Table className="h-5 w-5" />,
      },
    ],
  },
  {
    id: 'management',
    label: '관리',
    icon: <UserCog className="h-4 w-4" />,
    requiresCohort: true,
    items: [
      {
        href: '/datacntr/participants',
        label: '참가자',
        icon: <Users className="h-5 w-5" />,
      },
      {
        href: '/datacntr/submissions',
        label: '독서 인증',
        icon: <BookOpen className="h-5 w-5" />,
      },
    ],
  },
  {
    id: 'operations',
    label: '운영',
    icon: <Megaphone className="h-4 w-4" />,
    requiresCohort: true,
    items: [
      {
        href: '/datacntr/notices',
        label: '공지사항',
        icon: <Bell className="h-5 w-5" />,
      },
      {
        href: '/datacntr/closing-party',
        label: '클로징 파티',
        icon: <Trophy className="h-5 w-5" />,
      },
    ],
  },
];

export default function DataCenterSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { selectedCohortId, setSelectedCohortId } = useDatacntrStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 기수 목록 로드
  useEffect(() => {
    if (!user) return;

    const fetchCohorts = async () => {
      try {
        const idToken = await user.getIdToken();
        const response = await fetch('/api/datacntr/cohorts', {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          const cohortList = Array.isArray(data) ? data : [];
          setCohorts(cohortList);

          // 코호트가 선택되지 않았으면 첫 번째 코호트를 기본 선택
          if (!selectedCohortId && cohortList.length > 0) {
            setSelectedCohortId(cohortList[0].id);
          }
        }
      } catch (error) {
        // 에러 처리
      }
    };

    fetchCohorts();
  }, [user, selectedCohortId, setSelectedCohortId]);

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectCohort = (cohortId: string) => {
    setSelectedCohortId(cohortId);
    setIsDropdownOpen(false);
  };

  const isActive = (href: string) => {
    if (href === '/datacntr') {
      return pathname === '/datacntr';
    }
    return pathname?.startsWith(href);
  };

  const selectedCohort = cohorts.find((c) => c.id === selectedCohortId);

  return (
    <>
      {/* 모바일 햄버거 버튼 */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-white rounded-lg p-2 shadow-lg border border-gray-200"
      >
        {isMobileMenuOpen ? (
          <X className="h-6 w-6 text-gray-700" />
        ) : (
          <Menu className="h-6 w-6 text-gray-700" />
        )}
      </button>

      {/* 오버레이 (모바일) */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* 사이드바 */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-screen bg-white border-r border-gray-200 z-40 transition-transform duration-300 flex flex-col",
          "w-[260px]",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* 헤더 */}
        <div className="h-16 flex items-center px-6 border-b border-gray-100 shrink-0 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold text-gray-900">Data Center</h1>
          </div>
        </div>

        {/* 네비게이션 */}
        <nav className="flex-1 overflow-y-auto">
          {/* 전체 관리 섹션 */}
          {navGroups.filter(g => !g.requiresCohort).map((group) => (
            <div key={group.id}>
              <div className="flex items-center gap-2 px-6 pt-3 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  {group.label}
                </span>
              </div>
              <div className="px-3 pb-2 space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 relative group",
                        active
                          ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                      )}
                    >
                      <span className={cn(
                        "transition-colors",
                        active ? "text-white" : "text-gray-400 group-hover:text-gray-600"
                      )}>
                        {item.icon}
                      </span>
                      <span className={cn(
                        "text-sm",
                        active ? "font-semibold" : "font-medium"
                      )}>
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          {/* 구분선 + 기수별 섹션 */}
          <div className="border-t border-gray-200 mt-2 bg-gray-50/50">
            {/* Context Switcher - 기수 선택 */}
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2 px-2 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  기수별 관리
                </span>
              </div>
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-900">
                      {selectedCohort?.name || '기수 선택'}
                    </span>
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-gray-400 transition-transform duration-150",
                      isDropdownOpen && "rotate-180"
                    )}
                  />
                </button>

                {/* 드롭다운 메뉴 */}
                {isDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 max-h-64 overflow-y-auto">
                    {cohorts.map((cohort) => (
                      <button
                        key={cohort.id}
                        type="button"
                        onClick={() => handleSelectCohort(cohort.id)}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2 text-left transition-colors",
                          selectedCohortId === cohort.id
                            ? "bg-gray-100"
                            : "hover:bg-gray-50"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-sm",
                            selectedCohortId === cohort.id
                              ? "font-medium text-gray-900"
                              : "text-gray-600"
                          )}>
                            {cohort.name}
                          </span>
                          {cohort.isActive && (
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          )}
                        </div>
                        {selectedCohortId === cohort.id && (
                          <Check className="h-4 w-4 text-gray-600" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 기수별 메뉴들 */}
            {navGroups.filter(g => g.requiresCohort).map((group) => (
              <div key={group.id}>
                <div className="flex items-center gap-2 px-6 pt-4 pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    {group.label}
                  </span>
                </div>
                <div className="px-3 pb-2 space-y-0.5">
                  {group.items.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 relative group",
                          active
                            ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                        )}
                      >
                        <span className={cn(
                          "transition-colors",
                          active ? "text-white" : "text-gray-400 group-hover:text-gray-600"
                        )}>
                          {item.icon}
                        </span>
                        <span className={cn(
                          "text-sm",
                          active ? "font-semibold" : "font-medium"
                        )}>
                          {item.label}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </nav>

        {/* 하단 설정 + 버전 정보 */}
        <div className="border-t border-gray-100 bg-gray-50/50 shrink-0">
          <div className="px-3 py-2">
            <Link
              href="/datacntr/settings"
              onClick={() => setIsMobileMenuOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150",
                isActive('/datacntr/settings')
                  ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <Settings className={cn(
                "h-5 w-5",
                isActive('/datacntr/settings') ? "text-white" : "text-gray-400"
              )} />
              <span className={cn(
                "text-sm",
                isActive('/datacntr/settings') ? "font-semibold" : "font-medium"
              )}>
                설정
              </span>
            </Link>
          </div>
          <div className="px-6 py-3">
            <p className="text-xs text-gray-400">
              Data Center v2.0
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
