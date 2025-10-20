import type { NextConfig } from 'next';
// @ts-ignore - next-pwa doesn't have proper TypeScript definitions
import withPWA from 'next-pwa';

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
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

// Configure PWA with custom worker directory
export default withPWA({
  dest: 'public',
  // Use custom worker directory for unified SW
  customWorkerDir: 'worker',
  // Disable automatic registration (we'll handle it manually)
  register: false,
  // Skip waiting to activate new SW immediately
  skipWaiting: true,
  // Enable in development for testing service worker and push notifications
  disable: false,
  // Reload on network connection restored
  reloadOnOnline: true,
})(nextConfig);
