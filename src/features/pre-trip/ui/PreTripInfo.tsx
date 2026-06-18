import { useTranslations } from '@/shared/i18n';
import { HOSTEL_CONFIG } from '@/shared/config';
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
  const hostelInfo = useTranslations('domains.hostel');

  return (
    <div className="pt-4">
      <div className="box-border space-y-4 rounded-xl border bg-muted p-4">
        <InfoRow
          icon={Clock}
          title={hostelInfo('timing.checkIn')}
          description={hostelInfo('timing.checkInTime', {
            time: HOSTEL_CONFIG.checkInTime ?? '',
          })}
        />

        <Separator />

        <InfoRow
          icon={Banknote}
          title={hostelInfo('payment.cashOnly')}
          description={hostelInfo('payment.taxNote', { cost: HOSTEL_CONFIG.cityTax ?? '' })}
        />

        <Separator />

        <InfoRow
          icon={Briefcase}
          title={preparation('luggage.title')}
          description={preparation('luggage.description', { time: HOSTEL_CONFIG.checkInTime ?? '' })}
        />

        <Separator />

        <InfoRow
          icon={Lock}
          title={preparation('sundayClosure.title')}
          description={preparation('sundayClosure.description')}
        />
      </div>
    </div>
  );
}
