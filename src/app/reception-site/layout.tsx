import type { Metadata, Viewport } from 'next';
import { BRAND_CONFIG } from '@/shared/config';
import { ReceptionPwaBootstrap } from '@/features/reception-pwa';

export const metadata: Metadata = {
  applicationName: 'Reception',
  manifest: '/api/reception/manifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Reception',
  },
  icons: {
    icon: [{ url: '/icons/reception-192.png', sizes: '192x192', type: 'image/png' }],
    apple: [{ url: '/icons/reception-192.png', sizes: '192x192', type: 'image/png' }],
  },
};

export const viewport: Viewport = {
  themeColor: BRAND_CONFIG.colors.primary,
};

export default function ReceptionSiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/30">
      <ReceptionPwaBootstrap />
      <main className="mx-auto max-w-6xl px-4 py-4">{children}</main>
    </div>
  );
}
