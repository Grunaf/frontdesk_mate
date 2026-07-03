'use client';

import { useState } from 'react';
import { useTranslations } from '@/shared/i18n';
import { cn } from '@/shared/lib/utils';
import { badgeVariants } from '@/shared/ui';
import { CheckInRequiredSheet } from './CheckInRequiredSheet';

export function GuestCheckInChip() {
  const t = useTranslations('components.guestCheckInChip');
  const [sheetOpen, setSheetOpen] = useState(false);
  const chipLabel = t('chipLabel');

  return (
    <>
      <button
        type="button"
        className={cn(
          badgeVariants({ variant: 'outline' }),
          'shrink-0 min-h-11 px-2.5 py-2 text-left active:bg-muted/60'
        )}
        onClick={() => setSheetOpen(true)}
        aria-label={t('openSheet')}
        data-testid="guest-check-in-chip"
      >
        <span className="text-xs font-medium whitespace-nowrap">{chipLabel}</span>
      </button>

      <CheckInRequiredSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  );
}
