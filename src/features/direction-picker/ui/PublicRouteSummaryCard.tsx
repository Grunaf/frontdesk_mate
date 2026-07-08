'use client';

import { useTranslations } from '@/shared/i18n';
import { CardTitle, Icon } from '@/shared/ui';
import { ChevronRight, ExternalLink } from 'lucide-react';
import { hasOfficialRouteSchedule, isTenantLocalRoute, type RouteConfig } from '@/entities/hostel';
import { resolveRouteCopyField } from '../lib/resolveRouteCopy';
import { getRouteDisplayIcon, TransitLegMeta } from './PublicRouteItinerary';

export function PublicRouteSummaryCard({
  route,
  alternativeRoute,
  primaryTitle,
  primarySummary,
  alternativeTitle,
  alternativeSummary,
  onPrimaryRouteClick,
  onAlternativeRouteClick,
}: {
  route: RouteConfig;
  alternativeRoute?: RouteConfig;
  primaryTitle?: string;
  primarySummary?: string;
  alternativeTitle?: string;
  alternativeSummary?: string;
  onPrimaryRouteClick: () => void;
  onAlternativeRouteClick?: () => void;
}) {
  const routes = useTranslations();
  const directions = useTranslations('pages.arrivalJourney.directions');
  const RouteIcon = getRouteDisplayIcon(route);
  const AlternativeRouteIcon = alternativeRoute ? getRouteDisplayIcon(alternativeRoute) : null;
  const showOfficialSchedule = hasOfficialRouteSchedule(route) && !isTenantLocalRoute(route);
  const title = primaryTitle ?? resolveRouteCopyField(route, 'publicTitle', routes);
  const summary = primarySummary ?? resolveRouteCopyField(route, 'publicSummary', routes);

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <button
          type="button"
          onClick={onPrimaryRouteClick}
          className="flex w-full items-start gap-4 rounded-lg text-left transition-colors hover:bg-muted/30"
        >
          <div className="shrink-0 rounded-xl bg-muted p-2 text-muted-foreground">
            <Icon icon={RouteIcon} className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <CardTitle className="text-foreground">{title}</CardTitle>
            <p className="text-sm leading-relaxed text-foreground/90">{summary}</p>
            {!isTenantLocalRoute(route) ? (
              <TransitLegMeta route={route} routes={routes} directions={directions} />
            ) : null}
          </div>
          <Icon icon={ChevronRight} className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
        </button>

        {showOfficialSchedule && (
          <a
            href={route.metadata.publicTransport.officialRouteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            {directions('officialRouteLink')}
            <Icon icon={ExternalLink} className="h-3.5 w-3.5" />
          </a>
        )}
      </div>

      {alternativeRoute && onAlternativeRouteClick && AlternativeRouteIcon && (
        <button
          type="button"
          onClick={onAlternativeRouteClick}
          className="flex w-full items-start gap-4 rounded-lg pt-2 text-left transition-colors hover:bg-muted/30"
        >
          <div className="shrink-0 rounded-xl bg-muted p-2 text-muted-foreground">
            <Icon icon={AlternativeRouteIcon} className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <CardTitle className="text-sm text-foreground">
              {alternativeTitle ?? resolveRouteCopyField(alternativeRoute, 'publicTitle', routes)}
            </CardTitle>
            <p className="text-xs leading-relaxed text-foreground/90">
              {alternativeSummary ??
                resolveRouteCopyField(alternativeRoute, 'publicSummary', routes)}
            </p>
            {!isTenantLocalRoute(alternativeRoute) ? (
              <TransitLegMeta route={alternativeRoute} routes={routes} directions={directions} />
            ) : null}
          </div>
          <Icon icon={ChevronRight} className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}
