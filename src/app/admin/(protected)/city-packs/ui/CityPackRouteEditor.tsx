'use client';

import { useState } from 'react';
import type { RouteId } from '@/entities/hostel';
import type { CityPackRouteContent } from '@/entities/city-pack/model/types';
import {
  copyRouteEnToRu,
  isLocalizedFilled,
} from '@/entities/city-pack/lib/resolveLocalizedLocaleStatus';
import { formatRouteGateStatus, MAX_ROUTE_TIPS, ROUTE_PRESETS } from '@/entities/city-pack';
import type { LocalizedText } from '@/entities/city-pack/model/types';
import { cn } from '@/shared/lib/utils';
import { ChevronDown } from 'lucide-react';
import { Icon } from '@/shared/ui';
import { AdminLocalizedInput } from './AdminLocalizedInput';

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

function hasRouteTips(route: CityPackRouteContent): boolean {
  return Boolean(route.tips?.some((tip) => isLocalizedFilled(tip, 'en') || isLocalizedFilled(tip, 'ru')));
}

function hasOptionalGuestCopy(route: CityPackRouteContent): boolean {
  return (
    hasRouteTips(route) ||
    isLocalizedFilled(route.copy.publicPreview, 'en') ||
    isLocalizedFilled(route.copy.publicPreview, 'ru') ||
    isLocalizedFilled(route.copy.publicWalkToHostel, 'en') ||
    isLocalizedFilled(route.copy.publicWalkToHostel, 'ru') ||
    isLocalizedFilled(route.copy.taxiCost, 'en') ||
    isLocalizedFilled(route.copy.taxiCost, 'ru') ||
    isLocalizedFilled(route.copy.taxiPickupPoint, 'en') ||
    isLocalizedFilled(route.copy.taxiPickupPoint, 'ru') ||
    isLocalizedFilled(route.hint, 'en') ||
    isLocalizedFilled(route.hint, 'ru')
  );
}

