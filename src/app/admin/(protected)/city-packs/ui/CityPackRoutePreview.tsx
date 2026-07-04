'use client';

import { useMemo } from 'react';
import type { RouteId } from '@/entities/hostel';
import {
  formatRouteGateStatus,
  ROUTE_PRESETS,
  resolveCityPackTransportReadiness,
  type CityPackContent,
} from '@/entities/city-pack';
import type { AppLocale } from '@/entities/city-pack/model/types';
import { resolveCityPackForGuest } from '@/entities/city-pack/lib/resolveCityPackForGuest';
import { applyTemplate } from '@/entities/city-pack/model/localized';
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
  activeRouteId,
  locale: localeOverride,
}: {
  packId: string;
  content: CityPackContent;
  /** When set, preview focuses on this hub only. */
  activeRouteId?: RouteId | null;
  locale?: AppLocale;
}) {
  const { locale: contextLocale } = useAdminEditingLocale();
  const locale = localeOverride ?? contextLocale;
  const enabledRoutes = content.enabledRoutes ?? [];
  const focusedRouteId =
    activeRouteId && enabledRoutes.includes(activeRouteId)
      ? activeRouteId
      : (enabledRoutes[0] ?? null);

  const focusedContent = useMemo<CityPackContent>(() => {
    if (!focusedRouteId) {
      return { ...content, enabledRoutes: [] };
    }

    const route = content.routes?.[focusedRouteId];
    return {
      ...content,
      enabledRoutes: [focusedRouteId],
      routes: route ? { [focusedRouteId]: route } : {},
    };
  }, [content, focusedRouteId]);

  const readiness = useMemo(
    () => resolveCityPackTransportReadiness({ packId, content: focusedContent }),
    [focusedContent, packId]
  );

  const gateStatus = useMemo(
    () =>
      focusedRouteId
        ? formatRouteGateStatus(content.routes?.[focusedRouteId])
        : { ready: false, missingFields: [], statusLabel: 'Enable at least one hub' },
    [content.routes, focusedRouteId]
  );

  const resolvedPack = useMemo(
    () =>
      readiness.ready
        ? resolveCityPackForGuest({
            packId,
            locale,
            content: focusedContent,
            packStatus: 'ready',
            enabledRoutes: focusedContent.enabledRoutes,
          })
        : null,
    [focusedContent, locale, packId, readiness.ready]
  );

  if (enabledRoutes.length === 0 || !focusedRouteId) {
    return (
      <p className="rounded-lg border border-dashed px-4 py-4 text-center text-sm text-muted-foreground">
        Enable at least one hub to preview guest arrival cards.
      </p>
    );
  }

  const presetLabel =
    ROUTE_PRESETS.find((route) => route.id === focusedRouteId)?.label ?? focusedRouteId;

  if (!readiness.ready || !resolvedPack) {
    return (
      <div className="space-y-1 rounded-lg border border-dashed border-amber-200 bg-amber-50 px-4 py-4 text-center text-sm text-amber-900">
        <p className="text-[11px] font-medium uppercase tracking-wide text-amber-800/80">
          Preview · {presetLabel}
        </p>
        <p>{gateStatus.statusLabel}</p>
      </div>
    );
  }

  const activeRoute = resolvedPack.routes[focusedRouteId];
  const copy = activeRoute?.guestCopy;
  const RouteIcon = activeRoute ? getRouteIcon(activeRoute) : Bus;
  const walkOnly = activeRoute ? isWalkOnlyRoute(activeRoute) : false;
  const previewAddress = 'Dalmatinska 6';
  const walkToHostel = copy?.publicWalkToHostel
    ? applyTemplate(copy.publicWalkToHostel, { address: previewAddress })
    : '';

  if (!copy || !activeRoute) {
    return (
      <p className="rounded-lg border border-dashed px-4 py-4 text-center text-sm text-muted-foreground">
        No guest card for {presetLabel} yet.
      </p>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        Guest preview · {presetLabel} · {locale.toUpperCase()}
      </p>

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
    </div>
  );
}
