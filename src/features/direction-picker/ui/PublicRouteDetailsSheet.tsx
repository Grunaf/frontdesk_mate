'use client';

import { useTranslations, useLocale } from '@/shared/i18n';
import { useTenant } from '@/entities/tenant';
import type { AppLocale } from '@/entities/city-pack/model/types';
import {
  BottomSheet,
  BottomSheetBody,
  BottomSheetContent,
  BottomSheetFooter,
  BottomSheetHeader,
  BottomSheetTitle,
  Button,
  Icon,
} from '@/shared/ui';
import { ExternalLink } from 'lucide-react';
import {
  hasOfficialRouteSchedule,
  isTenantLocalRoute,
  isWalkOnlyRoute,
  type RouteConfig,
} from '@/entities/hostel';
import { resolveWalkingMapsUrlFromSettings } from '../lib/buildWalkingMapsUrl';
import { resolveGetOffAtForGuest } from '../lib/resolveGetOffAt';
import { resolveTenantLocalArrivalForGuest } from '../lib/resolveTenantLocalArrival';
import { mergeArrivalRouteTipsForGuest, readTenantRouteTips } from '@/entities/tenant/lib/mergeArrivalRouteTipsForGuest';
import {
  getRouteDisplayIcon,
  PublicRouteItinerary,
  resolveWalkToHostelText,
} from './PublicRouteItinerary';

export function PublicRouteDetailsSheet({
  open,
  onOpenChange,
  route,
  title,
  subtitle,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  route: RouteConfig;
  title: string;
  subtitle?: string;
}) {
  const { settings, hostel } = useTenant();
  const routes = useTranslations();
  const locale = useLocale() as AppLocale;
  const directions = useTranslations('pages.arrivalJourney.directions');
  const RouteIcon = getRouteDisplayIcon(route);
  const showOfficialSchedule = hasOfficialRouteSchedule(route) && !isTenantLocalRoute(route);
  const address = hostel.contacts.address.display ?? '';
  const tenantLocal = isTenantLocalRoute(route)
    ? resolveTenantLocalArrivalForGuest({
        settings,
        routeId: route.id,
        locale,
      })
    : undefined;

  const walkToHostel = resolveWalkToHostelText({
    route,
    routes,
    settings,
    address,
    locale,
  });

  const getOffAt = resolveGetOffAtForGuest({
    route,
    routes,
    settings,
    locale,
  });

  const routeTips = mergeArrivalRouteTipsForGuest({
    cityPackTips: isTenantLocalRoute(route) ? undefined : route.guestCopy?.tips,
    tenantTips: readTenantRouteTips(settings.arrivalRouteTipsByRoute, route.id),
    locale,
  });

  const walkingMapsUrl =
    isWalkOnlyRoute(route) || isTenantLocalRoute(route)
      ? resolveWalkingMapsUrlFromSettings(route, settings)
      : undefined;

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <BottomSheetContent size="large" className="px-0 pb-0">
        <BottomSheetHeader className="px-6 pb-3">
          <div className="flex items-start gap-4">
            <div className="shrink-0 rounded-xl bg-muted p-2 text-muted-foreground">
              <Icon icon={RouteIcon} className="h-5 w-5" />
            </div>
            <div className="min-w-0 space-y-1 pr-8">
              <BottomSheetTitle className="text-base">{title}</BottomSheetTitle>
              {subtitle ? <p className="text-sm leading-relaxed text-muted-foreground">{subtitle}</p> : null}
            </div>
          </div>
        </BottomSheetHeader>

        <BottomSheetBody className="pb-4">
          <PublicRouteItinerary
            route={route}
            routes={routes}
            directions={directions}
            walkToHostel={walkToHostel}
            routeTips={routeTips}
            walkingMapsUrl={walkingMapsUrl}
            getOffAt={getOffAt}
            tenantLocal={tenantLocal}
          />
        </BottomSheetBody>

        {showOfficialSchedule ? (
          <BottomSheetFooter className="border-t border-border/60 sm:flex-row">
            <Button asChild variant="outline" className="h-11 w-full">
              <a
                href={route.metadata.publicTransport.officialRouteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5"
              >
                <span className="text-sm font-semibold">{directions('officialRouteLink')}</span>
                <Icon icon={ExternalLink} className="h-4 w-4 shrink-0" />
              </a>
            </Button>
          </BottomSheetFooter>
        ) : null}
      </BottomSheetContent>
    </BottomSheet>
  );
}
