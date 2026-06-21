'use client';

import { ChevronRight } from 'lucide-react';
import { Badge, Card, Icon } from '@/shared/ui';
import { cn } from '@/shared/lib/utils';
import type { GuestRecommendation } from '../model/guestRecommendation';
import {
  buildMetaLine,
  isTopPickRecommendation,
  resolvePrimaryBadge,
} from '../model/guestRecommendation';
import { resolveRecommendationThumbnailIcon } from '../lib/resolveRecommendationIcon';

function RecommendationThumbnail({
  recommendation,
}: {
  recommendation: GuestRecommendation;
}) {
  const ThumbnailIcon = resolveRecommendationThumbnailIcon(recommendation);

  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-border/40 bg-muted text-muted-foreground">
      <Icon icon={ThumbnailIcon} className="h-5 w-5" />
    </div>
  );
}

export interface RecommendationCardProps {
  recommendation: GuestRecommendation;
  activeTab?: string;
  categoryLabel?: string;
  openInMapsLabel: string;
  topPickLabel?: string;
  className?: string;
}

export function RecommendationCard({
  recommendation,
  activeTab = 'all',
  categoryLabel,
  openInMapsLabel,
  topPickLabel,
  className,
}: RecommendationCardProps) {
  const isNearHostel = recommendation.scope === 'hostel';
  const isTopPick = isTopPickRecommendation(recommendation);
  const metaLine = buildMetaLine(recommendation, { activeTab, categoryLabel });
  const primaryBadge = resolvePrimaryBadge(recommendation, topPickLabel);

  return (
    <Card
      className={cn(
        'gap-0 overflow-hidden p-0',
        isTopPick && !isNearHostel ? 'border-primary/30 bg-primary/5' : '',
        className
      )}
    >
      <div className="space-y-0 p-4">
        <div className="flex items-start gap-3">
          <RecommendationThumbnail recommendation={recommendation} />

          <div className="min-w-0 flex-1 space-y-1">
            <h4 className="line-clamp-2 text-base leading-snug font-bold text-foreground">
              {recommendation.name}
            </h4>

            {primaryBadge ? (
              <Badge variant="outline" className="text-[11px] font-semibold tracking-wide uppercase">
                {primaryBadge.label}
              </Badge>
            ) : null}

            {metaLine ? (
              <p className="truncate text-xs font-medium text-muted-foreground">{metaLine}</p>
            ) : null}

            {recommendation.why ? (
              <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                {recommendation.why}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {recommendation.mapsUrl ? (
        <a
          href={recommendation.mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-[44px] items-center justify-between border-t px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/50 active:bg-muted/70"
        >
          <span>{openInMapsLabel}</span>
          <Icon icon={ChevronRight} className="h-4 w-4 shrink-0 text-muted-foreground" />
        </a>
      ) : null}
    </Card>
  );
}
