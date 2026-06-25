'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { resolveGuestExtrasForGuest } from '@/entities/guest-extra';
import { resolveGuestStayPlan, useHostelConfig, useTenant } from '@/entities/tenant';
import { shouldShowPreTripLuggage } from '@/entities/tenant/lib/resolveGuestFieldPresentation';
import { useGuestSession } from '@/features/guest-check-in';
import { GuestExtraSheet } from '@/features/guest-services/ui/GuestExtraSheet';
import {
  formatGuestStayCheckoutShort,
  formatStayReference,
  resolveGuestStayBedLabel,
} from '@/features/guest-stay-chip';
import { useLocale, useTranslations } from '@/shared/i18n';
import {
  BottomSheet,
  BottomSheetBody,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
  BOTTOM_SHEET_SIZES,
  Button,
  Icon,
  Separator,
} from '@/shared/ui';
import { Briefcase, Clock, LogOut, Moon, type LucideIcon } from 'lucide-react';

interface StayEssentialsCheckoutSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface InfoRowProps {
  icon: LucideIcon;
  title: string;
  description?: string;
}

function InfoRow({ icon, title, description }: InfoRowProps) {
  return (
    <div className="flex items-start gap-3">
      <Icon icon={icon} className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="space-y-1.5">
        <p className="text-sm leading-snug font-medium text-foreground">{title}</p>
        {description ? (
          <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
    </div>
  );
}

export function StayEssentialsCheckoutSheet({
  open,
  onOpenChange,
}: StayEssentialsCheckoutSheetProps) {
  const t = useTranslations('components.stayEssentials');
  const checkoutT = useTranslations('components.stayEssentials.checkout');
  const commonT = useTranslations('domains.hostel.common');
  const tBed = useTranslations('components.findYourBed');
  const { settings } = useTenant();
  const hostel = useHostelConfig();
  const locale = useLocale();
  const { session, checkOutAt } = useGuestSession();
  const [lateExtraOpen, setLateExtraOpen] = useState(false);

  const checkOutTime = hostel.checkOutTime?.trim();
  const showLuggage = shouldShowPreTripLuggage(settings);

  const lateCheckoutExtra = useMemo(
    () =>
      resolveGuestExtrasForGuest(settings, true).find((extra) => extra.presetId === 'late_checkout') ??
      null,
    [settings]
  );

  const personalCheckout = checkOutAt
    ? formatGuestStayCheckoutShort(checkOutAt, locale)
    : null;

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

  const rows: ReactNode[] = [];

  if (checkOutTime) {
    rows.push(
      <InfoRow
        key="checkout-time"
        icon={Clock}
        title={checkoutT('checkOutUntil', { time: checkOutTime })}
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

  rows.push(<Separator key="sep-late" />);
  rows.push(
    <div key="late-checkout" className="space-y-2">
      <InfoRow icon={LogOut} title={checkoutT('lateCheckoutHint')} />
      {lateCheckoutExtra ? (
        <Button
          type="button"
          variant="link"
          className="h-auto px-0 text-sm"
          onClick={() => setLateExtraOpen(true)}
        >
          {checkoutT('lateCheckoutLink')}
        </Button>
      ) : null}
    </div>
  );

  return (
    <>
      <BottomSheet open={open} onOpenChange={onOpenChange}>
        <BottomSheetContent size={BOTTOM_SHEET_SIZES.medium} className="flex flex-col">
          <BottomSheetHeader>
            <BottomSheetTitle>{t('bridges.checkout')}</BottomSheetTitle>
          </BottomSheetHeader>

          <BottomSheetBody className="flex flex-1 flex-col pb-2">
            <div className="space-y-4">{rows}</div>
          </BottomSheetBody>
        </BottomSheetContent>
      </BottomSheet>

      <GuestExtraSheet
        extra={lateCheckoutExtra}
        open={lateExtraOpen}
        onOpenChange={setLateExtraOpen}
        bedLabel={bedLabel}
        stayRef={stayRef}
      />
    </>
  );
}
