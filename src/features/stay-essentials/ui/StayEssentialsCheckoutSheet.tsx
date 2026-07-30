'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { resolveGuestExtrasForGuest } from '@/entities/guest-extra';
import {
  canGuestClearStayPresence,
  canGuestMarkStayVacant,
} from '@/entities/housekeeping';
import { resolveGuestStayPlan, useHostelConfig, useTenant } from '@/entities/tenant';
import { shouldShowPreTripLuggage } from '@/entities/tenant/lib/resolveGuestFieldPresentation';
import { useGuestSession } from '@/features/guest-check-in';
import {
  GuestExtraDetailsActions,
  GuestExtraDetailsBody,
  trackGuestExtraDetailsOpen,
  useGuestExtraDetails,
} from '@/features/guest-services';
import {
  formatGuestStayCheckoutShort,
  formatStayReference,
  resolveGuestStayBedLabel,
} from '@/features/guest-stay-chip';
import { useLocale, useTranslations } from '@/shared/i18n';
import { cn } from '@/shared/lib/utils';
import {
  BottomSheet,
  BottomSheetBody,
  BottomSheetContent,
  BottomSheetFooter,
  BottomSheetHeader,
  BottomSheetTitle,
  BOTTOM_SHEET_SIZES,
  Button,
  Icon,
  Separator,
} from '@/shared/ui';
import { ArrowLeft, Briefcase, Clock, LogOut, Moon, type LucideIcon } from 'lucide-react';
import {
  clearGuestStayVacantAction,
  getGuestStayPresenceAction,
  markGuestStayVacantAction,
  type GuestStayPresenceSnapshot,
} from '../actions/guestStayPresenceActions';

type CheckoutSheetStep = 'info' | 'confirmLeft' | 'lateCheckout';
type SheetSlideFrom = 'left' | 'right';

interface StayEssentialsCheckoutSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface InfoRowProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

