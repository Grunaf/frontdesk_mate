import { Suspense } from 'react';
import { OwnerSignupForm } from '@/features/owner-auth';
import { getTranslations } from 'next-intl/server';

interface OwnerSignupPageProps {
  params: Promise<{ locale: string }>;
}

export default async function OwnerSignupPage({ params }: OwnerSignupPageProps) {
  const { locale } = await params;
  const t = await getTranslations('pages.owner.auth.signup');

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">{t('loading')}</p>}>
        <OwnerSignupForm locale={locale} />
      </Suspense>
    </div>
  );
}
