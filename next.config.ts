import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingExcludes: {
    '/api/admin/export-knowledge': [
      './next.config.ts',
      './next-env.d.ts',
      './tsconfig.json',
      './eslint.config.mjs',
      './postcss.config.mjs',
    ],
  },
  allowedDevOrigins: (process.env.ALLOWED_DEV_ORIGINS || 'localhost')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean),
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
      },
    ],
    formats: ['image/webp'],
  },
};

export default withNextIntl(nextConfig);
