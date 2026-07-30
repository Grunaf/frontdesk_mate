'use client';

import { useMemo, useState } from 'react';
import { resolveGuestStayPlan, useTenant } from '@/entities/tenant';
import { useGuestSession } from '@/features/guest-check-in';
import { useLocale, useTranslations } from '@/shared/i18n';
import { Button, Icon } from '@/shared/ui';
import { UserRound } from 'lucide-react';
import { formatGuestStayDateRange } from '../lib/formatGuestStayDates';
import { GuestStaySheet } from './GuestStaySheet';

/**
 * Hub-matching profile chip for arrival-guide header.
 * Opens stay details without extend/report actions.
 */
export function GuestBookingAnchor() {
  const { settings } = useTenant();
  const { session, checkInAt, checkOutAt } = useGuestSession();
  const locale = useLocale();
  const t = useTranslations('components.guestStayChip');
  const [sheetOpen, setSheetOpen] = useState(false);

  const plan = useMemo(
    () => resolveGuestStayPlan(settings, session?.bedId),
    [settings, session?.bedId]
  );

  const guestName = session?.guestName?.trim() ?? '';
  const dateRange =
    checkInAt && checkOutAt
      ? formatGuestStayDateRange(checkInAt, checkOutAt, locale, {
          checkInDate: session?.checkInDate,
          checkOutDate: session?.checkOutDate,
        })
      : null;

  if (!session?.stayId || (!guestName && !dateRange)) {
    return null;
  }

  const ariaSummary = [guestName, dateRange].filter(Boolean).join(', ');

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="shrink-0"
        onClick={() => setSheetOpen(true)}
        aria-label={t('bookingAnchorAria', { summary: ariaSummary })}
        data-testid="guest-booking-anchor"
      >
        <Icon icon={UserRound} className="size-5 text-foreground" />
      </Button>

      {checkInAt && checkOutAt ? (
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
          showStayActions={false}
        />
      ) : null}
    </>
  );
}