function InfoRow({ icon, title, description, action }: InfoRowProps) {
  return (
    <div className="flex items-start gap-3">
      <Icon icon={icon} className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="space-y-1.5">
        <p className="text-sm leading-snug font-medium text-foreground">{title}</p>
        {description ? (
          <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
        {action}
      </div>
    </div>
  );
}

function sheetStepMotionClass(slideFrom: SheetSlideFrom): string {
  return cn(
    'animate-in fade-in-0 duration-200 motion-reduce:animate-none',
    slideFrom === 'right' ? 'slide-in-from-right-8' : 'slide-in-from-left-8'
  );
}

export function StayEssentialsCheckoutSheet({
  open,
  onOpenChange,
}: StayEssentialsCheckoutSheetProps) {
  const t = useTranslations('components.stayEssentials');
  const checkoutT = useTranslations('components.stayEssentials.checkout');
  const leftT = useTranslations('components.stayEssentials.checkout.leftEarly');
  const commonT = useTranslations('domains.hostel.common');
  const tBed = useTranslations('components.findYourBed');
  const { settings, slug } = useTenant();
  const hostel = useHostelConfig();
  const locale = useLocale();
  const { session, checkOutAt } = useGuestSession();
  const [presence, setPresence] = useState<GuestStayPresenceSnapshot>(null);
  const [presenceBusy, setPresenceBusy] = useState(false);
  const [step, setStep] = useState<CheckoutSheetStep>('info');
  const [slideFrom, setSlideFrom] = useState<SheetSlideFrom>('right');

  const checkOutTime = hostel.checkOutTime?.trim();
  const showLuggage = shouldShowPreTripLuggage(settings);
  const stayId = session?.stayId ?? null;
  const bedId = session?.bedId ?? null;
  const canUsePresence = Boolean(slug?.trim() && stayId && bedId);

  const refreshPresence = useCallback(async () => {
    if (!slug?.trim() || !stayId || !bedId) {
      setPresence(null);
      return;
    }

    const result = await getGuestStayPresenceAction(slug);
    if (result.ok) {
      setPresence(result.presence);
    }
  }, [bedId, slug, stayId]);

  useEffect(() => {
    if (!canUsePresence) {
      return;
    }

    void refreshPresence();
  }, [canUsePresence, refreshPresence]);

  useEffect(() => {
    if (!open || !canUsePresence) {
      return;
    }

    void refreshPresence();
  }, [canUsePresence, open, refreshPresence]);

  useEffect(() => {
    if (!open) {
      setStep('info');
      setSlideFrom('right');
    }
  }, [open]);

  const lateCheckoutExtra = useMemo(
    () =>
      resolveGuestExtrasForGuest(settings, true).find((extra) => extra.presetId === 'late_checkout') ??
      null,
    [settings]
  );

  const plan = useMemo(
    () => resolveGuestStayPlan(settings, session?.bedId),
    [session?.bedId, settings]
  );

  const bedLabel = useMemo(() => {
    if (!plan.bedId) {
      return '';
    }

    return resolveGuestStayBedLabel(plan, (key, values) =>
      tBed(key, values as Record<string, string | number> | undefined)
    );
  }, [plan, tBed]);

  const stayRef = session?.stayId ? formatStayReference(session.stayId) : null;

  const lateCheckoutDetails = useGuestExtraDetails({
    extra: lateCheckoutExtra,
    bedLabel,
    stayRef,
  });

  const lateCheckoutLinkLabel = useMemo(() => {
    if (!lateCheckoutExtra || !lateCheckoutDetails) {
      return null;
    }

    if (!lateCheckoutExtra.priceLabel?.trim()) {
      return checkoutT('lateCheckoutLink');
    }

    return checkoutT('lateCheckoutLinkWithPrice', { price: lateCheckoutDetails.priceLine });
  }, [checkoutT, lateCheckoutDetails, lateCheckoutExtra]);

  const personalCheckout = checkOutAt
    ? formatGuestStayCheckoutShort(checkOutAt, locale)
    : null;

  const showMarked = canUsePresence && presence?.status === 'vacant';
  const showMarkCta = canUsePresence && !showMarked && canGuestMarkStayVacant(presence);
  const showUndo = showMarked && canGuestClearStayPresence(presence);

  const goConfirmLeft = useCallback(() => {
    setSlideFrom('right');
    setStep('confirmLeft');
  }, []);

  const goLateCheckout = useCallback(() => {
    if (!lateCheckoutDetails) {
      return;
    }

    setSlideFrom('right');
    setStep('lateCheckout');
    trackGuestExtraDetailsOpen(lateCheckoutDetails.presetId);
  }, [lateCheckoutDetails]);

  const goBackToInfo = useCallback(() => {
    setSlideFrom('left');
    setStep('info');
  }, []);

  const handleConfirmLeft = useCallback(async () => {
    if (!slug?.trim() || presenceBusy) {
      return;
    }

    setPresenceBusy(true);
    try {
      const result = await markGuestStayVacantAction(slug);
      if (result.ok) {
        setPresence(result.presence);
        setSlideFrom('left');
        setStep('info');
      }
    } finally {
      setPresenceBusy(false);
    }
  }, [presenceBusy, slug]);

  const handleUndo = useCallback(async () => {
    if (!slug?.trim() || presenceBusy) {
      return;
    }

    setPresenceBusy(true);
    try {
      const result = await clearGuestStayVacantAction(slug);
      if (result.ok) {
        setPresence(null);
      }
    } finally {
      setPresenceBusy(false);
    }
  }, [presenceBusy, slug]);

  const rows: ReactNode[] = [];

  if (checkOutTime) {
    rows.push(
      <InfoRow
        key="checkout-time"
        icon={Clock}
        title={checkoutT('checkOutUntil', { time: checkOutTime })}
        description={checkoutT('lateCheckoutHint')}
        action={
          lateCheckoutLinkLabel ? (
            <Button
              type="button"
              variant="link"
              className="h-auto px-0 text-sm"
              onClick={goLateCheckout}
            >
              {lateCheckoutLinkLabel}
            </Button>
          ) : null
        }
      />
    );
  }

  if (personalCheckout) {
    if (rows.length > 0) {
      rows.push(<Separator key="sep-personal" />);
    }

    rows.push(
      <p key="personal-checkout" className="text-xs text-muted-foreground">
        {checkoutT('personalCheckout', { date: personalCheckout })}
      </p>
    );
  }

  if (rows.length > 0) {
    rows.push(<Separator key="sep-pack" />);
  }

  rows.push(
    <InfoRow
      key="pack-night-before"
      icon={Moon}
      title={checkoutT('packNightBefore.title')}
      description={checkoutT('packNightBefore.description')}
    />
  );

  if (showLuggage) {
    rows.push(<Separator key="sep-luggage" />);
    rows.push(
      <InfoRow
        key="luggage"
        icon={Briefcase}
        title={checkoutT('luggageTitle')}
        description={commonT('timing.luggageAlert', { time: hostel.checkInTime ?? '' })}
      />
    );
  }

  if (canUsePresence && (showMarked || showMarkCta)) {
    rows.push(<Separator key="sep-left-early" />);
    if (showMarked) {
      rows.push(
        <InfoRow
          key="left-marked"
          icon={LogOut}
          title={leftT('markedTitle')}
          description={leftT('markedDescription')}
          action={
            showUndo ? (
              <Button
                type="button"
                variant="link"
                className="h-auto px-0 text-sm"
                disabled={presenceBusy}
                onClick={() => void handleUndo()}
              >
                {leftT('undo')}
              </Button>
            ) : null
          }
        />
      );
    } else {
      rows.push(
        <InfoRow
          key="left-cta"
          icon={LogOut}
          title={leftT('title')}
          description={leftT('description')}
          action={
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-1"
              disabled={presenceBusy}
              onClick={goConfirmLeft}
            >
              {leftT('cta')}
            </Button>
          }
        />
      );
    }
  }

  const isPushedStep = step === 'confirmLeft' || step === 'lateCheckout';
  const pushedTitle =
    step === 'confirmLeft'
      ? leftT('confirmTitle')
      : step === 'lateCheckout' && lateCheckoutDetails
        ? lateCheckoutDetails.title
        : t('bridges.checkout');

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <BottomSheetContent size={BOTTOM_SHEET_SIZES.large} className="flex flex-col">
        <BottomSheetHeader className={cn(isPushedStep && 'pr-12')}>
          {isPushedStep ? (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="-ml-1.5 shrink-0"
                onClick={goBackToInfo}
                aria-label={leftT('back')}
              >
                <Icon icon={ArrowLeft} className="size-4" />
              </Button>
              <BottomSheetTitle className="min-w-0 flex-1 truncate text-left">
                {pushedTitle}
              </BottomSheetTitle>
            </div>
          ) : (
            <BottomSheetTitle>{t('bridges.checkout')}</BottomSheetTitle>
          )}
        </BottomSheetHeader>

        <BottomSheetBody className="flex min-h-0 flex-1 flex-col overflow-hidden pb-2">
          <div key={step} className={cn('min-h-0 flex-1', sheetStepMotionClass(slideFrom))}>
            {step === 'confirmLeft' ? (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {leftT('confirmDescription')}
              </p>
            ) : step === 'lateCheckout' && lateCheckoutDetails ? (
              <GuestExtraDetailsBody details={lateCheckoutDetails} />
            ) : (
              <div className="space-y-4">{rows}</div>
            )}
          </div>
        </BottomSheetBody>

        {step === 'confirmLeft' ? (
          <BottomSheetFooter>
            <Button
              type="button"
              className="w-full"
              disabled={presenceBusy}
              onClick={() => void handleConfirmLeft()}
            >
              {leftT('confirmLabel')}
            </Button>
          </BottomSheetFooter>
        ) : null}

        {step === 'lateCheckout' && lateCheckoutDetails?.hasActions ? (
          <BottomSheetFooter>
            <GuestExtraDetailsActions details={lateCheckoutDetails} />
          </BottomSheetFooter>
        ) : null}
      </BottomSheetContent>
    </BottomSheet>
  );
}
