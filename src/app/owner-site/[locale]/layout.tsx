import { OwnerPortalChrome } from '@/features/owner-shell';
import { setRequestLocale } from 'next-intl/server';

interface OwnerSiteLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function OwnerSiteLayout({ children, params }: OwnerSiteLayoutProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <OwnerPortalChrome locale={locale}>{children}</OwnerPortalChrome>;
}

export function generateStaticParams() {
  return [{ locale: 'en' }, { locale: 'sr' }];
}
