'use client';

import type { CityPackRouteContent, CityPackTransportCurrencyMode } from '@/entities/city-pack/model/types';
import {
  applyHubApproxTravelMinutes,
  resolveHubApproxTravelMinutes,
} from '@/entities/city-pack';
import {
  HUB_TRIP_ESTIMATES_INTRO,
  HUB_TRIP_ESTIMATES_SECTION_TITLE,
} from '../lib/cityPackTaxiTemplateConstants';

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <input
        type="number"
        min={0}
        step={1}
        value={Number.isFinite(value) ? value : 0}
        onChange={(event) => onChange(Number(event.target.value) || 0)}
        className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
      />
    </label>
  );
}

export function CityPackRouteMetadataFields({
  route,
  currencyMode,
  onChange,
}: {
  route: CityPackRouteContent;
  currencyMode: CityPackTransportCurrencyMode;
  onChange: (next: CityPackRouteContent) => void;
}) {
  const showLocalKm = currencyMode === 'local_and_eur';
  const isWalkOnly = route.routeMode === 'walk_only';

  const patchTaxi = (partial: Partial<CityPackRouteContent['taxi']>) =>
    onChange({ ...route, taxi: { ...route.taxi, ...partial } });

  const patchTransit = (partial: Partial<CityPackRouteContent['transit']>) =>
    onChange({ ...route, transit: { ...route.transit, ...partial } });

  return (
    <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50/50 p-3">
      <div className="space-y-0.5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-800">
          {HUB_TRIP_ESTIMATES_SECTION_TITLE}
        </p>
        <p className="text-[11px] text-muted-foreground">{HUB_TRIP_ESTIMATES_INTRO}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <NumberField
          label="Approx. travel time (min)"
          value={resolveHubApproxTravelMinutes(route)}
          onChange={(minutes) => onChange(applyHubApproxTravelMinutes(route, minutes))}
        />

        {!isWalkOnly && showLocalKm ? (
          <>
            <NumberField
              label="Bus ticket kiosk (KM)"
              value={route.transit.ticketPrice?.kioskKM ?? 0}
              onChange={(kioskKM) =>
                patchTransit({
                  ticketPrice: {
                    kioskKM,
                    driverKM: route.transit.ticketPrice?.driverKM ?? 0,
                  },
                })
              }
            />
            <NumberField
              label="Bus ticket on board (KM)"
              value={route.transit.ticketPrice?.driverKM ?? 0}
              onChange={(driverKM) =>
                patchTransit({
                  ticketPrice: {
                    kioskKM: route.transit.ticketPrice?.kioskKM ?? 0,
                    driverKM,
                  },
                })
              }
            />
          </>
        ) : null}
        <NumberField
          label="Taxi fair price (€)"
          value={Math.round((route.taxi.priceEUR.min + route.taxi.priceEUR.max) / 2)}
          onChange={(value) =>
            patchTaxi({
              priceEUR: { min: value, max: value },
              ...(currencyMode === 'eur_only' ? { priceKM: { min: value, max: value } } : {}),
            })
          }
        />
        {showLocalKm ? (
          <NumberField
            label="Taxi fair price (KM)"
            value={Math.round((route.taxi.priceKM.min + route.taxi.priceKM.max) / 2)}
            onChange={(value) => patchTaxi({ priceKM: { min: value, max: value } })}
          />
        ) : null}

        <NumberField
          label="Taxi duration (min)"
          value={Math.round((route.taxi.durationMin.min + route.taxi.durationMin.max) / 2)}
          onChange={(value) => patchTaxi({ durationMin: { min: value, max: value } })}
        />
      </div>
    </div>
  );
}
