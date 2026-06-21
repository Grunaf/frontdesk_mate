'use client';

import { useTranslations } from '@/shared/i18n';
import { useHostelConfig, useTenant } from '@/entities/tenant';
import { Icon, Separator } from '@/shared/ui';
import { Banknote, Briefcase, Clock, Lock, type LucideIcon } from 'lucide-react';

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

export function PreTripInfo() {
  const preparation = useTranslations('pages.arrivalJourney.preTrip');
  const common = useTranslations('domains.hostel.common');
  const { cityPack } = useTenant();
  const paymentT = useTranslations(cityPack.locale.paymentNamespace);
  const preTripT = useTranslations(cityPack.locale.preTripNamespace);
  const hostel = useHostelConfig();
  const showSundayTip = cityPack.preTripTips?.includes('sundayClosure');

  return (
    <div className="pt-4">
      <div className="box-border space-y-4 rounded-xl border bg-muted p-4">
        <InfoRow
          icon={Clock}
          title={common('timing.checkIn')}
          description={common('timing.checkInTime', {
            time: hostel.checkInTime ?? '',
          })}
        />

        <Separator />

        <InfoRow
          icon={Banknote}
          title={paymentT('cashOnly')}
          description={common('payment.taxNote', { cost: hostel.cityTax ?? '' })}
        />

        <Separator />

        <InfoRow
          icon={Briefcase}
          title={preparation('luggage.title')}
          description={preparation('luggage.description', { time: hostel.checkInTime ?? '' })}
        />

        {showSundayTip && (
          <>
            <Separator />
            <InfoRow
              icon={Lock}
              title={preTripT('sundayClosure.title')}
              description={preTripT('sundayClosure.description')}
            />
          </>
        )}
      </div>
    </div>
  );
}
