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
import { UserRound } from 'lucide-react';
import { GuestStaySheet } from './GuestStaySheet';

export function GuestStayChip() {
  const { settings } = useTenant();
  const { session, checkInAt, checkOutAt } = useGuestSession();
  const isRegistered = useIsGuestRegistered();
  const foreignRegistration = useForeignGuestRegistration();
  const t = useTranslations('components.guestStayChip');
  const [sheetOpen, setSheetOpen] = useState(false);

  const plan = useMemo(
    () => resolveGuestStayPlan(settings, session?.bedId),
    [settings, session?.bedId]
  );
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
          'size-11 shrink-0 p-0 active:bg-muted/60'
        )}
        onClick={() => setSheetOpen(true)}
        aria-label={t('openDetail', { summary: chipLabel })}
      >
        <Icon icon={UserRound} size={22} className="text-foreground" />
      </button>

      <GuestStaySheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        stayId={session.stayId}
        guestName={session.guestName}
        plan={plan}
        checkInAt={checkInAt}
        checkOutAt={checkOutAt}
        checkInDate={session.checkInDate}
        checkOutDate={session.checkOutDate}
      />
    </>
  );
}
