'use client';

import type { ReactNode } from 'react';
import { useHostelConfig, useTenant } from '@/entities/tenant';
import {
  shouldShowPreTripLuggage,
  shouldShowTimedGuestBanner,
} from '@/entities/tenant/lib/resolveGuestFieldPresentation';
import { useTranslations } from '@/shared/i18n';
import {
  BOTTOM_SHEET_SIZES,
  BottomSheet,
  BottomSheetBody,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
  Icon,
  Separator,
} from '@/shared/ui';
import { Briefcase, Car, Clock, KeyRound, Users, type LucideIcon } from 'lucide-react';

const HELP_BULLET_KEYS = ['checkIn', 'luggage', 'laundry', 'tours', 'lateCheckout'] as const;

interface StayEssentialsReceptionSheetProps {
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

export function StayEssentialsReceptionSheet({
  open,
  onOpenChange,
}: StayEssentialsReceptionSheetProps) {
  const t = useTranslations('components.stayEssentials');
  const receptionT = useTranslations('components.stayEssentials.reception');
  const commonT = useTranslations('domains.hostel.common');
  const { settings } = useTenant();
  const hostel = useHostelConfig();

  const receptionOpen = hostel.reception.time.open?.trim();
  const receptionClose = hostel.reception.time.close?.trim();
  const availabilityHint = hostel.reception.availabilityHint?.trim();
  const showLuggage = shouldShowPreTripLuggage(settings);
  const showSelfCheckInAfter = shouldShowTimedGuestBanner(hostel.selfCheckInTimeAfter);
  const showTaxiViaReception = hostel.reception.canHelpWithTaxi;

  const rows: ReactNode[] = [];

  if (receptionOpen && receptionClose) {
    rows.push(
      <InfoRow
        key="hours"
        icon={Clock}
        title={receptionT('hoursTitle')}
        description={receptionT('hours', { open: receptionOpen, close: receptionClose })}
      />
    );
  }

  if (availabilityHint) {
    if (rows.length > 0) {
      rows.push(<Separator key="sep-hint" />);
    }

    rows.push(
      <InfoRow key="availability-hint" icon={Users} title={availabilityHint} />
    );
  }

  if (rows.length > 0) {
    rows.push(<Separator key="sep-help" />);
  }

  rows.push(
    <div key="help-with" className="space-y-2">
      <p className="text-sm font-medium text-foreground">{receptionT('helpWithTitle')}</p>
      <ul className="space-y-1.5 text-xs leading-relaxed text-muted-foreground">
        {HELP_BULLET_KEYS.map((key) => (
          <li key={key} className="flex gap-2">
            <span aria-hidden="true" className="text-muted-foreground/70">
              •
            </span>
            <span>{receptionT(`helpBullets.${key}`)}</span>
          </li>
        ))}
      </ul>
    </div>
  );

  if (showTaxiViaReception) {
    rows.push(<Separator key="sep-taxi" />);
    rows.push(
      <InfoRow
        key="taxi"
        icon={Car}
        title={receptionT('taxiViaReception')}
      />
    );
  }

  if (showLuggage) {
    rows.push(<Separator key="sep-luggage" />);
    rows.push(
      <InfoRow
        key="luggage"
        icon={Briefcase}
        title={receptionT('luggageTitle')}
        description={commonT('timing.luggageAlert', { time: hostel.checkInTime ?? '' })}
      />
    );
  }

  if (showSelfCheckInAfter && hostel.selfCheckInTimeAfter?.trim()) {
    rows.push(<Separator key="sep-self-check-in" />);
    rows.push(
      <InfoRow
        key="self-check-in"
        icon={KeyRound}
        title={receptionT('selfCheckInAfter', { time: hostel.selfCheckInTimeAfter.trim() })}
      />
    );
  }

  rows.push(<Separator key="sep-footer" />);
  rows.push(
    <p key="footer-hint" className="text-xs leading-relaxed text-muted-foreground">
      {receptionT('footerHint')}
    </p>
  );

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <BottomSheetContent size={BOTTOM_SHEET_SIZES.medium} className="flex flex-col">
        <BottomSheetHeader>
          <BottomSheetTitle>{t('bridges.reception')}</BottomSheetTitle>
        </BottomSheetHeader>

        <BottomSheetBody className="flex flex-1 flex-col pb-2">
          <div className="space-y-4">{rows}</div>
        </BottomSheetBody>
      </BottomSheetContent>
    </BottomSheet>
  );
}
