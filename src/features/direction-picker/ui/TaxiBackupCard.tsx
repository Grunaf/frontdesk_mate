'use client';

import { useTranslations } from '@/shared/i18n';
import { CardTitle, Icon } from '@/shared/ui';
import { Banknote, Car, ChevronRight, Clock3 } from 'lucide-react';
import { type RouteConfig } from '@/entities/hostel';

function TaxiRouteSummary({
  route,
  directions,
}: {
  route: RouteConfig;
  directions: ReturnType<typeof useTranslations<'pages.arrivalJourney.directions'>>;
}) {
  const { taxiPriceKM, taxiPriceEUR, taxiDurationMin } = route.metadata;

  return (
    <div className="flex flex-wrap gap-1.5">
      <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-xs text-foreground/90">
        <Icon icon={Banknote} className="h-3 w-3 text-muted-foreground" />
        {directions('labels.taxiPrice', {
          minKM: taxiPriceKM.min,
          maxKM: taxiPriceKM.max,
          minEUR: taxiPriceEUR.min,
          maxEUR: taxiPriceEUR.max,
        })}
      </span>
      <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-xs text-foreground/90">
        <Icon icon={Clock3} className="h-3 w-3 text-muted-foreground" />
        {directions('labels.taxiDuration', {
          min: taxiDurationMin.min,
          max: taxiDurationMin.max,
        })}
      </span>
    </div>
  );
}

export function TaxiBackupCard({
  route,
  onTaxiClick,
}: {
  route: RouteConfig;
  onTaxiClick: () => void;
}) {
  const directions = useTranslations('pages.arrivalJourney.directions');

  return (
    <button
      type="button"
      onClick={onTaxiClick}
      className="flex w-full items-start gap-4 rounded-lg text-left transition-colors hover:bg-muted/30"
    >
      <div className="shrink-0 rounded-xl bg-muted p-2 text-muted-foreground">
        <Icon icon={Car} className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <CardTitle className="text-sm text-foreground">{directions('taxiTitle')}</CardTitle>
        <TaxiRouteSummary route={route} directions={directions} />
      </div>
      <Icon icon={ChevronRight} className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

export { TaxiRouteSummary };
