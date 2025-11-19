import type { Metadata, Viewport } from 'next';
import DataCenterLayout from '@/components/datacntr/DataCenterLayout';
import { AuthProvider } from '@/contexts/AuthContext';

// 데이터센터: 흰색으로 오버라이드
export const viewport: Viewport = {
  themeColor: '#ffffff',
};

export const metadata: Metadata = {
  title: 'Data Center | 필립앤소피',
  description: '필립앤소피 데이터 분석 센터',
  robots: 'noindex, nofollow', // 검색 엔진 차단
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DataCenterLayout>{children}</DataCenterLayout>
    </AuthProvider>
  );
}
