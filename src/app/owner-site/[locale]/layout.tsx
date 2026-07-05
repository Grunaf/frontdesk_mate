import { OwnerLocaleSwitcher } from '@/features/owner-shell';
import { getTranslations, setRequestLocale } from 'next-intl/server';

interface OwnerSiteLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function OwnerSiteLayout({ children, params }: OwnerSiteLayoutProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('pages.owner.portal');

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="border-b bg-background px-4 py-3">
        <div className="mx-auto flex max-w-lg items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-foreground">{t('title')}</p>
            <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
          </div>
          <OwnerLocaleSwitcher locale={locale} />
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 py-6 sm:py-8">{children}</main>
    </div>
  );
}

export function generateStaticParams() {
  return [{ locale: 'en' }, { locale: 'sr' }];
}
