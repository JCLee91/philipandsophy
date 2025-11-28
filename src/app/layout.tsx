import type { Metadata, Viewport } from 'next';
import './globals.css';
import Providers from './providers';
import AppBodyClass from '@/components/AppBodyClass';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1.0,
  maximumScale: 1.0,
  userScalable: false,
  themeColor: '#000000', // 전역 기본값: 검정 (랜딩페이지용)
  // viewportFit 제거: iOS PWA에서 safe area 안정성 확보
};

export const metadata: Metadata = {
  title: {
    default: '필립앤소피 | 승인제 독서소셜클럽',
    template: '%s | 필립앤소피',
  },
  description: '깊이 있는 대화가 설레는 만남으로 - 결이 맞는 사람을 만나는 가장 안전하고 쉬운 공간',
  keywords: ['독서모임', '독서소셜클럽', '승인제', '네트워킹', '직장인 모임', '서울 소셜클럽', '독서클럽', '프리미엄 모임', '25-40세'],
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
    icon: [
      { url: '/image/favicon.png', type: 'image/png' },
      { url: '/image/favicon.webp', type: 'image/webp' },
    ],
    apple: [
      { url: '/image/app-icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/image/app-icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '필립앤소피',
    startupImage: [
      {
        url: '/image/app-icon-512.png',
        media: '(device-width: 375px) and (device-height: 812px)',
      },
    ],
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    siteName: 'Philip & Sophy',
    title: '필립앤소피 | 승인제 독서소셜클럽',
    description: '깊이 있는 대화가 설레는 만남으로 - 결이 맞는 사람을 만나는 가장 안전하고 쉬운 공간',
    url: 'https://www.philipandsophy.kr/',
    images: [
      {
        url: '/image/Thumbnail_V2.webp',
        width: 2400,
        height: 1260,
        alt: '필립앤소피 썸네일',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '필립앤소피 | 승인제 독서소셜클럽',
    description: '깊이 있는 대화가 설레는 만남으로 - 결이 맞는 사람을 만나는 가장 안전하고 쉬운 공간',
    images: ['/image/Thumbnail_V2.webp'],
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
        {/* Karina Font */}
        <link href="https://fonts.cdnfonts.com/css/karina" rel="stylesheet" />
      </head>
      <body className="font-sans antialiased">
        <AppBodyClass />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
