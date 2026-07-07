'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { RouteCategory, RouteId } from '@/entities/hostel';
import {
  addCityPackArrivalHub,
  countOfferedCityPackBusHubs,
  formatRouteGateStatus,
  listAdminCityPackHubRouteIds,
  resolveCityPackHubAdminLabel,
  type CityPackContentWarnings,
  type CityPackRouteContent,
} from '@/entities/city-pack';
import { cn } from '@/shared/lib/utils';
import type { PhoneDisplayPresetId } from '@/shared/lib/phoneDisplay';
import {
  AdminEditingLocaleProvider,
  AdminEditingLocaleSwitcher,
  useAdminEditingLocale,
} from './AdminLocaleEditContext';
import { CityPackRouteEditor } from './CityPackRouteEditor';
import { CityPackBulkImportPanel } from '@/features/city-pack-bulk-import';
import { CityPackTaxiServiceModule } from './CityPackTaxiServiceModule';
import { CityPackHubWarningsModule } from './CityPackHubWarningsModule';
import { CityPackAddHubPanel } from './CityPackAddHubPanel';
import { AdminSettingsDrillDown } from '../../tenants/ui/AdminSettingsDrillDown';
import {
  CITY_PACK_ROUTES_ADMIN_MODULES,
  CITY_PACK_ROUTE_MODULE_DESCRIPTION,
  decodeCityPackRouteModuleId,
  encodeCityPackRouteModuleId,
  getCityPackRouteModuleHint,
  getCityPackRouteModuleStatus,
  getCityPackRoutesModuleHint,
  getCityPackRoutesModuleStatus,
} from '../lib/cityPackRoutesAdminSubsections';
import type { AdminSettingsDrillDownGroup } from '../../tenants/ui/AdminSettingsDrillDown';

