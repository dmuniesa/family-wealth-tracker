import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

const nextConfig: NextConfig = {
  env: {
    DATABASE_PATH: process.env.DATABASE_PATH,
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
    SESSION_SECRET: process.env.SESSION_SECRET,
  },
  // Enable standalone output for Docker
  output: 'standalone',
  // Optimize for production
  poweredByHeader: false,
  // Compression
  compress: true,
  // Experimental features for better client-side rendering
  experimental: {
    optimizePackageImports: ['@radix-ui/react-dropdown-menu', '@radix-ui/react-select', '@radix-ui/react-dialog', 'lucide-react'],
  },
  // Disable strict linting for production builds
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Security headers
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
};

export default withNextIntl(nextConfig);
