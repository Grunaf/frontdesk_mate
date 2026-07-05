import { getOwnerTenantContext } from '@/entities/hostel-owner';
import { listCityPacksForOwnerOnboarding } from '@/entities/city-pack/server';
import { OwnerHostelOnboardingForm } from '@/features/owner-onboarding';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';

interface OwnerOnboardingPageProps {
  params: Promise<{ locale: string }>;
}

export default async function OwnerOnboardingPage({ params }: OwnerOnboardingPageProps) {
  const { locale } = await params;
  const context = await getOwnerTenantContext();

  if (context) {
    redirect(`/${locale}/setup`);
  }

  const t = await getTranslations('pages.owner.onboarding');
  const tNav = await getTranslations('pages.owner.nav');
  const { packs, error } = await listCityPacksForOwnerOnboarding();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        {error ? (
          <p className="text-sm text-amber-800" role="status">
            {t('cityPacksError', { message: error })}
          </p>
        ) : null}
      </div>

      <OwnerHostelOnboardingForm locale={locale} cityPacks={packs} />

      <form action={`/${locale}/auth/logout`} method="post">
        <button
          type="submit"
          className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {tNav('signOut')}
        </button>
      </form>
    </div>
  );
}
