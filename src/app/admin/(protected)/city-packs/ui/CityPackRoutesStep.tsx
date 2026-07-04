'use client';

import { useEffect, useMemo, useState } from 'react';
import type { RouteId } from '@/entities/hostel';
import {
  formatRouteGateStatus,
  ROUTE_PRESETS,
  type CityPackContent,
  type CityPackContentWarnings,
  type CityPackRouteContent,
} from '@/entities/city-pack';
import { isLocalizedFilled } from '@/entities/city-pack/lib/resolveLocalizedLocaleStatus';
import { cn } from '@/shared/lib/utils';
import type { PhoneDisplayPresetId } from '@/shared/lib/phoneDisplay';
import { AdminPhoneFieldInline } from '../../tenants/ui/AdminPhoneField';
import { ChevronDown, X } from 'lucide-react';
import { Icon } from '@/shared/ui';
import { AdminLocalizedInput } from './AdminLocalizedInput';
import {
  AdminEditingLocaleProvider,
  AdminEditingLocaleSwitcher,
  useAdminEditingLocale,
} from './AdminLocaleEditContext';
import { CityPackRouteEditor } from './CityPackRouteEditor';
import { CityPackRoutePreview } from './CityPackRoutePreview';

function hasCityWideContent(
  warnings: CityPackContentWarnings,
  taxiName: string,
  taxiPhone: string,
  preTripSundayClosure: boolean
): boolean {
  return (
    Boolean(taxiName.trim()) ||
    Boolean(taxiPhone.trim()) ||
    preTripSundayClosure ||
    isLocalizedFilled(warnings.taxiStand, 'en') ||
    isLocalizedFilled(warnings.taxiStand, 'ru') ||
    isLocalizedFilled(warnings.taxiMeter, 'en') ||
    isLocalizedFilled(warnings.taxiMeter, 'ru') ||
    isLocalizedFilled(warnings.busClarification, 'en') ||
    isLocalizedFilled(warnings.busClarification, 'ru')
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
  const editableRoutes = useMemo(
    () => enabledRoutes.filter((routeId) => routes[routeId]),
    [enabledRoutes, routes]
  );
  const [activeRouteId, setActiveRouteId] = useState<RouteId | null>(editableRoutes[0] ?? null);
  const [cityWideOpen, setCityWideOpen] = useState(() =>
    hasCityWideContent(warnings, taxiName, taxiPhone, preTripSundayClosure)
  );

  useEffect(() => {
    if (activeRouteId && editableRoutes.includes(activeRouteId)) {
      return;
    }

    setActiveRouteId(editableRoutes[0] ?? null);
  }, [activeRouteId, editableRoutes]);

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

  const selectHub = (routeId: RouteId) => {
    if (!enabledRoutes.includes(routeId)) {
      onEnabledRoutesChange([...enabledRoutes, routeId]);
    }
    setActiveRouteId(routeId);
  };

  const disableHub = (routeId: RouteId) => {
    onEnabledRoutesChange(enabledRoutes.filter((id) => id !== routeId));
  };

  const updateRoute = (routeId: RouteId, next: CityPackRouteContent) => {
    onRoutesChange({ ...routes, [routeId]: next });
  };

  const activeRoute = activeRouteId ? routes[activeRouteId] : undefined;
  const activeGate = formatRouteGateStatus(activeRoute);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Arrival hubs for <code className="text-xs">{packId}</code>. Click a hub to enable and edit.
        Fill required EN fields, then optional details. Save draft anytime.
      </p>

      <AdminEditingLocaleSwitcher
        label={
          locale === 'en' ? 'Editing: EN — required for publish' : 'Editing: RU — optional'
        }
      />

      <div className="space-y-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Arrival hubs
          </p>
          <p className="text-[11px] text-muted-foreground">
            Click to edit · × to turn off. Guests pick one on arrival.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {ROUTE_PRESETS.map((preset) => {
            const enabled = enabledRoutes.includes(preset.id);
            const gate = formatRouteGateStatus(routes[preset.id]);
            const active = activeRouteId === preset.id;

            return (
              <div
                key={preset.id}
                className={cn(
                  'inline-flex items-stretch overflow-hidden rounded-full border text-sm',
                  !enabled && 'border-dashed border-border bg-background text-muted-foreground',
                  enabled &&
                    active &&
                    'border-foreground bg-foreground text-background',
                  enabled &&
                    !active &&
                    gate.ready &&
                    'border-border bg-background text-foreground',
                  enabled &&
                    !active &&
                    !gate.ready &&
                    'border-amber-300 bg-amber-50 text-amber-950'
                )}
              >
                <button
                  type="button"
                  onClick={() => selectHub(preset.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-left"
                >
                  <span className="font-medium">{preset.label}</span>
                  <span
                    className={cn(
                      'text-[10px] font-medium uppercase tracking-wide',
                      !enabled && 'text-muted-foreground',
                      enabled && active && 'text-background/80',
                      enabled && !active && gate.ready && 'text-green-700',
                      enabled && !active && !gate.ready && 'text-amber-800'
                    )}
                  >
                    {enabled ? gate.shortLabel : 'Off'}
                  </span>
                </button>
                {enabled ? (
                  <button
                    type="button"
                    aria-label={`Turn off ${preset.label}`}
                    onClick={() => disableHub(preset.id)}
                    className={cn(
                      'border-l px-2 text-muted-foreground hover:bg-black/5',
                      active && 'border-background/20 text-background/80 hover:bg-background/10'
                    )}
                  >
                    <Icon icon={X} className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {enabledRoutes.length === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
          Turn on at least one hub to edit arrival copy.
        </p>
      ) : editableRoutes.length === 0 ? (
        <p className="rounded-lg border border-dashed border-amber-200 bg-amber-50 px-4 py-6 text-center text-sm text-amber-900">
          Route bodies are missing. Turn a hub off and on, or save draft to repair.
        </p>
      ) : activeRouteId && activeRoute ? (
        <div className="space-y-3 rounded-lg border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium">
                {ROUTE_PRESETS.find((entry) => entry.id === activeRouteId)?.label ?? activeRouteId}
              </p>
              <p
                className={cn(
                  'text-[11px]',
                  activeGate.ready ? 'text-green-800' : 'text-amber-800'
                )}
              >
                {activeGate.statusLabel}
              </p>
            </div>
          </div>
          <CityPackRouteEditor
            key={activeRouteId}
            packId={packId}
            routeId={activeRouteId}
            route={activeRoute}
            onChange={(next) => updateRoute(activeRouteId, next)}
            embedded
            showHubHint={
              enabledRoutes.includes('bus_central') && enabledRoutes.includes('bus_istochno')
            }
          />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Select a hub to edit.</p>
      )}

      {enabledRoutes.length > 0 ? (
        <CityPackRoutePreview
          packId={packId}
          content={previewContent}
          activeRouteId={activeRouteId}
        />
      ) : null}

      <div className="rounded-lg border">
        <button
          type="button"
          onClick={() => setCityWideOpen((current) => !current)}
          className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
        >
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              City-wide (optional)
            </p>
            <p className="text-[11px] text-muted-foreground">Taxi, warnings, and pre-trip tips</p>
          </div>
          <Icon
            icon={ChevronDown}
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform',
              cityWideOpen && 'rotate-180'
            )}
          />
        </button>
        {cityWideOpen ? (
          <div className="space-y-3 border-t px-3 py-3">
            <div className="grid gap-3 sm:grid-cols-2">
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
