'use client';

import { useTranslations } from '@/shared/i18n';
import { Icon } from '@/shared/ui';
import {
  Banknote,
  Bus,
  Clock3,
  Footprints,
  MapPin,
  Route,
  Ticket,
  Train,
  type LucideIcon,
} from 'lucide-react';
import {
  isTenantLocalRoute,
  isWalkOnlyRoute,
  type RouteConfig,
} from '@/entities/hostel';
import { cn } from '@/shared/lib/utils';
import { resolveRouteCopyField, resolveRouteFareLabel } from '../lib/resolveRouteCopy';
import type { ResolvedTenantLocalArrival } from '../lib/resolveTenantLocalArrival';
import { resolveWalkToHostelText } from '../lib/resolveWalkToHostel';
import { TouchLink } from '@/shared/ui';

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
        <p className="text-sm font-semibold text-foreground">{title}</p>
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
  const approxTicketPrice =
    ticketPrice ? Math.round((ticketPrice.kioskKM + ticketPrice.driverKM) / 2) : undefined;

  return (
    <div className="flex flex-wrap gap-1.5">
      {showFareChip && (
        <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-xs text-foreground/90">
          <Icon icon={Ticket} className="h-3 w-3 text-muted-foreground" />
          {fareLabel
            ? fareLabel
            : fareLabelKey
            ? routes(fareLabelKey)
            : directions('labels.ticketApprox', {
                value: approxTicketPrice!,
              })}
        </span>
      )}
      {!walkOnly && stops !== undefined && (
        <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-xs text-foreground/90">
          <Icon icon={Route} className="h-3 w-3 text-muted-foreground" />
          {directions('labels.stopsApprox', { count: stops })}
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
  if (isWalkOnlyRoute(route) || (isTenantLocalRoute(route) && route.routeMode !== 'transit')) {
    return Footprints;
  }

  return route.category === 'train' ? Train : Bus;
}

function PublicRouteGoodToKnow({ title, tips }: { title: string; tips: string[] }) {
  return (
    <div className="mt-4 border-t border-border/60 pt-4">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <ul className="mt-2 list-disc space-y-2 pl-4">
        {tips.map((tip, index) => (
          <li key={index} className="text-sm leading-relaxed text-foreground/90">
            {tip}
          </li>
        ))}
      </ul>
    </div>
  );
}

function dedupeTipsAgainstAdvice(
  tips: string[] | undefined,
  scheduleAdvice: string[] | undefined,
  ticketPaymentAdvice: string[] | undefined
): string[] | undefined {
  if (!tips?.length) {
    return undefined;
  }

  const adviceSet = new Set(
    [...(scheduleAdvice ?? []), ...(ticketPaymentAdvice ?? [])]
      .map((line) => line.trim().toLowerCase())
      .filter(Boolean)
  );

  const deduped = tips
    .map((tip) => tip.trim())
    .filter((tip) => tip.length > 0 && !adviceSet.has(tip.toLowerCase()))
    .slice(0, 2);

  return deduped.length ? deduped : undefined;
}

function TransitAdviceBlock({
  icon,
  title,
  lines,
}: {
  icon: LucideIcon;
  title: string;
  lines: string[];
}) {
  if (lines.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 rounded-lg border bg-muted/30 p-3">
      <div className="flex items-start gap-2">
        <Icon icon={icon} className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          {lines.map((line) => (
            <p key={line} className="text-sm leading-relaxed text-foreground/90">
              {line}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

function MapsCta({
  walkingMapsUrl,
  label,
}: {
  walkingMapsUrl?: string;
  label: string;
}) {
  if (!walkingMapsUrl) {
    return null;
  }
  return (
    <div className="mt-3">
      <TouchLink external href={walkingMapsUrl} className="text-sm">
        {label}
      </TouchLink>
    </div>
  );
}

function TenantLocalItinerary({
  local,
  directions,
  walkingMapsUrl,
  tips,
  scheduleAdvice,
  ticketPaymentAdvice,
}: {
  local: ResolvedTenantLocalArrival;
  directions: ReturnType<typeof useTranslations<'pages.arrivalJourney.directions'>>;
  walkingMapsUrl?: string;
  tips?: string[];
  scheduleAdvice?: string[];
  ticketPaymentAdvice?: string[];
}) {
  if (local.mode === 'walk') {
    return (
      <>
        <div className="pt-1">
          <RouteTimelineLeg icon={Footprints} isLast title={directions('legs.onFootRoute')}>
            <p className="text-sm leading-relaxed text-foreground/90">{local.primaryText}</p>
          </RouteTimelineLeg>
        </div>
        <MapsCta walkingMapsUrl={walkingMapsUrl} label={directions('openWalkingRouteInMaps')} />
        {tips?.length ? (
          <PublicRouteGoodToKnow title={directions('goodToKnow')} tips={tips} />
        ) : null}
      </>
    );
  }

  const showGetOff = local.getOffAt.length > 0;
  const showWalk = local.walkToHostel.length > 0;
  const walkIsLast = showWalk || !showGetOff;

  return (
    <>
      <div className="pt-1">
        <RouteTimelineLeg
          icon={Bus}
          isLast={!showGetOff && !showWalk}
          title={directions('legs.boardAndRide')}
        >
          <p className="text-sm leading-relaxed text-foreground/90">{local.primaryText}</p>
        </RouteTimelineLeg>

        {showGetOff ? (
          <RouteTimelineLeg
            icon={MapPin}
            isLast={!showWalk}
            title={directions('legs.getOff')}
          >
            <p className="text-sm leading-relaxed text-foreground/90">{local.getOffAt}</p>
          </RouteTimelineLeg>
        ) : null}

        {showWalk ? (
          <RouteTimelineLeg icon={Footprints} isLast={walkIsLast} title={directions('legs.walkToHostel')}>
            <p className="text-sm leading-relaxed text-foreground/90">{local.walkToHostel}</p>
          </RouteTimelineLeg>
        ) : null}
      </div>
      <div className="mt-2">
        <TransitAdviceBlock
          icon={Clock3}
          title={directions('transitAdvice.schedule.title')}
          lines={scheduleAdvice ?? []}
        />
        <TransitAdviceBlock
          icon={Banknote}
          title={directions('transitAdvice.payment.title')}
          lines={ticketPaymentAdvice ?? []}
        />
      </div>
      <MapsCta walkingMapsUrl={walkingMapsUrl} label={directions('openWalkingRouteInMaps')} />
      {tips?.length ? (
        <PublicRouteGoodToKnow title={directions('goodToKnow')} tips={tips} />
      ) : null}
    </>
  );
}

export function PublicRouteItinerary({
  route,
  routes,
  directions,
  walkToHostel,
  routeTips,
  walkingMapsUrl,
  getOffAt: getOffAtProp,
  tenantLocal,
}: {
  route: RouteConfig;
  routes: ReturnType<typeof useTranslations>;
  directions: ReturnType<typeof useTranslations<'pages.arrivalJourney.directions'>>;
  walkToHostel: string;
  /** City pack + tenant tips merged for locale. */
  routeTips?: string[];
  /** Google Maps walking directions when URL is stored. */
  walkingMapsUrl?: string;
  /** Effective get-off (tenant override || city). When omitted, uses city route copy. */
  getOffAt?: string;
  /** When set, renders one timeline from tenant (city legs unused). */
  tenantLocal?: ResolvedTenantLocalArrival;
}) {
  const scheduleAdvice = route.guestCopy?.transitScheduleAdvice?.slice(0, 2);
  const ticketPaymentAdvice = route.guestCopy?.transitTicketPayment?.slice(0, 2);
  const tips = dedupeTipsAgainstAdvice(
    routeTips ?? route.guestCopy?.tips,
    scheduleAdvice,
    ticketPaymentAdvice
  );

  if (tenantLocal && tenantLocal.primaryText) {
    return (
      <TenantLocalItinerary
        local={tenantLocal}
        directions={directions}
        walkingMapsUrl={walkingMapsUrl}
        tips={tips}
        scheduleAdvice={scheduleAdvice}
        ticketPaymentAdvice={ticketPaymentAdvice}
      />
    );
  }

  const walkOnly = isWalkOnlyRoute(route);
  const TransitIcon = getRouteDisplayIcon(route);
  const getOffAt =
    getOffAtProp?.trim() || resolveRouteCopyField(route, 'publicGetOffAt', routes).trim();
  const showGetOffLeg = !walkOnly && getOffAt.length > 0;

  if (walkOnly) {
    return (
      <>
        <div className="pt-1">
          <RouteTimelineLeg icon={Footprints} title={directions('legs.onFootRoute')}>
            <div className="space-y-2 rounded-lg border bg-muted/40 p-3">
              <p className="text-sm leading-relaxed text-foreground/90">
                {resolveRouteCopyField(route, 'publicText', routes)}
              </p>
              <TransitLegMeta route={route} routes={routes} directions={directions} />
            </div>
          </RouteTimelineLeg>

          <RouteTimelineLeg icon={Footprints} isLast title={directions('legs.walkToHostel')}>
            <p className="text-sm leading-relaxed text-foreground/90">{walkToHostel}</p>
          </RouteTimelineLeg>
        </div>
        <MapsCta walkingMapsUrl={walkingMapsUrl} label={directions('openWalkingRouteInMaps')} />
        {tips?.length ? (
          <PublicRouteGoodToKnow title={directions('goodToKnow')} tips={tips} />
        ) : null}
      </>
    );
  }

  return (
    <>
      <div className="pt-1">
      <RouteTimelineLeg icon={Footprints} title={directions('legs.walkToStop')}>
        <p className="text-sm leading-relaxed text-foreground/90">
          {resolveRouteCopyField(route, 'publicPreview', routes)}
        </p>
      </RouteTimelineLeg>

      <RouteTimelineLeg icon={TransitIcon} title={directions('legs.boardAndRide')}>
        <div className="space-y-2 rounded-lg border bg-muted/40 p-3">
          <p className="text-sm leading-relaxed text-foreground/90">
            {resolveRouteCopyField(route, 'publicText', routes)}
          </p>
          <TransitLegMeta route={route} routes={routes} directions={directions} />
        </div>
      </RouteTimelineLeg>

      {showGetOffLeg && (
        <RouteTimelineLeg icon={MapPin} title={directions('legs.getOff')}>
          <p className="text-sm leading-relaxed text-foreground/90">{getOffAt}</p>
        </RouteTimelineLeg>
      )}

      <RouteTimelineLeg icon={Footprints} isLast title={directions('legs.walkToHostel')}>
        <p className="text-sm leading-relaxed text-foreground/90">{walkToHostel}</p>
      </RouteTimelineLeg>
      </div>
      <div className="mt-2">
        <TransitAdviceBlock
          icon={Clock3}
          title={directions('transitAdvice.schedule.title')}
          lines={scheduleAdvice ?? []}
        />
        <TransitAdviceBlock
          icon={Banknote}
          title={directions('transitAdvice.payment.title')}
          lines={ticketPaymentAdvice ?? []}
        />
      </div>
      {tips?.length ? (
        <PublicRouteGoodToKnow title={directions('goodToKnow')} tips={tips} />
      ) : null}
    </>
  );
}

export { resolveWalkToHostelText };
