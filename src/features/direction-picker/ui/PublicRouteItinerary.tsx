'use client';

import { useTranslations } from '@/shared/i18n';
import { Icon } from '@/shared/ui';
import { Bus, Clock3, Footprints, Route, Ticket, Train, type LucideIcon } from 'lucide-react';
import {
  isWalkOnlyRoute,
  type RouteConfig,
} from '@/entities/hostel';
import { cn } from '@/shared/lib/utils';
import { resolveRouteCopyField, resolveRouteFareLabel } from '../lib/resolveRouteCopy';
import { resolveWalkToHostelText } from '../lib/resolveWalkToHostel';

function RouteTimelineLeg({
  icon,
  isLast,
  title,
  children,
}: {
  icon: LucideIcon;
  isLast?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center self-stretch">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full border bg-muted">
          <Icon icon={icon} className="h-4 w-4 text-muted-foreground" />
        </div>
        {!isLast && <div className="my-1 w-px min-h-4 flex-1 bg-border" />}
      </div>
      <div className={cn('min-w-0 flex-1', !isLast && 'pb-4')}>
        <p className="text-xs font-semibold text-foreground">{title}</p>
        <div className="mt-1">{children}</div>
      </div>
    </div>
  );
}

export function TransitLegMeta({
  route,
  routes,
  directions,
}: {
  route: RouteConfig;
  routes: ReturnType<typeof useTranslations>;
  directions: ReturnType<typeof useTranslations<'pages.arrivalJourney.directions'>>;
}) {
  const { ticketPrice, stops, durationMin, fareLabelKey } = route.metadata.publicTransport;
  const walkOnly = isWalkOnlyRoute(route);
  const fareLabel = resolveRouteFareLabel(route, routes);
  const showFareChip = Boolean(fareLabel || fareLabelKey || ticketPrice);

  return (
    <div className="flex flex-wrap gap-1.5">
      {showFareChip && (
        <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-xs text-foreground/90">
          <Icon icon={Ticket} className="h-3 w-3 text-muted-foreground" />
          {fareLabel
            ? fareLabel
            : fareLabelKey
            ? routes(fareLabelKey)
            : directions('labels.ticket', {
                kiosk: ticketPrice!.kioskKM.toFixed(2),
                driver: ticketPrice!.driverKM.toFixed(2),
              })}
        </span>
      )}
      {!walkOnly && stops !== undefined && (
        <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-xs text-foreground/90">
          <Icon icon={Route} className="h-3 w-3 text-muted-foreground" />
          {directions('labels.stops', { count: stops })}
        </span>
      )}
      <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-xs text-foreground/90">
        <Icon icon={Clock3} className="h-3 w-3 text-muted-foreground" />
        {directions('labels.duration', { minutes: durationMin })}
      </span>
    </div>
  );
}

export function getRouteDisplayIcon(route: RouteConfig): LucideIcon {
  if (isWalkOnlyRoute(route)) {
    return Footprints;
  }

  return route.category === 'train' ? Train : Bus;
}

export function PublicRouteItinerary({
  route,
  routes,
  directions,
  walkToHostel,
}: {
  route: RouteConfig;
  routes: ReturnType<typeof useTranslations>;
  directions: ReturnType<typeof useTranslations<'pages.arrivalJourney.directions'>>;
  walkToHostel: string;
}) {
  const walkOnly = isWalkOnlyRoute(route);
  const TransitIcon = getRouteDisplayIcon(route);

  if (walkOnly) {
    return (
      <div className="pt-1">
        <RouteTimelineLeg icon={Footprints} title={directions('legs.onFootRoute')}>
          <div className="space-y-2 rounded-lg border bg-muted/40 p-3">
            <p className="text-xs leading-relaxed text-foreground/90">
              {resolveRouteCopyField(route, 'publicText', routes)}
            </p>
            <TransitLegMeta route={route} routes={routes} directions={directions} />
          </div>
        </RouteTimelineLeg>

        <RouteTimelineLeg icon={Footprints} isLast title={directions('legs.walkToHostel')}>
          <p className="text-xs leading-relaxed text-foreground/90">{walkToHostel}</p>
        </RouteTimelineLeg>
      </div>
    );
  }

  return (
    <div className="pt-1">
      <RouteTimelineLeg icon={Footprints} title={directions('legs.walkToStop')}>
        <p className="text-xs leading-relaxed text-foreground/90">
          {resolveRouteCopyField(route, 'publicPreview', routes)}
        </p>
      </RouteTimelineLeg>

      <RouteTimelineLeg icon={TransitIcon} title={directions('legs.boardAndRide')}>
        <div className="space-y-2 rounded-lg border bg-muted/40 p-3">
          <p className="text-xs leading-relaxed text-foreground/90">
            {resolveRouteCopyField(route, 'publicText', routes)}
          </p>
          <TransitLegMeta route={route} routes={routes} directions={directions} />
          <p className="text-xs font-medium text-foreground">
            {resolveRouteCopyField(route, 'publicGetOffAt', routes)}
          </p>
        </div>
      </RouteTimelineLeg>

      <RouteTimelineLeg icon={Footprints} isLast title={directions('legs.walkToHostel')}>
        <p className="text-xs leading-relaxed text-foreground/90">{walkToHostel}</p>
      </RouteTimelineLeg>
    </div>
  );
}

export { resolveWalkToHostelText };
