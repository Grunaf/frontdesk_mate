import { useTranslations } from '@/shared/i18n';
import { Icon } from '@/shared/ui';
import { Bell } from 'lucide-react';

interface ArrivalGuideBannerProps {
  isNightMode: boolean;
  checkInTime: string;
}

export function ArrivalGuideBanner({ isNightMode, checkInTime }: ArrivalGuideBannerProps) {
  const t = useTranslations('domains.hostel.enter');

  const config = isNightMode
    ? {
        containerClass:
          'bg-foreground text-background border-border p-4 flex-col items-start gap-2',
        titleClass: 'text-xs font-bold uppercase tracking-wider text-primary',
        descClass: 'text-xs leading-relaxed text-muted-foreground',
        title: t('guide.night.title', { time: checkInTime }),
        banner: t('guide.night.banner'),
        hasIcon: false,
      }
    : {
        containerClass: 'bg-muted text-muted-foreground border-border p-3 items-center gap-3',
        titleClass: 'font-semibold text-foreground mb-0.5',
        descClass: 'text-xs leading-relaxed text-muted-foreground',
        title: t('guide.day.title'),
        banner: t('guide.day.banner'),
        hasIcon: true,
      };

  return (
    <div className={`animate-fade-in flex rounded-xl border shadow-sm ${config.containerClass}`}>
      {config.hasIcon && (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border bg-card text-xl">
          <Icon icon={Bell} className="h-5 w-5 text-muted-foreground" />
        </div>
      )}

      <div className="text-xs leading-relaxed">
        <h4 className={config.titleClass}>{config.title}</h4>
        <p className={config.descClass}>{config.banner}</p>
      </div>
    </div>
  );
}
