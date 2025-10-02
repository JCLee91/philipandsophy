import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Page',
  description: '',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
    noimageindex: true,
  },
  // 모든 SNS 미리보기 완전 차단
  openGraph: undefined,
  twitter: undefined,
};

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
