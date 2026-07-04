'use client';

import { useEffect, useMemo, useState } from 'react';
import type { RouteId } from '@/entities/hostel';
import {
  ROUTE_PRESETS,
  type CityPackContent,
  type CityPackContentWarnings,
  type CityPackRouteContent,
} from '@/entities/city-pack';
import { resolveRouteLocaleStatus } from '@/entities/city-pack/lib/resolveLocalizedLocaleStatus';
import { cn } from '@/shared/lib/utils';
import type { PhoneDisplayPresetId } from '@/shared/lib/phoneDisplay';
import { AdminPhoneFieldInline } from '../../tenants/ui/AdminPhoneField';
import { ChevronDown } from 'lucide-react';
import { Icon } from '@/shared/ui';
import { AdminLocalizedInput } from './AdminLocalizedInput';
import {
  AdminEditingLocaleProvider,
  AdminEditingLocaleSwitcher,
  LocaleStatusDots,
  useAdminEditingLocale,
} from './AdminLocaleEditContext';
import { CityPackRouteEditor } from './CityPackRouteEditor';
import { CityPackRoutePreview } from './CityPackRoutePreview';

function RouteAccordionItem({
  routeId,
  route,
  open,
  onToggle,
  onChange,
}: {
  routeId: RouteId;
  route: CityPackRouteContent;
  open: boolean;
  onToggle: () => void;
  onChange: (next: CityPackRouteContent) => void;
}) {
  const preset = ROUTE_PRESETS.find((entry) => entry.id === routeId);
  const localeStatus = resolveRouteLocaleStatus(route);
  const modeLabel = route.routeMode === 'walk_only' ? 'Walk' : 'Transit';

  return (
    <div className="overflow-hidden rounded-lg border bg-background">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/30"
      >
        <Icon
          icon={ChevronDown}
          className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{preset?.label ?? routeId}</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
              {modeLabel}
            </span>
          </div>
          <p className="truncate text-[11px] text-muted-foreground">
            {route.copy.publicTitle.en || route.copy.publicTitle.ru || 'No title yet'}
          </p>
        </div>
        <LocaleStatusDots en={localeStatus.en} ru={localeStatus.ru} />
      </button>
      {open ? (
        <div className="border-t px-3 py-3">
          <CityPackRouteEditor routeId={routeId} route={route} onChange={onChange} embedded />
        </div>
      ) : null}
    </div>
  );
}

