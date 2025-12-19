import type { Metadata, Viewport } from 'next';
import './globals.css';
import Providers from './providers';
import AppBodyClass from '@/components/AppBodyClass';
import GoogleAnalytics from '@/components/GoogleAnalytics';

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
    default: '필립앤소피 | 승인제 소셜클럽',
    template: '%s | 필립앤소피',
  },
  description: '검증된 사람들과 함께 즐기는 문화 생활 - 깊이 있는 대화가 있는 승인제 소셜클럽',
  keywords: ['소셜클럽', '승인제', '네트워킹', '직장인 모임', '서울 소셜클럽', '문화생활', '프리미엄 모임', '25-40세', '멤버십', '취미'],
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
    title: '필립앤소피 | 승인제 소셜클럽',
    description: '검증된 사람들과 함께 즐기는 문화 생활 - 깊이 있는 대화가 있는 승인제 소셜클럽',
    url: 'https://www.philipandsophy.kr/',
    images: [
      {
        url: '/image/Thumbnail_251219.webp',
        width: 1200,
        height: 630,
        alt: '필립앤소피 썸네일',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '필립앤소피 | 승인제 소셜클럽',
    description: '검증된 사람들과 함께 즐기는 문화 생활 - 깊이 있는 대화가 있는 승인제 소셜클럽',
    images: ['/image/Thumbnail_251219.webp'],
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
        {/* Meta Pixel Code */}
        <script
          dangerouslySetInnerHTML={{
            __html: `!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '1151958033749307');
fbq('track', 'PageView');`,
          }}
        />
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: 'none' }}
            src="https://www.facebook.com/tr?id=1151958033749307&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
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
        <GoogleAnalytics />
        <AppBodyClass />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
