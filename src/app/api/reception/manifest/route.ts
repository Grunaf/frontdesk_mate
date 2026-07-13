import { NextResponse } from 'next/server';
import { BRAND_CONFIG } from '@/shared/config';

export async function GET() {
  const manifest = {
    name: 'Frontdesk Mate Reception',
    short_name: 'Reception',
    description: 'Reception desk for hostel staff',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    theme_color: BRAND_CONFIG.colors.primary,
    background_color: '#ffffff',
    icons: [
      {
        src: '/icons/reception-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/reception-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/reception-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

export function HEAD() {
  return new NextResponse(null, { status: 200 });
}
