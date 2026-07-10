'use client';

import Link from 'next/link';
import { useTranslations } from '@/shared/i18n';
import { cn } from '@/shared/lib/utils';
import { Skeleton } from '@/shared/ui';

export type GuestStayTourismSummaryState =
  | { kind: 'loading' }
  | { kind: 'not_started' }
  | { kind: 'in_progress'; guestCount: number }
  | { kind: 'complete'; guestCount: number };

interface GuestStayTourismSummaryCardProps {
  state: GuestStayTourismSummaryState;
  registerPath: string;
}

function statusBadgeClass(kind: 'not_started' | 'in_progress' | 'complete'): string {
  switch (kind) {
    case 'complete':
      return 'bg-emerald-100 text-emerald-900';
    case 'in_progress':
      return 'bg-amber-100 text-amber-950';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

export function GuestStayTourismSummaryCard({
  state,
  registerPath,
}: GuestStayTourismSummaryCardProps) {
  const t = useTranslations('components.guestStayChip');

  if (state.kind === 'loading') {
    return (
      <div
        aria-busy="true"
        className="space-y-2 rounded-xl border bg-muted/30 p-3"
        data-testid="guest-stay-tourism-summary-loading"
      >
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {t('tourismSummaryHeading')}
        </p>
        <div className="space-y-2" aria-hidden>
          <Skeleton className="h-4 w-full max-w-[14rem]" />
          <Skeleton className="h-4 w-4/5 max-w-[12rem]" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
      </div>
    );
  }

  const statusKind = state.kind;
  const statusLabel =
    statusKind === 'complete'
      ? t('tourismStatusComplete')
      : statusKind === 'in_progress'
        ? t('tourismStatusInProgress')
        : t('tourismStatusNotStarted');

  const bodyText =
    statusKind === 'complete'
      ? t('tourismSummaryComplete', { count: state.guestCount })
      : statusKind === 'in_progress'
        ? t('tourismSummaryInProgress', { count: state.guestCount })
        : t('tourismSummaryNotStarted');

  return (
    <div className="space-y-2 rounded-xl border bg-muted/30 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {t('tourismSummaryHeading')}
        </p>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-[10px] font-medium',
            statusBadgeClass(statusKind)
          )}
        >
          {statusLabel}
        </span>
      </div>

      <p className="text-sm leading-relaxed text-muted-foreground">{bodyText}</p>

      {statusKind !== 'complete' ? (
        <Link
          href={registerPath}
          className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline decoration-primary/35 underline-offset-[3px] hover:decoration-primary/70"
        >
          {t('tourismSummaryContinueLink')}
        </Link>
      ) : null}
    </div>
  );
}
