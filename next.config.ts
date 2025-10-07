import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        hostname: '**',
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

export default nextConfig;
