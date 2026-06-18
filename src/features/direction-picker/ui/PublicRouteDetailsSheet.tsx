'use client';

import { useTranslations } from '@/shared/i18n';
import { Button, Icon, Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/shared/ui';
import { ExternalLink } from 'lucide-react';
import { hasOfficialRouteSchedule, type RouteConfig } from '@/entities/hostel';
import { getTransitIcon, PublicRouteItinerary } from './PublicRouteItinerary';

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
  const routes = useTranslations();
  const directions = useTranslations('pages.arrivalJourney.directions');
  const TransitIcon = getTransitIcon(route.category);
  const showOfficialSchedule = hasOfficialRouteSchedule(route);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl px-0 pb-6">
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/30" />
        <SheetHeader className="px-6 pt-4 pb-2">
          <div className="flex items-start gap-4">
            <div className="shrink-0 rounded-xl bg-muted p-2 text-muted-foreground">
              <Icon icon={TransitIcon} className="h-5 w-5" />
            </div>
            <div className="min-w-0 space-y-1">
              <SheetTitle className="text-base">{title}</SheetTitle>
              {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            </div>
          </div>
        </SheetHeader>

        <div className="px-6">
          <PublicRouteItinerary route={route} routes={routes} directions={directions} />
        </div>

        {showOfficialSchedule && (
          <SheetFooter className="px-6 pt-4 sm:flex-row">
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
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
