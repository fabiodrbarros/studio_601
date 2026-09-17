import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingIncludes: { '/*': ['./db/migrations/0001-local.sql'] },
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'same-origin' },
    ] }, { source: '/admin', headers: [{ key: 'Cache-Control', value: 'private, no-store' }] }];
  },
};

export default nextConfig;
