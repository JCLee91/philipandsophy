import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '필립앤소피 멤버 포털',
  robots: {
    index: false, // 검색 엔진 색인 제외
    follow: false, // 링크 추적도 제외
  },
  // OpenGraph와 Twitter Card 완전 제거 - 링크 미리보기 차단
};

export default function Member10Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
