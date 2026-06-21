'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from '@/shared/i18n';
import { useTenant } from '@/entities/tenant';
import { getRouteFeedbackLink } from '../lib/getRouteFeedbackLink';
import { Button, ExternalServiceTouchLink, Icon, Tabs, TabsList, TabsTrigger } from '@/shared/ui';
import type { RouteId } from '@/entities/hostel';
import { getActiveRoutes } from '@/entities/hostel';
import { PublicRouteDetailsSheet } from './PublicRouteDetailsSheet';
import { PublicRouteSummaryCard } from './PublicRouteSummaryCard';
import { TaxiBackupCard } from './TaxiBackupCard';
import { TaxiBackupSheet } from './TaxiBackupSheet';

export function DirectionPicker() {
  const { hostel, routes: arrivalRoutes, routeCategories, contentKeys } = useTenant();
  const routes = useTranslations();
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

  useEffect(() => {
    const defaultRouteId = routeCategories[0]?.defaultRouteId;
    if (defaultRouteId) {
      setActiveRouteId(defaultRouteId);
    }
  }, [routeCategories]);

  const currentRoute = arrivalRoutes[activeRouteId];
  const activeCategory = currentRoute.category;
  const activeRoutesList = getActiveRoutes(arrivalRoutes);
  const sameCategoryRoutes = activeRoutesList.filter((route) => route.category === activeCategory);
  const alternativeRoute = sameCategoryRoutes.find((route) => route.id !== currentRoute.id);

  const subRoutes = activeRoutesList.filter(
    (route) => route.category === activeCategory && route.hintKey
  );

  const routeFeedbackLink = getRouteFeedbackLink(
    hostel.contacts.feedbackPhone.raw ?? '',
    directions('routeFeedbackMessage', {
      route: routes(currentRoute.translationKeys.publicTitle),
    })
  );

  const handleCategoryChange = (categoryValue: string) => {
    const targetCategory = routeCategories.find((cat) => cat.id === categoryValue);
    if (targetCategory) {
      setActiveRouteId(targetCategory.defaultRouteId);
    }
  };

  const tabGridClass = routeCategories.length === 2 ? 'grid-cols-2' : 'grid-cols-3';

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-muted-foreground">{directions('fromSubtitle')}</p>

      <Tabs value={activeCategory} onValueChange={handleCategoryChange} className="w-full">
        <TabsList className={`grid w-full ${tabGridClass}`}>
          {routeCategories.map(({ id, icon, labelKey }) => (
            <TabsTrigger key={id} value={id} className="gap-2">
              <Icon icon={icon} className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only">{routes(labelKey)}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {subRoutes.length > 0 && contentKeys.busClarificationQuestion && (
        <div className="animate-fadeIn space-y-4 rounded-xl border bg-muted p-4">
          <p className="text-center text-xs font-medium text-muted-foreground">
            {routes(contentKeys.busClarificationQuestion)}
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

        {hostel.contacts.feedbackPhone.raw && (
          <p className="flex justify-center text-[11px] leading-relaxed text-muted-foreground">
            <ExternalServiceTouchLink service="whatsapp" href={routeFeedbackLink}>
              {directions('routeFeedbackLink')}
            </ExternalServiceTouchLink>
          </p>
        )}

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

        <TaxiBackupSheet open={taxiSheetOpen} onOpenChange={setTaxiSheetOpen} route={currentRoute} />
      </div>
    </div>
  );
}