function CityPackRoutesStepBody({
  packId,
  enabledRoutes,
  routes,
  warnings,
  preTripSundayClosure,
  taxiName,
  taxiPhone,
  taxiMask,
  taxiPreset,
  onEnabledRoutesChange,
  onRoutesChange,
  onWarningsChange,
  onPreTripSundayClosureChange,
  onTaxiNameChange,
  onTaxiPhoneChange,
  onTaxiMaskChange,
  onTaxiPresetChange,
}: {
  packId: string;
  enabledRoutes: RouteId[];
  routes: Partial<Record<RouteId, CityPackRouteContent>>;
  warnings: CityPackContentWarnings;
  preTripSundayClosure: boolean;
  taxiName: string;
  taxiPhone: string;
  taxiMask: string;
  taxiPreset: PhoneDisplayPresetId;
  onEnabledRoutesChange: (routes: RouteId[]) => void;
  onRoutesChange: (routes: Partial<Record<RouteId, CityPackRouteContent>>) => void;
  onWarningsChange: (warnings: CityPackContentWarnings) => void;
  onPreTripSundayClosureChange: (enabled: boolean) => void;
  onTaxiNameChange: (value: string) => void;
  onTaxiPhoneChange: (value: string) => void;
  onTaxiMaskChange: (value: string) => void;
  onTaxiPresetChange: (value: PhoneDisplayPresetId) => void;
}) {
  const { locale } = useAdminEditingLocale();
  const activeRouteEditors = useMemo(
    () => enabledRoutes.filter((routeId) => routes[routeId]),
    [enabledRoutes, routes]
  );
  const [openRouteId, setOpenRouteId] = useState<RouteId | null>(activeRouteEditors[0] ?? null);
  const [warningsOpen, setWarningsOpen] = useState(false);

  useEffect(() => {
    if (openRouteId && activeRouteEditors.includes(openRouteId)) {
      return;
    }

    setOpenRouteId(activeRouteEditors[0] ?? null);
  }, [activeRouteEditors, openRouteId]);

  const previewContent = useMemo<CityPackContent>(
    () => ({
      enabledRoutes,
      routes,
      warnings,
      preTripTips: preTripSundayClosure ? ['sundayClosure'] : undefined,
      recommendedTaxi: taxiName.trim()
        ? {
            name: taxiName.trim(),
            phoneRaw: taxiPhone.trim() || undefined,
            phoneMask: taxiMask.trim() || undefined,
            phoneFormatPreset: taxiPreset,
          }
        : undefined,
    }),
    [enabledRoutes, preTripSundayClosure, routes, taxiMask, taxiName, taxiPhone, taxiPreset, warnings]
  );

  const toggleRoute = (routeId: RouteId) => {
    if (enabledRoutes.includes(routeId)) {
      onEnabledRoutesChange(enabledRoutes.filter((id) => id !== routeId));
      return;
    }

    onEnabledRoutesChange([...enabledRoutes, routeId]);
  };

  const updateRoute = (routeId: RouteId, next: CityPackRouteContent) => {
    onRoutesChange({ ...routes, [routeId]: next });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Shared transport for pack <code className="text-xs">{packId}</code>. Switch language once — all
        text fields below follow <span className="font-medium uppercase">{locale}</span>.
      </p>

      <div className="sticky top-0 z-10 space-y-3 rounded-lg border bg-background/95 p-3 backdrop-blur">
        <AdminEditingLocaleSwitcher label="Editing language" />
        <CityPackRoutePreview packId={packId} content={previewContent} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Enabled hubs</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {ROUTE_PRESETS.map((route) => (
              <label key={route.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={enabledRoutes.includes(route.id)}
                  onChange={() => toggleRoute(route.id)}
                />
                {route.label}
              </label>
            ))}
          </div>
        </div>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Taxi name</span>
          <input
            value={taxiName}
            onChange={(event) => onTaxiNameChange(event.target.value)}
            className="w-full rounded-md border bg-background px-2.5 py-1.5 text-sm"
          />
        </label>
        <AdminPhoneFieldInline
          label="Taxi phone"
          raw={taxiPhone}
          mask={taxiMask}
          preset={taxiPreset}
          onRawChange={onTaxiPhoneChange}
          onMaskChange={onTaxiMaskChange}
          onPresetChange={onTaxiPresetChange}
        />
      </div>

      <div className="rounded-lg border">
        <button
          type="button"
          onClick={() => setWarningsOpen((current) => !current)}
          className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
        >
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            City warnings & tips
          </span>
          <Icon
            icon={ChevronDown}
            className={cn('h-4 w-4 text-muted-foreground transition-transform', warningsOpen && 'rotate-180')}
          />
        </button>
        {warningsOpen ? (
          <div className="space-y-2.5 border-t px-3 py-3">
            <AdminLocalizedInput
              label="Taxi stand warning"
              value={warnings.taxiStand}
              onChange={(taxiStand) => onWarningsChange({ ...warnings, taxiStand })}
              multiline
              rows={2}
            />
            <AdminLocalizedInput
              label="Taxi meter warning"
              value={warnings.taxiMeter}
              onChange={(taxiMeter) => onWarningsChange({ ...warnings, taxiMeter })}
              multiline
              rows={2}
            />
            <AdminLocalizedInput
              label="Bus hub clarification"
              value={warnings.busClarification}
              onChange={(busClarification) => onWarningsChange({ ...warnings, busClarification })}
              multiline
              rows={2}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={preTripSundayClosure}
                onChange={(event) => onPreTripSundayClosureChange(event.target.checked)}
              />
              Sunday closure pre-trip tip
            </label>
          </div>
        ) : null}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Routes</p>
        {enabledRoutes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Enable at least one hub to edit route copy.</p>
        ) : activeRouteEditors.length === 0 ? (
          <p className="text-sm text-amber-800">
            Route bodies are missing for enabled hubs. Toggle a hub off and on, or save draft to repair.
          </p>
        ) : (
          activeRouteEditors.map((routeId) => (
            <RouteAccordionItem
              key={routeId}
              routeId={routeId}
              route={routes[routeId]!}
              open={openRouteId === routeId}
              onToggle={() => setOpenRouteId((current) => (current === routeId ? null : routeId))}
              onChange={(next) => updateRoute(routeId, next)}
            />
          ))
        )}
      </div>
    </div>
  );
}

export function CityPackRoutesStep(props: {
  packId: string;
  enabledRoutes: RouteId[];
  routes: Partial<Record<RouteId, CityPackRouteContent>>;
  warnings: CityPackContentWarnings;
  preTripSundayClosure: boolean;
  taxiName: string;
  taxiPhone: string;
  taxiMask: string;
  taxiPreset: PhoneDisplayPresetId;
  onEnabledRoutesChange: (routes: RouteId[]) => void;
  onRoutesChange: (routes: Partial<Record<RouteId, CityPackRouteContent>>) => void;
  onWarningsChange: (warnings: CityPackContentWarnings) => void;
  onPreTripSundayClosureChange: (enabled: boolean) => void;
  onTaxiNameChange: (value: string) => void;
  onTaxiPhoneChange: (value: string) => void;
  onTaxiMaskChange: (value: string) => void;
  onTaxiPresetChange: (value: PhoneDisplayPresetId) => void;
}) {
  return (
    <AdminEditingLocaleProvider>
      <CityPackRoutesStepBody {...props} />
    </AdminEditingLocaleProvider>
  );
}
