import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '로그인 | Data Center',
  description: '필립앤소피 데이터 분석 센터 로그인',
  robots: 'noindex, nofollow',
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 로그인 페이지는 사이드바 없이 전체 화면으로 표시
  return <>{children}</>;
}
