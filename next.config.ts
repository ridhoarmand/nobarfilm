import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  // Note: Cross-origin warning in dev is safe to ignore (mobile testing)
  // Only affects development, not production

  images: {
    unoptimized: true, // Disable image optimization to prevent timeout on mobile
    qualities: [75, 80, 90, 100], // Add quality levels to suppress warnings
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
