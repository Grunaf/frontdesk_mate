'use client';

import { useState } from 'react';
import type { RouteId } from '@/entities/hostel';
import type {
  CityPackRouteContent,
  CityPackTransportCurrencyMode,
  HubArrivalKind,
  LocalizedText,
} from '@/entities/city-pack/model/types';
import {
  copyRouteEnToRu,
  isLocalizedFilled,
} from '@/entities/city-pack/lib/resolveLocalizedLocaleStatus';
import { formatRouteGateStatus, MAX_ROUTE_TIPS, ROUTE_PRESETS, resolveHubArrivalKind } from '@/entities/city-pack';
import { cn } from '@/shared/lib/utils';
import { ChevronDown } from 'lucide-react';
import { Icon } from '@/shared/ui';
import { AdminLocalizedInput } from './AdminLocalizedInput';
import { CityPackRouteGuidedPanel } from '@/features/city-pack-guided-fill';
import { CityPackRouteMetadataFields } from './CityPackRouteMetadataFields';

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

function hasOptionalTipsContent(route: CityPackRouteContent): boolean {
  return (
    hasRouteTips(route) ||
    isLocalizedFilled(route.hint, 'en') ||
    isLocalizedFilled(route.hint, 'ru')
  );
}

function tipsSectionSummary(route: CityPackRouteContent): string {
  const tipCount = route.tips?.filter(
    (tip) => isLocalizedFilled(tip, 'en') || isLocalizedFilled(tip, 'ru')
  ).length;
  if (tipCount) {
    return tipCount === 1 ? '1 tip' : `${tipCount} tips`;
  }
  if (
    isLocalizedFilled(route.hint, 'en') ||
    isLocalizedFilled(route.hint, 'ru')
  ) {
    return 'Hub hint set';
  }
  return 'Optional';
}

type EditorMode = 'manual' | 'guided';

