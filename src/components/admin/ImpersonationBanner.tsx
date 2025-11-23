'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, LogOut } from 'lucide-react';
import { signInWithCustomToken } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase/client';

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
      // 1. 저장된 관리자 토큰 확인
      const adminToken = sessionStorage.getItem('pns_admin_token');
      const returnUrl = sessionStorage.getItem('pns_impersonation_return_url') || '/datacntr/participants';
      const auth = getFirebaseAuth();

      if (adminToken) {
        try {
          // 2. 관리자 토큰으로 재로그인 시도
          await signInWithCustomToken(auth, adminToken);
          
          // 3. 성공 시 스토리지 정리 및 이동
          sessionStorage.removeItem('pns_admin_impersonation');
          sessionStorage.removeItem('pns_admin_token');
          sessionStorage.removeItem('pns_impersonation_return_url');
          
          // 원래 진입했던 경로(데이터센터 or 앱)로 복귀
          router.replace(returnUrl);
          return;
        } catch (loginError) {
          console.error('Admin token login failed:', loginError);
          // 토큰 만료 등으로 실패 시 아래 로그아웃 로직으로 진행
        }
      }

      // 4. 토큰 없거나 실패 시 일반 로그아웃
      await logout();
      sessionStorage.removeItem('pns_admin_impersonation');
      sessionStorage.removeItem('pns_admin_token');
      sessionStorage.removeItem('pns_impersonation_return_url');
      
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
        관리자로 복귀
      </button>
    </div>
  );
}
