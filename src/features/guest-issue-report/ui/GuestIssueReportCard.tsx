'use client';

import { useTranslations } from '@/shared/i18n';
import { Button } from '@/shared/ui';
import { useGuestIssueReport } from './GuestIssueReportProvider';

export function GuestIssueReportCard() {
  const t = useTranslations('components.guestIssue');
  const { openReportSheet } = useGuestIssueReport();

  return (
    <section className="rounded-xl border bg-muted/30 px-4 py-3">
      <p className="text-sm font-medium text-foreground">{t('cardTitle')}</p>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t('cardDescription')}</p>
      <Button type="button" className="mt-3 w-full" variant="outline" onClick={openReportSheet}>
        {t('cardButton')}
      </Button>
    </section>
  );
}
