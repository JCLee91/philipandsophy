import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '필립앤소피 프로그램 안내',
  robots: {
    index: false, // 검색 엔진 색인 제외
    follow: true,
  },
  // OpenGraph와 Twitter Card 완전 제거 - 링크 미리보기 차단
};

export default function ProgramLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
