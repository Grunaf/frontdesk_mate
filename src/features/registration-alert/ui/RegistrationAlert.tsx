'use client';

import { HOSTEL_CONFIG } from '@/shared/config';
import { useTranslations } from '@/shared/i18n';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui';

export function RegistrationAlert() {
  const t = useTranslations('components.registrationAlert');

  return (
    <Alert className="animate-fade-in border-primary/30 bg-primary/10 text-foreground">
      <AlertTitle className="text-xs font-bold tracking-wider uppercase">{t('title')}</AlertTitle>
      <AlertDescription className="text-xs text-muted-foreground">
        {t('description', { time: HOSTEL_CONFIG.reception.time.open ?? '' })}
      </AlertDescription>
    </Alert>
  );
}
