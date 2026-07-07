'use client';

import { useTranslations } from '@/shared/i18n';
import { Button, Icon } from '@/shared/ui';
import { CalendarRange, Check, Copy } from 'lucide-react';

interface GuestStayReceptionCardProps {
  dateRange: string;
  stayRef: string | null;
  guestName: string | null;
  receptionCopyText: string | null;
  copied: boolean;
  onCopy: () => void;
}

export function GuestStayReceptionCard({
  dateRange,
  stayRef,
  guestName,
  receptionCopyText,
  copied,
  onCopy,
}: GuestStayReceptionCardProps) {
  const t = useTranslations('components.guestStayChip');
  const hint = t('receptionHint');

  return (
    <div className="space-y-1.5 rounded-xl border bg-muted/30 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {t('receptionHeading')}
        </p>
        {receptionCopyText ? (
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="size-8 shrink-0"
            aria-label={copied ? t('copiedForReception') : t('copyForReception')}
            aria-describedby="guest-stay-reception-hint"
            onClick={onCopy}
          >
            <Icon icon={copied ? Check : Copy} className="h-3.5 w-3.5" />
          </Button>
        ) : null}
      </div>

      <div className="space-y-0.5">
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm text-foreground">
          <span className="inline-flex items-center gap-1.5 font-medium">
            <Icon icon={CalendarRange} className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            {dateRange}
          </span>
          {stayRef ? (
            <>
              <span className="text-muted-foreground" aria-hidden>
                ·
              </span>
              <span className="font-mono text-sm font-medium">
                {t('stayRefLabel')} #{stayRef}
              </span>
            </>
          ) : null}
        </div>
        {guestName ? (
          <p className="text-xs text-muted-foreground">{guestName}</p>
        ) : null}
      </div>

      <p id="guest-stay-reception-hint" className="sr-only">
        {hint}
      </p>
    </div>
  );
}
