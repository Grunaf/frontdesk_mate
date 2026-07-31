import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/shared/i18n/request.ts');

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
  },
  // Keep Chrome extension sources available to admin/owner ZIP download routes on Vercel.
  outputFileTracingIncludes: {
    '/admin/downloads/booking-com-sync': ['./extensions/booking-com-sync/**/*'],
    '/api/owner/extensions/booking-com-sync': ['./extensions/booking-com-sync/**/*'],
  },
  // Next.js allows *.localhost by default, but not nested tenant hosts like {slug}.app.localhost.
  allowedDevOrigins: [
    '*.app.localhost',
    '*.reception.localhost',
    '*.localhost',
  ],
  async headers() {
    return [
      {
        source: '/reception-sw.js',
        headers: [{ key: 'Service-Worker-Allowed', value: '/' }],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
