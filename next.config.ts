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
  serverExternalPackages: ['socket.io'], // Ensure socket.io is handled correctly
  transpilePackages: ['@vidstack/react', 'vidstack'],
  async redirects() {
    return [
      {
        source: '/',
        destination: '/movie',
        permanent: false,
      },

      {
        source: '/dracin',
        destination: '/dracin/dramabox',
        permanent: false,
      },
      // API routes that might need redirection from old structure if any
    ];
  },

  async rewrites() {
    return [
      {
        source: '/login',
        destination: '/auth/login',
      },
      {
        source: '/register',
        destination: '/auth/register',
      },
      {
        source: '/akun',
        destination: '/auth/akun',
      },
    ];
  },
};

export default nextConfig;
