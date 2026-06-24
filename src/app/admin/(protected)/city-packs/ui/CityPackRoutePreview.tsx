'use client';

import { useMemo, useState } from 'react';
import type { RouteId } from '@/entities/hostel';
import { ROUTE_PRESETS, type CityPackContent } from '@/entities/city-pack';
import type { AppLocale } from '@/entities/city-pack/model/types';
import { resolveCityPackForGuest } from '@/entities/city-pack/lib/resolveCityPackForGuest';
import { applyTemplate } from '@/entities/city-pack/model/localized';
import { cn } from '@/shared/lib/utils';
import { Icon } from '@/shared/ui';
import { Bus, Clock3, Footprints, Ticket, Train } from 'lucide-react';
import { isWalkOnlyRoute, type RouteConfig } from '@/entities/hostel';
import { useAdminEditingLocale } from './AdminLocaleEditContext';

function getRouteIcon(route: RouteConfig) {
  if (isWalkOnlyRoute(route)) {
    return Footprints;
  }

  return route.category === 'train' ? Train : Bus;
}

export function CityPackRoutePreview({
  packId,
  content,
  locale: localeOverride,
}: {
  packId: string;
  content: CityPackContent;
  locale?: AppLocale;
}) {
  const { locale: contextLocale } = useAdminEditingLocale();
  const locale = localeOverride ?? contextLocale;
  const enabledRoutes = content.enabledRoutes ?? [];
  const [activeRouteId, setActiveRouteId] = useState<RouteId | null>(enabledRoutes[0] ?? null);

  const resolvedPack = useMemo(
    () =>
      resolveCityPackForGuest({
        packId,
        locale,
        content,
        packStatus: 'ready',
        enabledRoutes,
      }),
    [content, enabledRoutes, locale, packId]
  );

  const routeIds = enabledRoutes.filter((routeId) => resolvedPack.routes[routeId]);
  const activeRoute =
    activeRouteId && resolvedPack.routes[activeRouteId]
      ? resolvedPack.routes[activeRouteId]
      : routeIds[0]
        ? resolvedPack.routes[routeIds[0]]
        : undefined;

  if (routeIds.length === 0) {
    return (
      <p className="rounded-lg border border-dashed px-4 py-4 text-center text-sm text-muted-foreground">
        Enable at least one hub to preview guest arrival cards.
      </p>
    );
  }

  const copy = activeRoute?.guestCopy;
  const RouteIcon = activeRoute ? getRouteIcon(activeRoute) : Bus;
  const walkOnly = activeRoute ? isWalkOnlyRoute(activeRoute) : false;
  const previewAddress = 'Dalmatinska 6';
  const walkToHostel = copy?.publicWalkToHostel
    ? applyTemplate(copy.publicWalkToHostel, { address: previewAddress })
    : '';

  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        Guest preview · {locale.toUpperCase()}
      </p>

      <div className="flex flex-wrap gap-1.5">
        {routeIds.map((routeId) => {
          const preset = ROUTE_PRESETS.find((route) => route.id === routeId);
          return (
            <button
              key={routeId}
              type="button"
              onClick={() => setActiveRouteId(routeId)}
              className={cn(
                'rounded-full border px-2.5 py-0.5 text-[11px] font-medium',
                (activeRouteId ?? routeIds[0]) === routeId
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'bg-background text-muted-foreground'
              )}
            >
              {preset?.label ?? routeId}
            </button>
          );
        })}
      </div>

      {copy && activeRoute ? (
        <div className="overflow-hidden rounded-lg border bg-card">
          <div className="space-y-2.5 p-3">
            <div className="flex items-start gap-3">
              <div className="shrink-0 rounded-lg bg-muted p-1.5 text-muted-foreground">
                <Icon icon={RouteIcon} className="h-4 w-4" />
              </div>
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-semibold text-foreground">{copy.publicTitle}</p>
                <p className="text-xs leading-relaxed text-foreground/90">{copy.publicSummary}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {(copy.fareLabel || activeRoute.metadata.publicTransport.ticketPrice) && (
                <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-[10px]">
                  <Icon icon={Ticket} className="h-3 w-3 text-muted-foreground" />
                  {copy.fareLabel ?? `${activeRoute.metadata.publicTransport.ticketPrice?.kioskKM} KM`}
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-[10px]">
                <Icon icon={Clock3} className="h-3 w-3 text-muted-foreground" />
                {activeRoute.metadata.publicTransport.durationMin} min
              </span>
            </div>

            {!walkOnly && <p className="text-[11px] font-medium text-foreground">{copy.publicGetOffAt}</p>}

            <p className="text-[11px] leading-relaxed text-foreground/90">
              {walkOnly ? walkToHostel : `Final walk: ${walkToHostel}`}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
