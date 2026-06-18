'use client';

import { useTranslations } from '@/shared/i18n';
import { Button, CardTitle, Icon } from '@/shared/ui';
import { ChevronRight, ExternalLink } from 'lucide-react';
import { hasOfficialRouteSchedule, type RouteConfig } from '@/entities/hostel';
import { getTransitIcon, TransitLegMeta } from './PublicRouteItinerary';

export function PublicRouteSummaryCard({
  route,
  alternativeRoute,
  onStepByStepClick,
  onAlternativeRouteClick,
}: {
  route: RouteConfig;
  alternativeRoute?: RouteConfig;
  onStepByStepClick: () => void;
  onAlternativeRouteClick?: () => void;
}) {
  const routes = useTranslations();
  const directions = useTranslations('pages.arrivalJourney.directions');
  const TransitIcon = getTransitIcon(route.category);
  const AlternativeTransitIcon = alternativeRoute ? getTransitIcon(alternativeRoute.category) : null;
  const showOfficialSchedule = hasOfficialRouteSchedule(route);

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="space-y-3 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {directions('recommendedTitle')}
        </p>

        <div className="flex items-start gap-4">
          <div className="shrink-0 rounded-xl bg-muted p-2 text-muted-foreground">
            <Icon icon={TransitIcon} className="h-5 w-5" />
          </div>
          <div className="min-w-0 space-y-2">
            <CardTitle className="text-foreground">{routes(route.translationKeys.publicTitle)}</CardTitle>
            <p className="text-sm leading-relaxed text-foreground/90">
              {routes(route.translationKeys.publicSummary)}
            </p>
          </div>
        </div>

        <TransitLegMeta route={route} routes={routes} directions={directions} />

        <p className="text-xs font-medium text-foreground">{routes(route.translationKeys.publicGetOffAt)}</p>

        <div className="flex gap-2">
          <Button type="button" variant="default" size="sm" className="flex-1" onClick={onStepByStepClick}>
            {directions('stepByStep')}
          </Button>
          {showOfficialSchedule && (
            <Button asChild variant="outline" size="sm" className="flex-1">
              <a
                href={route.metadata.publicTransport.officialRouteUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {directions('officialRouteLink')}
                <Icon icon={ExternalLink} className="h-3.5 w-3.5" />
              </a>
            </Button>
          )}
        </div>
      </div>

      {alternativeRoute && onAlternativeRouteClick && AlternativeTransitIcon && (
        <button
          type="button"
          onClick={onAlternativeRouteClick}
          className="flex w-full flex-col gap-2 border-t bg-muted/20 p-4 text-left transition-colors hover:bg-muted/40"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {directions('otherPublicRoute')}
          </p>
          <div className="flex w-full items-start gap-4">
            <div className="shrink-0 rounded-xl bg-muted p-2 text-muted-foreground">
              <Icon icon={AlternativeTransitIcon} className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <CardTitle className="text-sm text-foreground">
                {routes(alternativeRoute.translationKeys.publicTitle)}
              </CardTitle>
              <p className="text-xs leading-relaxed text-foreground/90">
                {routes(alternativeRoute.translationKeys.publicSummary)}
              </p>
              <TransitLegMeta route={alternativeRoute} routes={routes} directions={directions} />
            </div>
            <Icon icon={ChevronRight} className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
          </div>
        </button>
      )}
    </div>
  );
}