function CityPackRoutesStepBody({
  packId,
  packLabel,
  enabledRoutes,
  routes,
  warnings,
  preTripSundayClosure,
  taxiName,
  taxiPhone,
  taxiMask,
  taxiPreset,
  transportCurrencyMode,
  onEnabledRoutesChange,
  onRoutesChange,
  onWarningsChange,
  onTaxiNameChange,
  onTaxiPhoneChange,
  onTaxiMaskChange,
  onTaxiPresetChange,
}: {
  packId: string;
  packLabel: string;
  enabledRoutes: RouteId[];
  routes: Partial<Record<RouteId, CityPackRouteContent>>;
  warnings: CityPackContentWarnings;
  preTripSundayClosure: boolean;
  taxiName: string;
  taxiPhone: string;
  taxiMask: string;
  taxiPreset: PhoneDisplayPresetId;
  transportCurrencyMode: import('@/entities/city-pack').CityPackTransportCurrencyMode;
  onEnabledRoutesChange: (routes: RouteId[]) => void;
  onRoutesChange: (routes: Partial<Record<RouteId, CityPackRouteContent>>) => void;
  onWarningsChange: (warnings: CityPackContentWarnings) => void;
  onTaxiNameChange: (value: string) => void;
  onTaxiPhoneChange: (value: string) => void;
  onTaxiMaskChange: (value: string) => void;
  onTaxiPresetChange: (value: PhoneDisplayPresetId) => void;
}) {
  const { locale } = useAdminEditingLocale();
  const packHubRouteIds = useMemo(() => listAdminCityPackHubRouteIds(routes), [routes]);
  const editableRoutes = useMemo(
    () => enabledRoutes.filter((routeId) => routes[routeId]),
    [enabledRoutes, routes]
  );
  const offeredBusHubCount = useMemo(
    () => countOfferedCityPackBusHubs(enabledRoutes, routes),
    [enabledRoutes, routes]
  );
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);

  useEffect(() => {
    const routeId = activeModuleId ? decodeCityPackRouteModuleId(activeModuleId) : null;
    if (!routeId) {
      return;
    }
    if (!editableRoutes.includes(routeId)) {
      setActiveModuleId(null);
    }
  }, [activeModuleId, editableRoutes]);

  const moduleInput = useMemo(
    () => ({ taxiName, taxiPhone, warnings }),
    [taxiName, taxiPhone, warnings]
  );

  const transportContent = useMemo(
    () => ({ transportCurrency: { mode: transportCurrencyMode } }),
    [transportCurrencyMode]
  );

  const setHubOffered = useCallback(
    (routeId: RouteId, offered: boolean) => {
      if (offered) {
        if (!enabledRoutes.includes(routeId)) {
          onEnabledRoutesChange([...enabledRoutes, routeId]);
        }
        return;
      }
      if (activeModuleId === encodeCityPackRouteModuleId(routeId)) {
        setActiveModuleId(null);
      }
      onEnabledRoutesChange(enabledRoutes.filter((id) => id !== routeId));
    },
    [activeModuleId, enabledRoutes, onEnabledRoutesChange]
  );

  const handleAddHub = useCallback(
    (category: RouteCategory, displayNameEn: string) => {
      const result = addCityPackArrivalHub({
        packId,
        category,
        displayNameEn,
        enabledRoutes,
        routes,
        content: transportContent,
      });
      if (!result.ok) {
        return;
      }
      onRoutesChange(result.routes);
      onEnabledRoutesChange(result.enabledRoutes);
      setActiveModuleId(encodeCityPackRouteModuleId(result.routeId));
    },
    [enabledRoutes, onEnabledRoutesChange, onRoutesChange, packId, routes, transportContent]
  );

  const updateRoute = (routeId: RouteId, next: CityPackRouteContent) => {
    onRoutesChange({ ...routes, [routeId]: next });
  };

  const packWideModules = useMemo(
    () =>
      CITY_PACK_ROUTES_ADMIN_MODULES.filter(
        (definition) => definition.id !== 'hub-warnings' || offeredBusHubCount >= 2
      ).map((definition) => ({
        id: definition.id,
        label: definition.label,
        description: definition.description,
        hint: getCityPackRoutesModuleHint(definition.id, moduleInput),
        status: getCityPackRoutesModuleStatus(definition.id, moduleInput),
        render: () => {
          switch (definition.id) {
            case 'taxi-service':
              return (
                <CityPackTaxiServiceModule
                  taxiName={taxiName}
                  taxiPhone={taxiPhone}
                  taxiMask={taxiMask}
                  taxiPreset={taxiPreset}
                  warnings={warnings}
                  onTaxiNameChange={onTaxiNameChange}
                  onTaxiPhoneChange={onTaxiPhoneChange}
                  onTaxiMaskChange={onTaxiMaskChange}
                  onTaxiPresetChange={onTaxiPresetChange}
                  onWarningsChange={onWarningsChange}
                />
              );
            case 'hub-warnings':
              return (
                <CityPackHubWarningsModule warnings={warnings} onWarningsChange={onWarningsChange} />
              );
            default:
              return null;
          }
        },
      })),
    [
      moduleInput,
      offeredBusHubCount,
      onTaxiMaskChange,
      onTaxiNameChange,
      onTaxiPhoneChange,
      onTaxiPresetChange,
      onWarningsChange,
      taxiMask,
      taxiName,
      taxiPhone,
      taxiPreset,
      warnings,
    ]
  );

  const hubRouteModules = useMemo(
    () =>
      packHubRouteIds.map((routeId) => {
        const route = routes[routeId];
        const offered = enabledRoutes.includes(routeId);
        const label = resolveCityPackHubAdminLabel(routeId, route);
        return {
          id: encodeCityPackRouteModuleId(routeId),
          label,
          description: CITY_PACK_ROUTE_MODULE_DESCRIPTION,
          hint: getCityPackRouteModuleHint(route, { offered }),
          status: getCityPackRouteModuleStatus(route, { offered }),
          hubOffered: offered,
          hubOfferedAriaLabel: `Offer ${label} to guests on arrival`,
          onHubOfferedChange: (nextOffered: boolean) => setHubOffered(routeId, nextOffered),
          render: () => {
            const currentRoute = routes[routeId];
            if (!currentRoute) {
              return (
                <p className="text-sm text-amber-900">
                  Route content is missing. Turn this hub on, or save draft to repair.
                </p>
              );
            }
            const gate = formatRouteGateStatus(currentRoute);
            return (
              <>
                <p
                  className={cn(
                    'text-[11px]',
                    gate.ready ? 'text-green-800' : 'text-amber-800'
                  )}
                >
                  {gate.statusLabel}
                </p>
                <CityPackRouteEditor
                  key={routeId}
                  packId={packId}
                  routeId={routeId}
                  route={currentRoute}
                  onChange={(next) => updateRoute(routeId, next)}
                  embedded
                  showHubHint={offeredBusHubCount >= 2}
                  transportCurrencyMode={transportCurrencyMode}
                />
              </>
            );
          },
        };
      }),
    [
      enabledRoutes,
      offeredBusHubCount,
      packHubRouteIds,
      packId,
      routes,
      setHubOffered,
      transportCurrencyMode,
    ]
  );

  const routesDrillDownGroups = useMemo((): AdminSettingsDrillDownGroup[] => {
    const groups: AdminSettingsDrillDownGroup[] = [];
    if (hubRouteModules.length > 0) {
      groups.push({ title: 'Arrival hubs', modules: hubRouteModules });
    }
    if (packWideModules.length > 0) {
      groups.push({ title: 'Pack-wide (optional)', modules: packWideModules });
    }
    return groups;
  }, [hubRouteModules, packWideModules]);

  const routesDrillDownModules = useMemo(
    () => routesDrillDownGroups.flatMap((group) => group.modules),
    [routesDrillDownGroups]
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Arrival hubs for <code className="text-xs">{packId}</code>. Use the toggle to offer a hub to
        guests; open the row to edit copy. Fill required EN fields, then optional details. Save draft
        anytime.
      </p>

      <AdminEditingLocaleSwitcher
        label={
          locale === 'en' ? 'Editing: EN — required for publish' : 'Editing: RU — optional'
        }
      />

      <CityPackBulkImportPanel
        packId={packId}
        cityLabel={packLabel}
        enabledRoutes={enabledRoutes}
        routes={routes}
        transportCurrencyMode={transportCurrencyMode}
        onEnabledRoutesChange={onEnabledRoutesChange}
        onRoutesChange={onRoutesChange}
      />

      <CityPackAddHubPanel routes={routes} onAdd={handleAddHub} />

      {enabledRoutes.length > 0 && editableRoutes.length === 0 ? (
        <p className="rounded-lg border border-dashed border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Some offered hubs are missing route bodies. Turn a hub on, or save draft to repair.
        </p>
      ) : null}

      {routesDrillDownModules.length > 0 ? (
        <div className="rounded-lg border p-3">
          <p className="mb-2 px-2.5 text-[11px] text-muted-foreground">
            Toggle = guest can pick this hub · row = edit arrival copy (only when offered)
          </p>
          <AdminSettingsDrillDown
            activeModuleId={activeModuleId}
            onModuleChange={setActiveModuleId}
            modules={routesDrillDownModules}
            groups={routesDrillDownGroups}
            backLabel="Back to routes"
          />
        </div>
      ) : (
        <p className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
          No arrival hubs yet. Add at least one hub guests can arrive from.
        </p>
      )}
    </div>
  );
}

export function CityPackRoutesStep(props: {
  packId: string;
  packLabel: string;
  enabledRoutes: RouteId[];
  routes: Partial<Record<RouteId, CityPackRouteContent>>;
  warnings: CityPackContentWarnings;
  preTripSundayClosure: boolean;
  taxiName: string;
  taxiPhone: string;
  taxiMask: string;
  taxiPreset: PhoneDisplayPresetId;
  transportCurrencyMode: import('@/entities/city-pack').CityPackTransportCurrencyMode;
  onEnabledRoutesChange: (routes: RouteId[]) => void;
  onRoutesChange: (routes: Partial<Record<RouteId, CityPackRouteContent>>) => void;
  onWarningsChange: (warnings: CityPackContentWarnings) => void;
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
