'use client';

import { useTranslations } from '@/shared/i18n';
import type { ArrivalBannerKeys } from '@/entities/tenant';
import { Icon } from '@/shared/ui';
import { Bell, MapPin, Moon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type BannerVariant = 'day' | 'night' | 'landmark';

interface ArrivalBannerProps {
  variant: BannerVariant;
  keys: ArrivalBannerKeys;
  checkInTime?: string;
}

function resolveIcon(variant: BannerVariant, hasIcon: boolean): LucideIcon | null {
  if (variant === 'landmark') return MapPin;
  if (variant === 'night') return Moon;
  if (hasIcon) return Bell;
  return null;
}

export function ArrivalBanner({ variant, keys, checkInTime }: ArrivalBannerProps) {
  const t = useTranslations('domains.hostel.enter');
  const IconComponent = resolveIcon(variant, keys.hasIcon);
  const isNight = variant === 'night';
  const isLandmark = variant === 'landmark';

  const containerClass = isNight
    ? 'bg-foreground text-background border-border p-4 flex-col items-start gap-2'
    : isLandmark
      ? 'bg-card text-foreground border-border p-4 flex-col items-start gap-2'
      : 'bg-muted text-muted-foreground border-border p-3 items-center gap-3';

  const titleClass = isNight
    ? 'text-xs font-bold uppercase tracking-wider text-primary'
    : isLandmark
      ? 'text-xs font-bold uppercase tracking-wider text-muted-foreground'
      : 'font-semibold text-foreground mb-0.5';

  const needsTimeParam =
    keys.titleKey.includes('night') || keys.titleKey.includes('nightPreview');

  const title = needsTimeParam
    ? t(keys.titleKey, { time: checkInTime ?? '' })
    : t(keys.titleKey);

  return (
    <div className={`animate-fade-in flex rounded-xl border shadow-sm ${containerClass}`}>
      {IconComponent && (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border bg-card text-xl">
          <Icon icon={IconComponent} className="h-5 w-5 text-muted-foreground" />
        </div>
      )}

      <div className="text-xs leading-relaxed">
        <h4 className={titleClass}>{title}</h4>
        <p className="text-xs leading-relaxed text-muted-foreground">{t(keys.bannerKey)}</p>
      </div>
    </div>
  );
}
