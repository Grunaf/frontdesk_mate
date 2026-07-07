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

function RangeFields({
  title,
  min,
  max,
  onMinChange,
  onMaxChange,
}: {
  title: string;
  min: number;
  max: number;
  onMinChange: (value: number) => void;
  onMaxChange: (value: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-medium text-foreground">{title}</p>
      <div className="grid grid-cols-2 gap-2">
        <NumberField label="Min" value={min} onChange={onMinChange} />
        <NumberField label="Max" value={max} onChange={onMaxChange} />
      </div>
    </div>
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

      <NumberField
        label="Approx. travel time (min)"
        value={resolveHubApproxTravelMinutes(route)}
        onChange={(minutes) => onChange(applyHubApproxTravelMinutes(route, minutes))}
      />

      {!isWalkOnly && showLocalKm ? (
        <div className="grid gap-3 sm:grid-cols-2">
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
        </div>
      ) : null}

      <RangeFields
        title="Price range (€)"
        min={route.taxi.priceEUR.min}
        max={route.taxi.priceEUR.max}
        onMinChange={(min) =>
          patchTaxi({
            priceEUR: { min, max: route.taxi.priceEUR.max },
            ...(currencyMode === 'eur_only'
              ? { priceKM: { min, max: route.taxi.priceEUR.max } }
              : {}),
          })
        }
        onMaxChange={(max) =>
          patchTaxi({
            priceEUR: { min: route.taxi.priceEUR.min, max },
            ...(currencyMode === 'eur_only'
              ? { priceKM: { min: route.taxi.priceEUR.min, max } }
              : {}),
          })
        }
      />

      {showLocalKm ? (
        <RangeFields
          title="Price range (KM)"
          min={route.taxi.priceKM.min}
          max={route.taxi.priceKM.max}
          onMinChange={(min) =>
            patchTaxi({ priceKM: { min, max: route.taxi.priceKM.max } })
          }
          onMaxChange={(max) =>
            patchTaxi({ priceKM: { min: route.taxi.priceKM.min, max } })
          }
        />
      ) : null}
    </div>
  );
}
