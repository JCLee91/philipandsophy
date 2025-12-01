'use client';

import { useAuth } from '@/contexts/AuthContext';
import { LogOut } from 'lucide-react';

export default function DataCenterHeader() {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/datacntr/login';
    } catch (error) {
      // 에러 처리
    }
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-end">
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-semibold text-gray-900">{user?.email || '관리자'}</p>
          <p className="text-xs text-gray-500">관리자</p>
        </div>
        <button
          type="button"
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
