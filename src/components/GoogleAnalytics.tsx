'use client';

import { usePathname } from 'next/navigation';
import { GoogleAnalytics as GA } from '@next/third-parties/google';

const GA_ID = 'G-EKZ9VRV269';

// GA를 적용할 페이지 (랜딩 + 전환 관련)
const ALLOWED_PATHS = [
  '/',           // 메인 랜딩
  '/application', // 신청 폼
  '/pricing',    // 가격
  '/programs',   // 프로그램 소개
  '/reviews',    // 후기
];

function isAllowedPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return ALLOWED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

export default function GoogleAnalytics() {
  const pathname = usePathname();
  const shouldTrack = isAllowedPath(pathname);

  if (!shouldTrack) return null;

  return <GA gaId={GA_ID} />;
}
