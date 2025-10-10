import type { Metadata, Viewport } from 'next';
import './globals.css';
import Providers from './providers';
import RegisterServiceWorker from './register-sw';
import AppBodyClass from '@/components/AppBodyClass';
import AppViewportEffect from '@/components/AppViewportEffect';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1.0,
  maximumScale: 1.0,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: {
    default: '필립앤소피 | 승인제 독서소셜클럽',
    template: '%s | 필립앤소피',
  },
  description: '25-40세 직장인 전문직을 위한 승인제 독서소셜클럽 필립앤소피. 깊이 있는 대화가 설레는 만남으로. 서울 네트워킹 독서모임에서 품격 있는 인연을 만나보세요.',
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
    apple: '/image/favicon.webp',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: '필립앤소피',
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    siteName: 'Philip & Sophy',
    title: '필립앤소피 | 승인제 독서소셜클럽',
    description: '25-40세 직장인 전문직을 위한 승인제 독서소셜클럽 필립앤소피. 깊이 있는 대화가 설레는 만남으로. 서울 네트워킹 독서모임에서 품격 있는 인연을 만나보세요.',
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
    description: '25-40세 직장인 전문직을 위한 승인제 독서소셜클럽 필립앤소피. 깊이 있는 대화가 설레는 만남으로. 서울 네트워킹 독서모임에서 품격 있는 인연을 만나보세요.',
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
      </head>
      <body className="font-pretendard antialiased">
        <AppViewportEffect />
        <AppBodyClass />
        <Providers>{children}</Providers>
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
