import type { Metadata, Viewport } from 'next';
import './globals.css';
import Providers from './providers';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1.0,
};

export const metadata: Metadata = {
  title: {
    default: '필립앤소피 | 승인제 독서소셜클럽',
    template: '%s | 필립앤소피',
  },
  description: '깊이 있는 대화가 설레는 만남으로',
  metadataBase: new URL('https://www.philipandsophy.kr'),
  formatDetection: {
    telephone: false,
  },
  verification: {
    google: 'TLXyOSIFDFzG1JUEsk7X_q-Fewf2Qd4g9WhOzyryTwQ',
    other: {
      'naver-site-verification': '85cd69e1018789e993a86dfb13617418ae64a0c3',
    },
  },
  icons: {
    icon: '/image/favicon.webp',
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    siteName: 'Philip & Sophy',
    title: '필립앤소피 | 승인제 독서소셜클럽',
    description: '깊이 있는 대화가 설레는 만남으로',
    url: 'https://www.philipandsophy.kr/',
    images: [
      {
        url: '/image/Thumbnail_V1_1080_1080.webp',
        width: 1080,
        height: 1080,
        alt: '필립앤소피 썸네일',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '필립앤소피 | 승인제 독서소셜클럽',
    description: '깊이 있는 대화가 설레는 만남으로',
    images: ['/image/Thumbnail_V1_1080_1080.webp'],
  },
  alternates: {
    canonical: 'https://www.philipandsophy.kr/',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning lang="ko">
      <head>
        {/* Pretendard Variable Font */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link
          rel="preload"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.css"
        />
        <link
          rel="stylesheet"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.css"
        />
        {/* Preload critical images */}
        <link rel="preload" as="image" href="/image/PnS_1.webp?v=1.1" />
        <link rel="preload" as="image" href="/image/PnS_2.webp?v=1.5" />
        <link rel="preload" as="image" href="/image/PnS_4_nofooter.webp?v=2.2" />
        <link rel="preload" as="image" href="/image/Program/Program_01.webp?v=2.0" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
