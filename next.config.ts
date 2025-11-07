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
};

// ✅ We're NOT using next-pwa anymore - it was overwriting our custom SW
// Instead, we maintain public/sw.js manually (copied from worker/index.js)
// This ensures FCM initialization and push handlers are preserved
export default nextConfig;
