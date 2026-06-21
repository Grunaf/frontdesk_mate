'use client';

import { useHostelConfig } from '@/entities/tenant';
import { useTranslations } from '@/shared/i18n';
import { Button } from '@/shared/ui';

export function LandingComingSoon() {
  const t = useTranslations('pages.landing.comingSoon');
  const hostel = useHostelConfig();

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold">{t('title')}</h1>
      <p className="text-sm text-muted-foreground">{t('description')}</p>
      {hostel.contacts.email.display && (
        <Button asChild variant="outline">
          <a href={hostel.contacts.email.href}>{t('contactButton')}</a>
        </Button>
      )}
    </div>
  );
}
