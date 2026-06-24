'use client';

import { useState } from 'react';
import type { RouteId } from '@/entities/hostel';
import type { CityPackRouteContent } from '@/entities/city-pack/model/types';
import { copyRouteEnToRu } from '@/entities/city-pack/lib/resolveLocalizedLocaleStatus';
import { ROUTE_PRESETS } from '@/entities/city-pack';
import { cn } from '@/shared/lib/utils';
import { ChevronDown } from 'lucide-react';
import { Icon } from '@/shared/ui';
import { AdminLocalizedInput } from './AdminLocalizedInput';
import { LocaleStatusDots } from './AdminLocaleEditContext';
import { resolveRouteLocaleStatus } from '@/entities/city-pack/lib/resolveLocalizedLocaleStatus';

function NumberField({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number | undefined;
  onChange: (value: number) => void;
  step?: number;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input
        type="number"
        step={step}
        value={value ?? ''}
        onChange={(event) => onChange(Number(event.target.value) || 0)}
        className="w-full rounded-md border bg-background px-2.5 py-1.5 text-sm"
      />
    </label>
  );
}

function CollapsibleBlock({
  title,
  summary,
  defaultOpen = false,
  children,
}: {
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-md border bg-background">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
      >
        <div className="min-w-0">
          <p className="text-xs font-medium text-foreground">{title}</p>
          {summary && !open ? (
            <p className="truncate text-[11px] text-muted-foreground">{summary}</p>
          ) : null}
        </div>
        <Icon
          icon={ChevronDown}
          className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
        />
      </button>
      {open ? <div className="space-y-3 border-t px-3 py-3">{children}</div> : null}
    </div>
  );
}

