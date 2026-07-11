'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import type { HubTransferCategory, HubTransferDirection } from '@/entities/guest-hub-transfer';
import { formatStayReference, stayCalendarDay } from '@/entities/guest-stay';
import { useTenant } from '@/entities/tenant';
import { CheckInRequiredSheet, useGuestSession, useIsGuestRegistered } from '@/features/guest-check-in';
import { useTranslations } from '@/shared/i18n';
import { createWhatsappLink } from '@/shared/lib';
import {
  BottomSheet,
  BottomSheetBody,
  BOTTOM_SHEET_SIZES,
  BottomSheetContent,
  BottomSheetFooter,
  BottomSheetHeader,
  BottomSheetTitle,
  Button,
  Icon,
  Input,
  SegmentedChipBar,
} from '@/shared/ui';
import { ArrowLeftRight } from 'lucide-react';
import { createGuestHubTransferAction } from '../actions/createGuestHubTransferAction';
import { buildHubTransferWhatsappMessage } from '../lib/buildHubTransferWhatsappMessage';
import {
  resolveHubTransferContext,
  type HubTransferSurface,
} from '../lib/resolveHubTransferContext';

const DIRECTION_ITEMS: HubTransferDirection[] = ['to_hostel', 'from_hostel'];

export function HubTransferRequestSheet({
  open,
  onOpenChange,
  hubCategory,
  hubLabel,
  transferSurface,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hubCategory: HubTransferCategory;
  hubLabel: string;
  transferSurface: HubTransferSurface;
}) {
  const { name, hostel, slug: tenantSlug } = useTenant();
  const { session, checkInAt, checkOutAt } = useGuestSession();
  const isRegistered = useIsGuestRegistered();
  const t = useTranslations('components.hubTransfer');

  const surfaceContext = useMemo(
    () => resolveHubTransferContext(transferSurface),
    [transferSurface]
  );

  const [direction, setDirection] = useState<HubTransferDirection>(surfaceContext.defaultDirection);
  const [requestedDate, setRequestedDate] = useState('');
  const [requestedTime, setRequestedTime] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checkInSheetOpen, setCheckInSheetOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const dateHintKind = surfaceContext.dateHintKindByDirection[direction];
  const stayRef = session?.stayId ? formatStayReference(session.stayId) : null;

  const directionItems = useMemo(
    () =>
      DIRECTION_ITEMS.map((id) => ({
        id,
        label:
          id === 'to_hostel'
            ? t('toHostel', { hubName: hubLabel })
            : t('fromHostel', { hubName: hubLabel }),
      })),
    [hubLabel, t]
  );

  const resetForm = () => {
    setDirection(surfaceContext.defaultDirection);
    setRequestedDate('');
    setRequestedTime('');
    setError(null);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm();
      setCheckInSheetOpen(false);
    }
    onOpenChange(nextOpen);
  };

  useEffect(() => {
    if (open) {
      setDirection(surfaceContext.defaultDirection);
    }
  }, [open, surfaceContext.defaultDirection, hubCategory]);

  const resolveErrorMessage = (code: string): string => {
    switch (code) {
      case 'unauthorized':
        return t('errors.unauthorized');
      case 'too_many_open':
        return t('errors.tooManyOpen');
      case 'invalid_date':
        return t('errors.invalidDate');
      case 'invalid_time':
        return t('errors.invalidTime');
      case 'invalid_category':
      case 'invalid_direction':
        return t('errors.invalidRequest');
      case 'db_unavailable':
        return t('errors.dbUnavailable');
      default:
        return t('errors.generic');
    }
  };

  const applyStayDateHint = () => {
    const iso = dateHintKind === 'check_in' ? checkInAt : checkOutAt;
    const day = stayCalendarDay(iso);
    if (day) {
      setRequestedDate(day);
    }
  };

  const canUseStayDateHint = Boolean(
    dateHintKind === 'check_in' ? stayCalendarDay(checkInAt) : stayCalendarDay(checkOutAt)
  );

  const handleSubmit = () => {
    if (!session?.stayId) {
      setCheckInSheetOpen(true);
      return;
    }

    const date = requestedDate.trim();
    const time = requestedTime.trim();

    if (!date) {
      setError(t('errors.dateRequired'));
      return;
    }
    if (!time) {
      setError(t('errors.timeRequired'));
      return;
    }

    setError(null);

    const whatsappPhone = hostel.reception.whatsapp.raw;
    if (!hostel.reception.whatsappEnabled || !whatsappPhone) {
      setError(t('errors.noWhatsapp'));
      return;
    }

    startTransition(async () => {
      const result = await createGuestHubTransferAction({
        tenantSlug,
        stayId: session.stayId,
        hubCategory,
        direction,
        requestedDate: date,
        requestedTime: time,
      });

      if (!result.ok) {
        setError(resolveErrorMessage(result.error));
        return;
      }

      const message = buildHubTransferWhatsappMessage({
        hostelName: name,
        hubLabel,
        direction,
        directionToLabel: t('toHostel', { hubName: hubLabel }),
        directionFromLabel: t('fromHostel', { hubName: hubLabel }),
        requestedDate: date,
        requestedTime: time,
        guestName: session.guestName ?? null,
        stayRef,
        formatMessage: (key, params) => t(key, params),
      });

      const href = createWhatsappLink(whatsappPhone, message);
      window.location.href = href;
    });
  };

  if (!open) {
    return null;
  }

  if (!isRegistered) {
    return <CheckInRequiredSheet open={open} onOpenChange={handleOpenChange} />;
  }

  return (
    <>
      <BottomSheet open={open} onOpenChange={handleOpenChange}>
        <BottomSheetContent size={BOTTOM_SHEET_SIZES.medium} className="flex flex-col px-0 pb-0">
          <BottomSheetHeader className="space-y-3 px-6 pb-3">
            <div className="flex items-start gap-4 pr-8">
              <div className="shrink-0 rounded-xl bg-muted p-2 text-muted-foreground">
                <Icon icon={ArrowLeftRight} className="h-5 w-5" />
              </div>
              <div className="min-w-0 space-y-1">
                <BottomSheetTitle className="text-base">{t('sheetTitle')}</BottomSheetTitle>
              </div>
            </div>
          </BottomSheetHeader>

          <BottomSheetBody className="space-y-4 pb-4">
            <p className="text-sm leading-relaxed text-muted-foreground">{t('disclaimer')}</p>

            <div className="space-y-2">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {t('directionLabel')}
              </p>
              <SegmentedChipBar
                items={directionItems}
                value={direction}
                onValueChange={(value) => setDirection(value as HubTransferDirection)}
                ariaLabel={t('directionLabel')}
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="hub-transfer-date"
                className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
              >
                {t('dateLabel')}
              </label>
              <Input
                id="hub-transfer-date"
                type="date"
                value={requestedDate}
                onChange={(event) => setRequestedDate(event.target.value)}
              />
              <span
                className="inline-block"
                title={!session ? t('checkInFirstTooltip') : undefined}
              >
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9"
                  disabled={!session || !canUseStayDateHint}
                  onClick={applyStayDateHint}
                >
                  {dateHintKind === 'check_in' ? t('useCheckInDate') : t('useCheckOutDate')}
                </Button>
              </span>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="hub-transfer-time"
                className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
              >
                {t('timeLabel')}
              </label>
              <Input
                id="hub-transfer-time"
                type="time"
                value={requestedTime}
                onChange={(event) => setRequestedTime(event.target.value)}
              />
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </BottomSheetBody>

          <BottomSheetFooter className="border-t border-border/60">
            <Button
              type="button"
              className="w-full"
              disabled={isPending}
              onClick={handleSubmit}
            >
              {isPending ? t('submitting') : t('submitButton')}
            </Button>
          </BottomSheetFooter>
        </BottomSheetContent>
      </BottomSheet>

      <CheckInRequiredSheet open={checkInSheetOpen} onOpenChange={setCheckInSheetOpen} />
    </>
  );
}
