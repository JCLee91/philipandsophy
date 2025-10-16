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
      </aside>
    </>
  );
}
