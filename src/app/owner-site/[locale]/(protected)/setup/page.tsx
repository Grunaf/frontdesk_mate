import { getOwnerTenantContext } from '@/entities/hostel-owner';
import { getTenantPublicUrl } from '@/shared/config';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';

interface OwnerSetupPageProps {
  params: Promise<{ locale: string }>;
}

export default async function OwnerSetupPage({ params }: OwnerSetupPageProps) {
  const { locale } = await params;
  const context = await getOwnerTenantContext();

  if (!context) {
    redirect(`/${locale}/onboarding`);
  }

  const t = await getTranslations('pages.owner.setup');
  const landingPreview = getTenantPublicUrl(context.slug, 'landing', locale);
  const appPreview = getTenantPublicUrl(context.slug, 'app', locale);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{context.name}</span> · {t('slugLabel')}{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{context.slug}</code>
        </p>
      </div>

      <div className="space-y-3 rounded-xl border bg-background p-5 text-sm">
        <p className="font-medium">{t('previewTitle')}</p>
        <ul className="space-y-2 text-muted-foreground">
          <li>
            {t('landingLabel')}:{' '}
            <a
              href={landingPreview}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all text-primary underline-offset-4 hover:underline"
            >
              {landingPreview}
            </a>
          </li>
          <li>
            {t('appLabel')}:{' '}
            <a
              href={appPreview}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all text-primary underline-offset-4 hover:underline"
            >
              {appPreview}
            </a>
          </li>
        </ul>
      </div>

      <div className="rounded-xl border border-dashed bg-muted/30 px-5 py-4 text-sm text-muted-foreground">
        {t('wizardTeaser')}
      </div>

      <Link
        href={`/${locale}/settings`}
        className="inline-flex min-h-11 items-center rounded-md border px-4 text-sm font-medium hover:bg-muted/50"
      >
        {t('goToSettings')}
      </Link>
    </div>
  );
}
