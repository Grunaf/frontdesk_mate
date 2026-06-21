import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/shared/i18n/request.ts');

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
  },
  // Next.js allows *.localhost by default, but not nested tenant hosts like {slug}.app.localhost.
  allowedDevOrigins: [
    '192.168.1.249',
    '*.app.localhost',
    '*.reception.localhost',
    '*.localhost',
  ],
};

export default withNextIntl(nextConfig);