export function CityPackRouteEditor({
  packId,
  routeId,
  route,
  onChange,
  embedded = false,
  showHubHint = false,
  transportCurrencyMode = 'eur_only',
}: {
  packId: string;
  routeId: RouteId;
  route: CityPackRouteContent;
  onChange: (next: CityPackRouteContent) => void;
  embedded?: boolean;
  showHubHint?: boolean;
  transportCurrencyMode?: CityPackTransportCurrencyMode;
}) {
  const [editorMode, setEditorMode] = useState<EditorMode>('manual');
  const preset = ROUTE_PRESETS.find((entry) => entry.id === routeId);
  const hubArrivalKind = resolveHubArrivalKind(route);
  const isTenantLocal = hubArrivalKind === 'tenant_local';
  const gateReady = formatRouteGateStatus(route).ready;
  const isWalkOnly = route.routeMode === 'walk_only';
  const getOffAtRequired = !isWalkOnly && !isTenantLocal;
  const walkToStopRequired = !isWalkOnly && !isTenantLocal;
  const hubHintEditable =
    showHubHint && (routeId === 'bus_central' || routeId === 'bus_istochno');

  const patch = (partial: Partial<CityPackRouteContent>) => onChange({ ...route, ...partial });
  const patchCopy = (partial: Partial<CityPackRouteContent['copy']>) =>
    onChange({ ...route, copy: { ...route.copy, ...partial } });
  const setHubArrivalKind = (next: HubArrivalKind) => patch({ hubArrivalKind: next });

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

  const modeToggle = (
    <div className="inline-flex rounded-md border p-0.5 text-[11px]">
      <button
        type="button"
        onClick={() => setEditorMode('manual')}
        className={cn(
          'rounded px-2 py-0.5 font-medium',
          editorMode === 'manual' ? 'bg-foreground text-background' : 'text-muted-foreground'
        )}
      >
        Manual
      </button>
      <button
        type="button"
        onClick={() => setEditorMode('guided')}
        className={cn(
          'rounded px-2 py-0.5 font-medium',
          editorMode === 'guided' ? 'bg-violet-700 text-white' : 'text-muted-foreground'
        )}
      >
        Guided
      </button>
    </div>
  );

  const toolbar = (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {modeToggle}
      <button
        type="button"
        onClick={() => onChange(copyRouteEnToRu(route))}
        className="rounded-md border px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted/50"
      >
        Copy EN → RU
      </button>
      {editorMode === 'manual' ? (
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
      ) : null}
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

      {editorMode === 'guided' ? (
        <CityPackRouteGuidedPanel
          packId={packId}
          routeId={routeId}
          hubLabel={preset?.label ?? routeId}
          route={route}
          transportCurrencyMode={transportCurrencyMode}
          onApply={onChange}
        />
      ) : null}

      {editorMode === 'manual' ? (
        <>
      <AdminLocalizedInput
        label="Hub display name"
        hint="Admin list, drill-down title, and guest taxi pickup. Not the arrival card title."
        value={route.locationLabel}
        onChange={(locationLabel) => patch({ locationLabel })}
      />

      <fieldset className="space-y-2 rounded-md border p-3">
        <legend className="px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Guest path ownership
        </legend>
        <label className="flex cursor-pointer items-start gap-2 text-sm">
          <input
            type="radio"
            name={`hubArrivalKind-${routeId}`}
            checked={hubArrivalKind === 'city_shared'}
            onChange={() => setHubArrivalKind('city_shared')}
            className="mt-1"
          />
          <span>
            <span className="font-medium">Shared city route</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              City pack owns transit / walk-only to a shared get-off. Tenant adds last mile + Maps.
            </span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-2 text-sm">
          <input
            type="radio"
            name={`hubArrivalKind-${routeId}`}
            checked={hubArrivalKind === 'tenant_local'}
            onChange={() => setHubArrivalKind('tenant_local')}
            className="mt-1"
          />
          <span>
            <span className="font-medium">Local (hostel-owned)</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              City pack keeps hub meta only. Each tenant fills the full hub → door path.
            </span>
          </span>
        </label>
        {isTenantLocal ? (
          <p className="rounded-md border border-amber-200 bg-amber-50/80 px-2.5 py-2 text-xs text-amber-950">
            Tenant fills full directions; city copy is not used for guest legs. Publish gate skips
            shared step-by-step / get-off.
          </p>
        ) : null}
      </fieldset>

      <CityPackRouteMetadataFields
        route={route}
        currencyMode={transportCurrencyMode}
        onChange={onChange}
      />

      {isTenantLocal ? (
        <p className="text-[11px] text-muted-foreground">
          Optional city copy below is ignored for guests while this hub is Local. Switch to Shared to
          use it.
        </p>
      ) : null}

      <div
        className={cn(
          'space-y-2.5 rounded-md border p-3',
          isTenantLocal
            ? 'border-border/60 bg-muted/20 opacity-80'
            : 'border-amber-200/80 bg-amber-50/30'
        )}
      >
        <div className="space-y-0.5">
          <p
            className={cn(
              'text-[11px] font-medium uppercase tracking-wide',
              isTenantLocal ? 'text-muted-foreground' : 'text-amber-900'
            )}
          >
            {isTenantLocal ? 'City copy (not used for guests)' : 'Required for publish (EN)'}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {isTenantLocal
              ? 'Soft / skipped for Local hubs. Fill only if you may switch this hub back to Shared later.'
              : `Fill these in English. RU is optional and can wait.${
                  isWalkOnly ? ' Walk-only hubs skip Walk to stop and Get off at.' : ''
                }`}
          </p>
        </div>
        <AdminLocalizedInput
          label="Card title"
          value={route.copy.publicTitle}
          onChange={(publicTitle) => patchCopy({ publicTitle })}
          gateRequired={!isTenantLocal}
        />
        <AdminLocalizedInput
          label="Card summary"
          value={route.copy.publicSummary}
          onChange={(publicSummary) => patchCopy({ publicSummary })}
          multiline
          rows={2}
          gateRequired={!isTenantLocal}
        />
        {!isWalkOnly ? (
          <AdminLocalizedInput
            label="Walk to stop"
            value={route.copy.publicPreview}
            onChange={(publicPreview) => patchCopy({ publicPreview })}
            multiline
            rows={2}
            gateRequired={walkToStopRequired}
          />
        ) : null}
        <AdminLocalizedInput
          label="Step-by-step"
          value={route.copy.publicText}
          onChange={(publicText) => patchCopy({ publicText })}
          multiline
          rows={3}
          gateRequired={!isTenantLocal}
        />
        {!isWalkOnly ? (
        <AdminLocalizedInput
          label="Get off at"
          value={route.copy.publicGetOffAt}
          onChange={(publicGetOffAt) => patchCopy({ publicGetOffAt })}
          gateRequired={getOffAtRequired}
        />
        ) : null}
      </div>

      {!gateReady && !isTenantLocal ? (
        <p className="text-[11px] text-muted-foreground">
          Tips unlock when required EN is Ready.
        </p>
      ) : null}

      {gateReady || isTenantLocal ? (
        <CollapsibleBlock
          title="Good to know (optional)"
          summary={tipsSectionSummary(route)}
          defaultOpen={hasOptionalTipsContent(route)}
        >
          <p className="text-[11px] text-muted-foreground">
            Short tips shown under the step-by-step modal (max {MAX_ROUTE_TIPS}). Not required for
            publish.
            {isTenantLocal
              ? ' For Local hubs, guest tips usually come from the tenant form.'
              : ''}
          </p>
          {hubHintEditable ? (
            <AdminLocalizedInput
              label="Hub hint"
              value={route.hint ?? { en: '' }}
              onChange={(hint) => patch({ hint })}
            />
          ) : null}
          <div className="space-y-2">
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
        </>
      ) : null}
    </div>
  );
}
