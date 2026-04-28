import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
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

export default nextConfig;
