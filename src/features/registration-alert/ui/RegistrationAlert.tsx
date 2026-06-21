'use client';

import { useHostelConfig } from '@/entities/tenant';
import { useTranslations } from '@/shared/i18n';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui';

export function RegistrationAlert() {
  const t = useTranslations('components.registrationAlert');
  const hostel = useHostelConfig();

  return (
    <Alert className="animate-fade-in border-primary/30 bg-primary/10 text-foreground">
      <AlertTitle className="text-xs font-bold tracking-wider uppercase">{t('title')}</AlertTitle>
      <AlertDescription className="text-xs text-muted-foreground">
        {t('description', { time: hostel.reception.time.open ?? '' })}
      </AlertDescription>
    </Alert>
  );
}
