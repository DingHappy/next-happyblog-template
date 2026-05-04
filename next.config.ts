import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// 通用安全响应头。CSP 暂不在这里加 —— Next.js 的内联脚本/样式很多,
// 一刀切的 CSP 容易破坏页面;留作后续按需补 nonce 的工作。
const securityHeaders = [
  // Clickjacking: 等价于 X-Frame-Options DENY,但更现代且支持 CSP fallback。
  { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
  // 阻止 MIME 嗅探。
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // 跨站跳转时仅发送 origin,同站完整 URL。
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // 默认禁掉一批敏感 API,需要时单独开。
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  },
  // 仅生产环境强制 HTTPS;localhost 用 HTTP 的开发场景不会被锁死。
  ...(process.env.NODE_ENV === 'production'
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }]
    : []),
];

const nextConfig: NextConfig = {
  output: 'standalone',
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
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
