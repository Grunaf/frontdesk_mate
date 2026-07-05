import { OwnerLoginForm } from '@/features/owner-auth';
import { getTranslations } from 'next-intl/server';

interface OwnerLoginPageProps {
  params: Promise<{ locale: string }>;
}

export default async function OwnerLoginPage({ params }: OwnerLoginPageProps) {
  const { locale } = await params;
  const t = await getTranslations('pages.owner.auth.login');

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>
      <OwnerLoginForm locale={locale} />
    </div>
  );
}
