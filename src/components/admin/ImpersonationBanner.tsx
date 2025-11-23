'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ImpersonationBanner() {
  const { user, participant, logout } = useAuth();
  const router = useRouter();
  const [isImpersonating, setIsImpersonating] = useState(false);

  useEffect(() => {
    // 세션 스토리지 확인
    const impersonationFlag = sessionStorage.getItem('pns_admin_impersonation');
    if (impersonationFlag === 'true' && user) {
      setIsImpersonating(true);
    } else {
      setIsImpersonating(false);
    }
  }, [user]);

  const handleExit = async () => {
    try {
      // 로그아웃 처리
      await logout();
      
      // 세션 스토리지 클리어
      sessionStorage.removeItem('pns_admin_impersonation');
      
      // 관리자 로그인 페이지로 이동
      router.replace('/datacntr/login');
    } catch (error) {
      console.error('Failed to exit impersonation:', error);
    }
  };

  if (!isImpersonating) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-amber-500 text-white px-4 py-2 shadow-md flex items-center justify-between animate-in slide-in-from-top duration-300">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Eye className="h-5 w-5" />
        <span>
          현재 <strong>{participant?.name || user?.email || '사용자'}</strong> 님으로 로그인되어 있습니다. (관리자 모드)
        </span>
      </div>
      <button
        onClick={handleExit}
        className="flex items-center gap-1 bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-md text-sm font-bold transition-colors border border-white/30"
      >
        <LogOut className="h-4 w-4" />
        관리자로 복귀 (로그아웃)
      </button>
    </div>
  );
}

