'use client';

import type { ReactNode } from 'react';
import { useTranslations } from '@/shared/i18n';
import { useHostelConfig, useTenant } from '@/entities/tenant';
import {
  shouldShowPreTripCheckIn,
  shouldShowPreTripCityTax,
  shouldShowPreTripLuggage,
} from '@/entities/tenant/lib/resolveGuestFieldPresentation';
import { Icon, Separator } from '@/shared/ui';
import { Banknote, Briefcase, Clock, KeyRound, Lock, type LucideIcon } from 'lucide-react';

interface InfoRowProps {
  icon: LucideIcon;
  title: string;
  description?: string;
}

function InfoRow({ icon, title, description }: InfoRowProps) {
  return (
    <div className="flex items-start gap-3">
      <Icon icon={icon} className="mt-0.5 h-4 w-4 text-muted-foreground" />
      <div className="space-y-1.5">
        <p className="text-sm leading-snug font-medium text-foreground">{title}</p>
        {description && (
          <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  );
}

interface PreparationSectionProps {
  heading: string;
  children: ReactNode;
}

function PreparationSection({ heading, children }: PreparationSectionProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold tracking-wide text-foreground uppercase">{heading}</h2>
      <div className="box-border space-y-4 rounded-xl border bg-muted p-4">{children}</div>
    </section>
  );
}

export function PreTripInfo() {
  const preparation = useTranslations('pages.arrivalJourney.preTrip');
  const common = useTranslations('domains.hostel.common');
  const { cityPack, settings } = useTenant();
  const paymentT = useTranslations(cityPack.locale.paymentNamespace);
  const preTripT = useTranslations(cityPack.locale.preTripNamespace);
  const hostel = useHostelConfig();
  const showSundayTip = cityPack.preTripTips?.includes('sundayClosure');
  const showCheckIn = shouldShowPreTripCheckIn(settings);
  const showCityTax = shouldShowPreTripCityTax(settings);
  const showLuggage = shouldShowPreTripLuggage(settings);

  const beforeTravelItems: ReactNode[] = [];

  if (showCheckIn) {
    beforeTravelItems.push(
      <InfoRow
        key="check-in"
        icon={Clock}
        title={common('timing.checkIn')}
        description={common('timing.checkInTime', {
          time: hostel.checkInTime ?? '',
        })}
      />
    );
  }

  if (showCityTax) {
    if (beforeTravelItems.length > 0) {
      beforeTravelItems.push(<Separator key="sep-tax" />);
    }
    beforeTravelItems.push(
      <InfoRow
        key="tax"
        icon={Banknote}
        title={paymentT('cashOnly')}
        description={common('payment.taxNote', { cost: hostel.cityTax ?? '' })}
      />
    );
  }

  if (showSundayTip) {
    if (beforeTravelItems.length > 0) {
      beforeTravelItems.push(<Separator key="sep-sunday" />);
    }
    beforeTravelItems.push(
      <InfoRow
        key="sunday"
        icon={Lock}
        title={preTripT('sundayClosure.title')}
        description={preTripT('sundayClosure.description')}
      />
    );
  }

  const onArrivalItems: ReactNode[] = [
    <InfoRow
      key="check-in-ready"
      icon={KeyRound}
      title={preparation('checkInReady.title')}
      description={preparation('checkInReady.description')}
    />,
  ];

  if (showLuggage) {
    onArrivalItems.push(<Separator key="sep-luggage" />);
    onArrivalItems.push(
      <InfoRow
        key="luggage"
        icon={Briefcase}
        title={preparation('luggage.title')}
        description={preparation('luggage.description', { time: hostel.checkInTime ?? '' })}
      />
    );
  }

  return (
    <div className="space-y-6 pt-4">
      {beforeTravelItems.length > 0 ? (
        <PreparationSection heading={preparation('sections.beforeTravel.heading')}>
          {beforeTravelItems}
        </PreparationSection>
      ) : null}

      <PreparationSection heading={preparation('sections.onArrival.heading')}>
        {onArrivalItems}
      </PreparationSection>
    </div>
  );
}
