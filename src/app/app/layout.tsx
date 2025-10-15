import type { Metadata } from 'next';
import AppViewportEffect from '@/components/AppViewportEffect';
import RegisterServiceWorker from '../register-sw';

export const metadata: Metadata = {
  title: '필립앤소피 | 승인제 독서소셜클럽',
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
  return (
    <>
      <AppViewportEffect />
      <RegisterServiceWorker />
      {children}
    </>
  );
}
