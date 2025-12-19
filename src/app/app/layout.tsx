import type { Metadata, Viewport } from 'next';
import AppClientProviders from '@/components/AppClientProviders';

// 웹앱 전용: 흰색으로 오버라이드
export const viewport: Viewport = {
  themeColor: '#ffffff',
};

// Metadata는 서버 컴포넌트에서만 사용 가능
export const metadata: Metadata = {
  title: '필립앤소피 | 승인제 소셜클럽',
  description: '깊이 있는 대화가 설레는 만남으로',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
    noimageindex: true,
  },
};

export default function Member10Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppClientProviders>{children}</AppClientProviders>;
}
