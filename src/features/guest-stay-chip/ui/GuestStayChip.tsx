'use client';

import { useMemo, useState } from 'react';
import { resolveGuestStayPlan, useTenant } from '@/entities/tenant';
import {
  useForeignGuestRegistration,
  useGuestSession,
  useIsGuestRegistered,
} from '@/features/guest-check-in';
import { useTranslations } from '@/shared/i18n';
import { cn } from '@/shared/lib/utils';
import { badgeVariants, Icon } from '@/shared/ui';
import { ChevronDown } from 'lucide-react';
import { GuestStaySheet } from './GuestStaySheet';

export function GuestStayChip() {
  const { settings } = useTenant();
  const { session, checkInAt, checkOutAt } = useGuestSession();
  const isRegistered = useIsGuestRegistered();
  const foreignRegistration = useForeignGuestRegistration();
  const t = useTranslations('components.guestStayChip');
  const [sheetOpen, setSheetOpen] = useState(false);

  const plan = useMemo(() => resolveGuestStayPlan(settings), [settings]);
  const chipLabel = t('chipLabel');

  if (!isRegistered || foreignRegistration || !checkInAt || !checkOutAt || !session?.stayId) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        className={cn(
          badgeVariants({ variant: 'outline' }),
          'shrink-0 gap-1 px-2.5 py-2 text-left active:bg-muted/60'
        )}
        onClick={() => setSheetOpen(true)}
        aria-label={t('openDetail', { summary: chipLabel })}
      >
        <span className="text-xs font-medium whitespace-nowrap">{chipLabel}</span>
        <Icon icon={ChevronDown} className="h-3 w-3 shrink-0 text-muted-foreground" />
      </button>

      <GuestStaySheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        stayId={session.stayId}
        guestName={session.guestName}
        plan={plan}
        checkInAt={checkInAt}
        checkOutAt={checkOutAt}
      />
    </>
  );
}
