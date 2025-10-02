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
};

export default function Member10Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