export function CityPackRouteEditor({
  routeId,
  route,
  onChange,
  embedded = false,
}: {
  routeId: RouteId;
  route: CityPackRouteContent;
  onChange: (next: CityPackRouteContent) => void;
  embedded?: boolean;
}) {
  const preset = ROUTE_PRESETS.find((entry) => entry.id === routeId);
  const localeStatus = resolveRouteLocaleStatus(route);

  const patch = (partial: Partial<CityPackRouteContent>) => onChange({ ...route, ...partial });
  const patchCopy = (partial: Partial<CityPackRouteContent['copy']>) =>
    onChange({ ...route, copy: { ...route.copy, ...partial } });
  const patchTransit = (partial: Partial<CityPackRouteContent['transit']>) =>
    onChange({ ...route, transit: { ...route.transit, ...partial } });
  const patchTaxi = (partial: Partial<CityPackRouteContent['taxi']>) =>
    onChange({
      ...route,
      taxi: {
        ...route.taxi,
        ...partial,
        priceKM: { ...route.taxi.priceKM, ...(partial.priceKM ?? {}) },
        priceEUR: { ...route.taxi.priceEUR, ...(partial.priceEUR ?? {}) },
        durationMin: { ...route.taxi.durationMin, ...(partial.durationMin ?? {}) },
      },
    });

  const transitSummary = `${route.transit.durationMin} min${
    route.transit.stops != null ? ` · ${route.transit.stops} stops` : ''
  }`;
  const taxiSummary = `${route.taxi.priceKM.min}–${route.taxi.priceKM.max} KM · ${route.taxi.priceEUR.min}–${route.taxi.priceEUR.max} EUR`;

  return (
    <div className={cn('space-y-3', !embedded && 'rounded-lg border bg-muted/10 p-3')}>
      {!embedded ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="space-y-1">
            <p className="text-sm font-semibold">{preset?.label ?? routeId}</p>
            <LocaleStatusDots en={localeStatus.en} ru={localeStatus.ru} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onChange(copyRouteEnToRu(route))}
              className="rounded-md border px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted/50"
            >
              Copy EN → RU
            </button>
            <select
              value={route.routeMode ?? 'transit'}
              onChange={(event) =>
                patch({ routeMode: event.target.value as CityPackRouteContent['routeMode'] })
              }
              className="rounded-md border bg-background px-2 py-1 text-xs"
            >
              <option value="transit">Transit</option>
              <option value="walk_only">Walk only</option>
            </select>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => onChange(copyRouteEnToRu(route))}
            className="rounded-md border px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted/50"
          >
            Copy EN → RU
          </button>
          <select
            value={route.routeMode ?? 'transit'}
            onChange={(event) =>
              patch({ routeMode: event.target.value as CityPackRouteContent['routeMode'] })
            }
            className="rounded-md border bg-background px-2 py-1 text-xs"
          >
            <option value="transit">Transit</option>
            <option value="walk_only">Walk only</option>
          </select>
        </div>
      )}

      <AdminLocalizedInput
        label="Hub label"
        value={route.locationLabel}
        onChange={(locationLabel) => patch({ locationLabel })}
        required
      />
      {route.hint !== undefined ? (
        <AdminLocalizedInput
          label="Hub hint"
          value={route.hint}
          onChange={(hint) => patch({ hint })}
        />
      ) : null}

      <div className="space-y-2.5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Route copy</p>
        <AdminLocalizedInput
          label="Card title"
          value={route.copy.publicTitle}
          onChange={(publicTitle) => patchCopy({ publicTitle })}
          required
        />
        <AdminLocalizedInput
          label="Card summary"
          value={route.copy.publicSummary}
          onChange={(publicSummary) => patchCopy({ publicSummary })}
          multiline
          rows={2}
          required
        />
        <AdminLocalizedInput
          label="Walk to stop"
          value={route.copy.publicPreview}
          onChange={(publicPreview) => patchCopy({ publicPreview })}
          multiline
          rows={2}
          required
        />
        <AdminLocalizedInput
          label="Step-by-step"
          value={route.copy.publicText}
          onChange={(publicText) => patchCopy({ publicText })}
          multiline
          rows={3}
          required
        />
        <AdminLocalizedInput
          label="Get off at"
          value={route.copy.publicGetOffAt}
          onChange={(publicGetOffAt) => patchCopy({ publicGetOffAt })}
          required
        />
        <AdminLocalizedInput
          label="Walk to hostel (default)"
          hint="{address} is replaced with tenant address."
          value={route.copy.publicWalkToHostel}
          onChange={(publicWalkToHostel) => patchCopy({ publicWalkToHostel })}
          multiline
          rows={2}
          required
        />
      </div>

      <CollapsibleBlock title="Transit metadata" summary={transitSummary}>
        <div className="grid gap-2 sm:grid-cols-2">
          <NumberField
            label="Duration (min)"
            value={route.transit.durationMin}
            onChange={(durationMin) => patchTransit({ durationMin })}
          />
          <NumberField
            label="Stops"
            value={route.transit.stops}
            onChange={(stops) => patchTransit({ stops })}
          />
          <NumberField
            label="Ticket kiosk KM"
            value={route.transit.ticketPrice?.kioskKM}
            step={0.1}
            onChange={(kioskKM) =>
              patchTransit({
                ticketPrice: {
                  kioskKM,
                  driverKM: route.transit.ticketPrice?.driverKM ?? kioskKM,
                },
              })
            }
          />
          <NumberField
            label="Ticket driver KM"
            value={route.transit.ticketPrice?.driverKM}
            step={0.1}
            onChange={(driverKM) =>
              patchTransit({
                ticketPrice: {
                  kioskKM: route.transit.ticketPrice?.kioskKM ?? driverKM,
                  driverKM,
                },
              })
            }
          />
        </div>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Schedule URL</span>
          <input
            value={route.transit.officialRouteUrl ?? ''}
            onChange={(event) => patchTransit({ officialRouteUrl: event.target.value })}
            className="w-full rounded-md border bg-background px-2.5 py-1.5 text-sm"
          />
        </label>
        <AdminLocalizedInput
          label="Custom fare label"
          value={route.transit.fareLabel}
          onChange={(fareLabel) => patchTransit({ fareLabel })}
        />
      </CollapsibleBlock>

      <CollapsibleBlock title="Taxi backup" summary={taxiSummary}>
        <AdminLocalizedInput
          label="Taxi cost text"
          hint="{minKM}, {maxKM}, {minEUR}, {maxEUR}"
          value={route.copy.taxiCost}
          onChange={(taxiCost) => patchCopy({ taxiCost })}
          multiline
          rows={2}
          required
        />
        <AdminLocalizedInput
          label="Pickup point"
          value={route.copy.taxiPickupPoint}
          onChange={(taxiPickupPoint) => patchCopy({ taxiPickupPoint })}
          required
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <NumberField
            label="KM min"
            value={route.taxi.priceKM.min}
            onChange={(min) => patchTaxi({ priceKM: { min, max: route.taxi.priceKM.max } })}
          />
          <NumberField
            label="KM max"
            value={route.taxi.priceKM.max}
            onChange={(max) => patchTaxi({ priceKM: { min: route.taxi.priceKM.min, max } })}
          />
          <NumberField
            label="EUR min"
            value={route.taxi.priceEUR.min}
            onChange={(min) => patchTaxi({ priceEUR: { min, max: route.taxi.priceEUR.max } })}
          />
          <NumberField
            label="EUR max"
            value={route.taxi.priceEUR.max}
            onChange={(max) => patchTaxi({ priceEUR: { min: route.taxi.priceEUR.min, max } })}
          />
          <NumberField
            label="Duration min"
            value={route.taxi.durationMin.min}
            onChange={(min) => patchTaxi({ durationMin: { min, max: route.taxi.durationMin.max } })}
          />
          <NumberField
            label="Duration max"
            value={route.taxi.durationMin.max}
            onChange={(max) => patchTaxi({ durationMin: { min: route.taxi.durationMin.min, max } })}
          />
        </div>
      </CollapsibleBlock>
    </div>
  );
}
