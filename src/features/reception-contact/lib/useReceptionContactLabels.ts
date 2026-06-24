'use client';

import { useTranslations } from '@/shared/i18n';

export function useReceptionContactLabels() {
  const t = useTranslations('components.receptionContact');

  return {
    message: t('messageReception'),
    call: t('callReception'),
    noContact: t('noContact'),
    translateHint: (key: string, params?: Record<string, string>) => t(key, params),
  };
}
