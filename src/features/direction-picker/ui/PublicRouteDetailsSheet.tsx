'use client';

import { useTranslations } from '@/shared/i18n';
import { useTenant } from '@/entities/tenant';
import {
  BottomSheet,
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
  const directions = useTranslations('pages.arrivalJourney.directions');
  const RouteIcon = getRouteDisplayIcon(route);
  const showOfficialSchedule = hasOfficialRouteSchedule(route);
  const address = hostel.contacts.address.display ?? '';

  const walkToHostel = resolveWalkToHostelText({
    route,
    routes,
    settings,
    address,
  });

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <BottomSheetContent className="overflow-y-auto px-0 pb-6">
        <BottomSheetHeader className="px-6 pb-2">
          <div className="flex items-start gap-4">
            <div className="shrink-0 rounded-xl bg-muted p-2 text-muted-foreground">
              <Icon icon={RouteIcon} className="h-5 w-5" />
            </div>
            <div className="min-w-0 space-y-1">
              <BottomSheetTitle className="text-base">{title}</BottomSheetTitle>
              {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            </div>
          </div>
        </BottomSheetHeader>

        <div className="px-6">
          <PublicRouteItinerary
            route={route}
            routes={routes}
            directions={directions}
            walkToHostel={walkToHostel}
          />
        </div>

        {showOfficialSchedule && (
          <BottomSheetFooter className="px-6 pt-4 sm:flex-row">
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
        )}
      </BottomSheetContent>
    </BottomSheet>
  );
}
