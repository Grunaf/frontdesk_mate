'use client';

import { useMemo, useState } from 'react';
import { resolveGuestStayPlan, useTenant } from '@/entities/tenant';
import {
  useForeignGuestRegistration,
  useGuestSession,
  useIsGuestRegistered,
} from '@/features/guest-check-in';
import { useTranslations } from '@/shared/i18n';
import { Button, Icon } from '@/shared/ui';
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
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="shrink-0"
        onClick={() => setSheetOpen(true)}
        aria-label={t('openDetail', { summary: chipLabel })}
      >
        <Icon icon={UserRound} className="size-5 text-foreground" />
      </Button>

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
