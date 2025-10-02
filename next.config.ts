import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Zeabur deployment optimization
  output: 'standalone',

  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    optimizePackageImports: ['@radix-ui/react-icons'],
  },

  // Environment configuration
  env: {
    PORT: process.env.PORT || '8080',
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ];
  },
};

// Log configuration information during build
if (process.env.NODE_ENV === 'development') {
  console.log('[Next.js Config] Development mode configuration loaded');
  
  // Detect Turbopack usage
  const isTurbopackEnabled = !!(
    process.env.__TURBOPACK__ ||
    process.env.TURBOPACK ||
    process.argv?.includes('--turbopack')
  );
  
  if (isTurbopackEnabled) {
    console.warn(
      '\n🚨 [Next.js Config] TURBOPACK DETECTED',
      '\n   Middleware may not execute properly in development.',
      '\n   Consider using "npm run dev" instead of "npm run dev:turbo".',
      '\n   Layout-level authentication is active as fallback.\n'
    );
  } else {
    console.log('[Next.js Config] Standard webpack mode - middleware should work correctly');
  }
}

export default nextConfig;
