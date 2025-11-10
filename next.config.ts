import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    ignoreDuringBuilds: true,
  },
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
              script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.gstatic.com https://www.google.com https://www.googletagmanager.com https://www.google-analytics.com https://cdn.jsdelivr.net https://connect.facebook.net;
              style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;
              img-src 'self' data: blob: https: http:;
              font-src 'self' data: https://cdn.jsdelivr.net;
              connect-src 'self' https://*.firebaseapp.com https://*.firebaseio.com https://*.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://*.cloudfunctions.net wss://*.firebaseio.com https://openapi.naver.com https://*.run.app https://www.google.com https://recaptchaenterprise.googleapis.com https://www.google-analytics.com;
              frame-src 'self' https://www.google.com https://recaptcha.google.com https://*.firebaseapp.com;
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
