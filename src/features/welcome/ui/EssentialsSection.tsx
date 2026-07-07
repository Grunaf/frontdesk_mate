'use client';

import { ArrowUpRight } from 'lucide-react';
import { Icon } from '@/shared/ui';
import { cn } from '@/shared/lib/utils';
import type { GuestRecommendation } from '../model/guestRecommendation';
import { resolveUtilityShortLabel } from '../lib/resolveUtilityLabel';

interface EssentialsChipProps {
  recommendation: GuestRecommendation;
  label: string;
  openInMapsLabel: string;
}

function EssentialsChip({ recommendation, label, openInMapsLabel }: EssentialsChipProps) {
  const isLink = Boolean(recommendation.mapsUrl);
  const placeName = recommendation.name.trim();
  const className = cn(
    'flex w-[160px] shrink-0 snap-start items-start gap-1.5 rounded-2xl border border-border bg-background px-3.5 py-2.5 text-left',
    isLink &&
      'transition-[colors,transform] hover:bg-muted/40 active:scale-[0.98] active:bg-muted/60'
  );

  const content = (
    <>
      <span className="min-w-0 flex-1 space-y-0.5">
        <span className="text-foreground block truncate text-sm font-medium leading-snug">
          {label}
        </span>
        {placeName ? (
          <span className="text-muted-foreground block truncate text-xs leading-snug">
            {placeName}
          </span>
        ) : null}
      </span>
      {isLink ? (
        <Icon
          icon={ArrowUpRight}
          className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0"
          aria-hidden
        />
      ) : null}
    </>
  );

  if (!recommendation.mapsUrl) {
    return <div className={className}>{content}</div>;
  }

  return (
    <a
      href={recommendation.mapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      aria-label={`${label}, ${placeName} — ${openInMapsLabel}`}
    >
      {content}
    </a>
  );
}

interface EssentialsSectionProps {
  utilities: GuestRecommendation[];
  limit?: number;
  openInMapsLabel: string;
  t: (key: string) => string;
}

export function EssentialsSection({
  utilities,
  limit,
  openInMapsLabel,
  t,
}: EssentialsSectionProps) {
  if (utilities.length === 0) {
    return null;
  }

  const visibleUtilities = limit != null ? utilities.slice(0, limit) : utilities;

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
          {t('essentials.title')}
        </h3>
        <p className="text-muted-foreground text-xs">{t('essentials.subtitle')}</p>
      </div>
      <div className="-mx-4 overflow-x-auto overscroll-x-contain px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max snap-x snap-mandatory gap-2 pr-4">
          {visibleUtilities.map((utility) => (
            <EssentialsChip
              key={utility.id}
              recommendation={utility}
              label={resolveUtilityShortLabel(utility, t)}
              openInMapsLabel={openInMapsLabel}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
