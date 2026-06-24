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
import { hasOfficialRouteSchedule, type RouteConfig } from '@/entities/hostel';
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
  const showOfficialSchedule = hasOfficialRouteSchedule(route);
  const address = hostel.contacts.address.display ?? '';

  const walkToHostel = resolveWalkToHostelText({
    route,
    routes,
    settings,
    address,
    locale,
  });

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
              {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
            </div>
          </div>
        </BottomSheetHeader>

        <BottomSheetBody className="pb-4">
          <PublicRouteItinerary
            route={route}
            routes={routes}
            directions={directions}
            walkToHostel={walkToHostel}
          />
        </BottomSheetBody>

        {showOfficialSchedule ? (
          <BottomSheetFooter className="border-t border-border/60 sm:flex-row">
            <Button asChild variant="outline" size="sm" className="w-full">
              <a
                href={route.metadata.publicTransport.officialRouteUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {directions('officialRouteLink')}
                <Icon icon={ExternalLink} className="h-3.5 w-3.5" />
              </a>
            </Button>
          </BottomSheetFooter>
        ) : null}
      </BottomSheetContent>
    </BottomSheet>
  );
}
