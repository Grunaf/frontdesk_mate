'use client';

import { useTranslations } from '@/shared/i18n';
import { Icon } from '@/shared/ui';
import { ChevronRight, Wrench } from 'lucide-react';
import { useGuestIssueReport } from './GuestIssueReportProvider';

export function GuestIssueReportCard() {
  const t = useTranslations('components.guestIssue');
  const { openReportSheet } = useGuestIssueReport();

  return (
    <button
      type="button"
      onClick={openReportSheet}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted/40"
    >
      <Icon icon={Wrench} className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="flex-1 text-sm font-medium text-foreground">{t('cardTitle')}</span>
      <Icon icon={ChevronRight} className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}