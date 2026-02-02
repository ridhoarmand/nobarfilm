import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pbcdnw.aoneroom.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.aoneroom.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.sansekai.my.id',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
