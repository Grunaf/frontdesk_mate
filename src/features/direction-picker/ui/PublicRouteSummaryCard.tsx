'use client';

import { useTranslations, useLocale } from '@/shared/i18n';
import { useTenant } from '@/entities/tenant';
import { CardTitle, Icon } from '@/shared/ui';
import { ChevronRight, ExternalLink } from 'lucide-react';
import { hasOfficialRouteSchedule, isWalkOnlyRoute, type RouteConfig } from '@/entities/hostel';
import type { AppLocale } from '@/entities/city-pack/model/types';
import { resolveRouteCopyField } from '../lib/resolveRouteCopy';
import {
  getRouteDisplayIcon,
  resolveWalkToHostelText,
  TransitLegMeta,
} from './PublicRouteItinerary';

export function PublicRouteSummaryCard({
  route,
  alternativeRoute,
  onPrimaryRouteClick,
  onAlternativeRouteClick,
}: {
  route: RouteConfig;
  alternativeRoute?: RouteConfig;
  onPrimaryRouteClick: () => void;
  onAlternativeRouteClick?: () => void;
}) {
  const { settings, hostel } = useTenant();
  const routes = useTranslations();
  const locale = useLocale() as AppLocale;
  const directions = useTranslations('pages.arrivalJourney.directions');
  const RouteIcon = getRouteDisplayIcon(route);
  const AlternativeRouteIcon = alternativeRoute ? getRouteDisplayIcon(alternativeRoute) : null;
  const showOfficialSchedule = hasOfficialRouteSchedule(route);
  const walkOnly = isWalkOnlyRoute(route);
  const address = hostel.contacts.address.display ?? '';

  const walkToHostel = resolveWalkToHostelText({
    route,
    routes,
    settings,
    address,
    locale,
  });

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
            <CardTitle className="text-foreground">
              {resolveRouteCopyField(route, 'publicTitle', routes)}
            </CardTitle>
            <p className="text-sm leading-relaxed text-foreground/90">
              {resolveRouteCopyField(route, 'publicSummary', routes)}
            </p>
            <TransitLegMeta route={route} routes={routes} directions={directions} />
            {walkOnly && (
              <p className="text-xs leading-relaxed text-foreground/90">{walkToHostel}</p>
            )}
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
              {resolveRouteCopyField(alternativeRoute, 'publicTitle', routes)}
            </CardTitle>
            <p className="text-xs leading-relaxed text-foreground/90">
              {resolveRouteCopyField(alternativeRoute, 'publicSummary', routes)}
            </p>
            <TransitLegMeta route={alternativeRoute} routes={routes} directions={directions} />
          </div>
          <Icon icon={ChevronRight} className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}
