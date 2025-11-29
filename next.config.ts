import type { NextConfig } from 'next';

const META_CAPI_ENDPOINT = 'https://capig.datah04.com';
const CDN_JSDELIVR_ENDPOINT = 'https://cdn.jsdelivr.net';
const GSTATIC_ENDPOINT = 'https://www.gstatic.com';

const nextConfig: NextConfig = {
  /* config options here */
  productionBrowserSourceMaps: false,
  images: {
    unoptimized: true, // Vercel Image Optimization 비활성화 - Firebase Resize Extension 사용
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'philipandsophy.firebasestorage.app',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        pathname: '/v0/b/philipandsophy.firebasestorage.app/**',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'shopping-phinf.pstatic.net',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'bookthumb-phinf.pstatic.net',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'contents.kyobobook.co.kr',
        pathname: '/**',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/member10',
        destination: '/app',
        permanent: true,
      },
      {
        source: '/chat',
        destination: '/app/chat',
        permanent: true,
      },
      {
        source: '/chat/:path*',
        destination: '/app/chat/:path*',
        permanent: true,
      },
      {
        source: '/profile/:path*',
        destination: '/app/profile/:path*',
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `
              default-src 'self';
              script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.gstatic.com https://www.google.com https://apis.google.com https://www.googletagmanager.com https://tagmanager.google.com https://www.google-analytics.com https://ssl.google-analytics.com https://analytics.google.com https://cdn.jsdelivr.net https://connect.facebook.net;
              style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://tagmanager.google.com https://fonts.googleapis.com;
              img-src 'self' data: blob: https: http:;
              font-src 'self' data: https://cdn.jsdelivr.net https://fonts.gstatic.com;
              connect-src 'self' https://*.firebaseapp.com https://*.firebaseio.com https://*.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://*.cloudfunctions.net wss://*.firebaseio.com https://openapi.naver.com https://*.run.app https://www.google.com https://recaptchaenterprise.googleapis.com https://www.google-analytics.com https://ssl.google-analytics.com https://analytics.google.com https://stats.g.doubleclick.net https://www.facebook.com https://*.facebook.com https://*.facebook.net https://contents.kyobobook.co.kr ${GSTATIC_ENDPOINT} ${CDN_JSDELIVR_ENDPOINT} ${META_CAPI_ENDPOINT};
              frame-src 'self' https://www.google.com https://recaptcha.google.com https://*.firebaseapp.com https://www.facebook.com https://td.doubleclick.net;
              frame-ancestors 'self' https://www.google.com;
            `.replace(/\s+/g, ' ').trim(),
          },
        ],
      },
    ];
  },
};

// ✅ We're NOT using next-pwa anymore - it was overwriting our custom SW
// Instead, we maintain public/sw.js manually (copied from worker/index.js)
// This ensures FCM initialization and push handlers are preserved
export default nextConfig;