export function CityPackRouteEditor({
  routeId,
  route,
  onChange,
  embedded = false,
  showHubHint = false,
}: {
  routeId: RouteId;
  route: CityPackRouteContent;
  onChange: (next: CityPackRouteContent) => void;
  embedded?: boolean;
  /** Both bus hubs enabled — show per-hub hint field on bus routes. */
  showHubHint?: boolean;
}) {
  const preset = ROUTE_PRESETS.find((entry) => entry.id === routeId);
  const gateReady = formatRouteGateStatus(route).ready;
  const getOffAtRequired = route.routeMode !== 'walk_only';
  const hubHintEditable =
    showHubHint && (routeId === 'bus_central' || routeId === 'bus_istochno');

  const patch = (partial: Partial<CityPackRouteContent>) => onChange({ ...route, ...partial });
  const patchCopy = (partial: Partial<CityPackRouteContent['copy']>) =>
    onChange({ ...route, copy: { ...route.copy, ...partial } });

  const tips = route.tips ?? [];
  const patchTip = (index: number, value: LocalizedText) => {
    const next = [...tips];
    next[index] = value;
    onChange({ ...route, tips: next });
  };
  const addTip = () => {
    if (tips.length >= MAX_ROUTE_TIPS) {
      return;
    }
    onChange({ ...route, tips: [...tips, { en: '' }] });
  };
  const removeTip = (index: number) => {
    const next = tips.filter((_, i) => i !== index);
    onChange({ ...route, tips: next.length > 0 ? next : undefined });
  };

  const toolbar = (
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
  );

  return (
    <div className={cn('space-y-3', !embedded && 'rounded-lg border bg-muted/10 p-3')}>
      {!embedded ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold">{preset?.label ?? routeId}</p>
          {toolbar}
        </div>
      ) : (
        toolbar
      )}

      <div className="space-y-2.5 rounded-md border border-amber-200/80 bg-amber-50/30 p-3">
        <div className="space-y-0.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-amber-900">
            Required for publish (EN)
          </p>
          <p className="text-[11px] text-muted-foreground">
            Fill these in English. RU is optional and can wait.
            {route.routeMode === 'walk_only' ? ' Walk-only hubs skip Get off at.' : null}
          </p>
        </div>
        <AdminLocalizedInput
          label="Card title"
          value={route.copy.publicTitle}
          onChange={(publicTitle) => patchCopy({ publicTitle })}
          gateRequired
        />
        <AdminLocalizedInput
          label="Card summary"
          value={route.copy.publicSummary}
          onChange={(publicSummary) => patchCopy({ publicSummary })}
          multiline
          rows={2}
          gateRequired
        />
        <AdminLocalizedInput
          label="Step-by-step"
          value={route.copy.publicText}
          onChange={(publicText) => patchCopy({ publicText })}
          multiline
          rows={3}
          gateRequired
        />
        <AdminLocalizedInput
          label="Get off at"
          value={route.copy.publicGetOffAt}
          onChange={(publicGetOffAt) => patchCopy({ publicGetOffAt })}
          gateRequired={getOffAtRequired}
        />
      </div>

      {!gateReady ? (
        <p className="text-[11px] text-muted-foreground">
          Optional guest copy unlocks when required EN is Ready.
        </p>
      ) : null}

      {gateReady ? (
        <CollapsibleBlock
          title="More guest copy (optional)"
          summary="Walk hints, taxi text, hub hint"
          defaultOpen={hasOptionalGuestCopy(route)}
        >
          <AdminLocalizedInput
            label="Walk to stop"
            value={route.copy.publicPreview}
            onChange={(publicPreview) => patchCopy({ publicPreview })}
            multiline
            rows={2}
          />
          <AdminLocalizedInput
            label="Walk to hostel (default)"
            hint="{address} is replaced with tenant address."
            value={route.copy.publicWalkToHostel}
            onChange={(publicWalkToHostel) => patchCopy({ publicWalkToHostel })}
            multiline
            rows={2}
          />
          {hubHintEditable ? (
            <AdminLocalizedInput
              label="Hub hint"
              value={route.hint ?? { en: '' }}
              onChange={(hint) => patch({ hint })}
            />
          ) : null}
          <AdminLocalizedInput
            label="Taxi cost text"
            hint="{minKM}, {maxKM}, {minEUR}, {maxEUR}"
            value={route.copy.taxiCost}
            onChange={(taxiCost) => patchCopy({ taxiCost })}
            multiline
            rows={2}
          />
          <AdminLocalizedInput
            label="Pickup point"
            value={route.copy.taxiPickupPoint}
            onChange={(taxiPickupPoint) => patchCopy({ taxiPickupPoint })}
          />
          <div className="space-y-2 border-t border-dashed pt-3">
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-foreground">Good to know (optional)</p>
              <p className="text-[11px] text-muted-foreground">
                Short tips shown under the step-by-step modal (max {MAX_ROUTE_TIPS}). Not required for
                publish.
              </p>
            </div>
            {tips.map((tip, index) => (
              <div key={index} className="flex gap-2">
                <div className="min-w-0 flex-1">
                  <AdminLocalizedInput
                    label={`Tip ${index + 1}`}
                    value={tip}
                    onChange={(value) => patchTip(index, value)}
                    multiline
                    rows={2}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeTip(index)}
                  className="mt-5 shrink-0 rounded-md border px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted/50"
                >
                  Remove
                </button>
              </div>
            ))}
            {tips.length < MAX_ROUTE_TIPS ? (
              <button
                type="button"
                onClick={addTip}
                className="rounded-md border border-dashed px-2 py-1.5 text-[11px] font-medium text-muted-foreground hover:bg-muted/40"
              >
                Add tip
              </button>
            ) : null}
          </div>
        </CollapsibleBlock>
      ) : null}
    </div>
  );
}
