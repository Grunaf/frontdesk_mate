'use client';

import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { Icon } from '@/shared/ui';
import type { GuestRecommendation } from '../model/guestRecommendation';
import { resolveRecommendationThumbnailIcon } from '../lib/resolveRecommendationIcon';
import { buildUtilityTriggerLabel } from '../lib/resolveUtilityLabel';

interface UtilityPlaceRowProps {
  recommendation: GuestRecommendation;
  openInMapsLabel: string;
}

export function UtilityPlaceRow({ recommendation, openInMapsLabel }: UtilityPlaceRowProps) {
  const RowIcon = resolveRecommendationThumbnailIcon(recommendation);
  const meta = recommendation.walkHint;

  if (!recommendation.mapsUrl) {
    return (
      <div className="flex min-h-12 items-center gap-3 px-3 py-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Icon icon={RowIcon} className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{recommendation.name}</p>
          {meta ? <p className="truncate text-xs text-muted-foreground">{meta}</p> : null}
        </div>
      </div>
    );
  }

  return (
    <a
      href={recommendation.mapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex min-h-12 items-center gap-3 px-3 py-2 transition-colors hover:bg-muted/50 active:bg-muted/70"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Icon icon={RowIcon} className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{recommendation.name}</p>
        {meta ? <p className="truncate text-xs text-muted-foreground">{meta}</p> : null}
      </div>
      <span className="hidden text-xs font-medium text-muted-foreground sm:inline">{openInMapsLabel}</span>
      <Icon icon={ChevronRight} className="h-4 w-4 shrink-0 text-muted-foreground" />
    </a>
  );
}

interface EssentialsSectionProps {
  utilities: GuestRecommendation[];
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  highlight?: boolean;
  title: string;
  subtitle: string;
  expandLabel: string;
  collapseLabel: string;
  openInMapsLabel: string;
  t: (key: string) => string;
}

export function EssentialsSection({
  utilities,
  expanded,
  onExpandedChange,
  highlight = false,
  title,
  subtitle,
  expandLabel,
  collapseLabel,
  openInMapsLabel,
  t,
}: EssentialsSectionProps) {
  if (utilities.length === 0) {
    return null;
  }

  const triggerLabel = buildUtilityTriggerLabel(utilities, t);

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{title}</h3>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>

      <div
        className={cn(
          'overflow-hidden rounded-lg border bg-card',
          highlight ? 'border-primary/30 ring-1 ring-primary/10' : 'border-border'
        )}
      >
        <button
          type="button"
          onClick={() => onExpandedChange(!expanded)}
          aria-expanded={expanded}
          className="flex min-h-12 w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-muted/40"
        >
          <Icon icon={ChevronDown} className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', expanded ? 'rotate-0' : '-rotate-90')} />
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{triggerLabel}</span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {expanded ? collapseLabel : expandLabel}
          </span>
        </button>

        {expanded ? (
          <div className="divide-y border-t">
            {utilities.map((utility) => (
              <UtilityPlaceRow
                key={utility.id}
                recommendation={utility}
                openInMapsLabel={openInMapsLabel}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
