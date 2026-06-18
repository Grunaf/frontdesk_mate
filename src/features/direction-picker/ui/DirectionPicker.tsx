'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from '@/shared/i18n';
import { HOSTEL_CONFIG } from '@/shared/config';
import { getWhatsappTaxiLink } from '../lib/getWhatsappTaxiLink';
import { Button, Icon, Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, Tabs, TabsList, TabsTrigger } from '@/shared/ui';
import { Car } from 'lucide-react';
import {
  ARRIVAL_ROUTES_CONFIG,
  ROUTE_CATEGORIES,
  type RouteId,
} from '@/entities/hostel';
import { PublicRouteDetailsSheet } from './PublicRouteDetailsSheet';
import { PublicRouteSummaryCard } from './PublicRouteSummaryCard';
import { TaxiBackupCard, TaxiRouteSummary } from './TaxiBackupCard';

export function DirectionPicker() {
  const routes = useTranslations();
  const taxiActions = useTranslations('components.taxi');
  const directions = useTranslations('pages.arrivalJourney.directions');

  const [activeRouteId, setActiveRouteId] = useState<RouteId>('airport');
  const [primaryDetailsOpen, setPrimaryDetailsOpen] = useState(false);
  const [alternativeDetailsOpen, setAlternativeDetailsOpen] = useState(false);
  const [taxiSheetOpen, setTaxiSheetOpen] = useState(false);

  useEffect(() => {
    setPrimaryDetailsOpen(false);
    setAlternativeDetailsOpen(false);
    setTaxiSheetOpen(false);
  }, [activeRouteId]);

  const currentRoute = ARRIVAL_ROUTES_CONFIG[activeRouteId];
  const activeCategory = currentRoute.category;
  const sameCategoryRoutes = Object.values(ARRIVAL_ROUTES_CONFIG).filter(
    (route) => route.category === activeCategory
  );
  const alternativeRoute = sameCategoryRoutes.find((route) => route.id !== currentRoute.id);

  const subRoutes = Object.values(ARRIVAL_ROUTES_CONFIG).filter(
    (route) => route.category === activeCategory && route.hintKey
  );

  const taxiWhatsappLink = getWhatsappTaxiLink(
    taxiActions('whatsappMessage', {
      pickupPoint: routes(currentRoute.translationKeys.taxiPickupPoint),
      address: HOSTEL_CONFIG.contacts.address.display ?? '',
    })
  );

  const handleCategoryChange = (categoryValue: string) => {
    const targetCategory = ROUTE_CATEGORIES.find((cat) => cat.id === categoryValue);
    if (targetCategory) {
      setActiveRouteId(targetCategory.defaultRouteId);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-muted-foreground">{directions('fromSubtitle')}</p>

      <Tabs value={activeCategory} onValueChange={handleCategoryChange} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          {ROUTE_CATEGORIES.map(({ id, icon, labelKey }) => (
            <TabsTrigger key={id} value={id} className="gap-2">
              <Icon icon={icon} className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only">{routes(labelKey)}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {subRoutes.length > 0 && (
        <div className="animate-fadeIn space-y-4 rounded-xl border bg-muted p-4">
          <p className="text-center text-xs font-medium text-muted-foreground">
            {routes('domains.hostel.routes.bus.clarificationQuestion')}
          </p>

          <div className="grid grid-cols-2 gap-4">
            {subRoutes.map((route) => {
              const isActive = activeRouteId === route.id;

              return (
                <Button
                  key={route.id}
                  type="button"
                  variant="outline"
                  onClick={() => setActiveRouteId(route.id)}
                  className={`h-auto lg:h-auto min-h-11 w-full min-w-0 flex-col items-start justify-start gap-1.5 p-4 text-left whitespace-normal ${
                    isActive ? 'border-primary ring-1 ring-primary' : ''
                  }`}
                >
                  <span className="w-full break-words text-sm font-semibold">{routes(route.titleKey)}</span>
                  {route.hintKey && (
                    <span className="w-full break-words text-xs text-muted-foreground">{routes(route.hintKey)}</span>
                  )}
                </Button>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-4 pt-2">
        <PublicRouteSummaryCard
          route={currentRoute}
          alternativeRoute={alternativeRoute}
          onStepByStepClick={() => setPrimaryDetailsOpen(true)}
          onAlternativeRouteClick={
            alternativeRoute ? () => setAlternativeDetailsOpen(true) : undefined
          }
        />

        <TaxiBackupCard route={currentRoute} onTaxiClick={() => setTaxiSheetOpen(true)} />

        <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
          {directions('trustDisclaimer')}
        </p>

        <PublicRouteDetailsSheet
          open={primaryDetailsOpen}
          onOpenChange={setPrimaryDetailsOpen}
          route={currentRoute}
          title={routes(currentRoute.translationKeys.publicTitle)}
          subtitle={routes(currentRoute.translationKeys.publicSummary)}
        />

        {alternativeRoute && (
          <PublicRouteDetailsSheet
            open={alternativeDetailsOpen}
            onOpenChange={setAlternativeDetailsOpen}
            route={alternativeRoute}
            title={routes(alternativeRoute.translationKeys.publicTitle)}
            subtitle={routes(alternativeRoute.translationKeys.publicSummary)}
          />
        )}

        <Sheet open={taxiSheetOpen} onOpenChange={setTaxiSheetOpen}>
          <SheetContent side="bottom" className="max-h-[85vh] rounded-t-2xl px-0 pb-6">
            <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/30" />
            <SheetHeader className="px-6 pt-4 pb-2 space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {directions('backupTitle')}
              </p>
              <div className="flex items-start gap-4">
                <div className="shrink-0 rounded-xl bg-muted p-2 text-muted-foreground">
                  <Icon icon={Car} className="h-5 w-5" />
                </div>
                <div className="min-w-0 space-y-1">
                  <SheetTitle className="text-base">{directions('taxiTitle')}</SheetTitle>
                  <TaxiRouteSummary route={currentRoute} directions={directions} />
                </div>
              </div>
            </SheetHeader>

            <div className="space-y-4 px-6">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {routes('domains.hostel.routes.taxiService.standWarning')}
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {routes('domains.hostel.routes.taxiService.meterWarning')}
              </p>
            </div>

            <SheetFooter className="px-6 pt-4 sm:flex-row">
              <Button asChild size="sm" variant="outline" className="flex-1">
                <a href={taxiWhatsappLink} target="_blank" rel="noopener noreferrer">
                  {taxiActions('writeWithWhatsapp')}
                </a>
              </Button>
              <Button asChild size="sm" variant="outline" className="flex-1">
                <a href={HOSTEL_CONFIG.contacts.taxiPhone.href}>
                  {taxiActions('callTaxi', { taxiName: 'Zuti Taxi' })}
                </a>
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
