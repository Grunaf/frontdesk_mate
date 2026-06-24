'use client';

import { useMemo } from 'react';
import type { RouteId } from '@/entities/hostel';
import type { CityPackContent } from '@/entities/city-pack/model/types';
import {
  buildTenantWalkSeedFromCityTemplates,
  readCityRouteWalkTemplate,
} from '@/entities/city-pack/lib/resolveArrivalTransportReadiness';
import {
  resolveAdminCityPackEnabledRoutes,
  resolveAdminCityPackRoutes,
  resolveCityDefaultWalkLabel,
} from '@/entities/city-pack/lib/resolveAdminCityPackTransport';
import type { CityPackId, TenantSettings } from '@/entities/tenant';
import { ROUTE_PRESETS } from '@/entities/city-pack';
import type { LocalizedField, LocalizedText } from '@/entities/city-pack/model/types';
import {
  AdminLocalizedInput,
  AdminLocalizedPreview,
} from '../../city-packs/ui/AdminLocalizedInput';
import {
  AdminEditingLocaleProvider,
  AdminEditingLocaleSwitcher,
  useAdminEditingLocale,
} from '../../city-packs/ui/AdminLocaleEditContext';
import { mergeDraftSettings, useTenantFormDraft } from '../ui/TenantFormDraftContext';

function readLocalizedField(value: LocalizedField | undefined): LocalizedText {
  if (!value) {
    return { en: '' };
  }

  if (typeof value === 'string') {
    return { en: value };
  }

  return value;
}

function ArrivalTransportFieldsBody({
  settings,
  cityPackId,
  cityPackContent,
}: {
  settings?: TenantSettings;
  cityPackId: CityPackId;
  cityPackContent?: CityPackContent;
}) {
  const { draft, updateDraft } = useTenantFormDraft();
  const { locale } = useAdminEditingLocale();
  const merged = useMemo(() => mergeDraftSettings(settings ?? {}, draft), [draft, settings]);

  const enabledRoutes = useMemo(
    () => resolveAdminCityPackEnabledRoutes(cityPackId, cityPackContent),
    [cityPackContent, cityPackId]
  );
  const cityRoutes = useMemo(
    () => resolveAdminCityPackRoutes(cityPackId, cityPackContent),
    [cityPackContent, cityPackId]
  );

  const globalWalk = readLocalizedField(merged.arrivalWalkToHostel);
  const walkByRoute = merged.arrivalWalkToHostelByRoute ?? {};

  const updateWalkByRoute = (routeId: RouteId, next: LocalizedText) => {
    updateDraft({
      arrivalWalkToHostelByRoute: {
        ...walkByRoute,
        [routeId]: next,
      },
    });
  };

  const hasGlobalWalk = Boolean(globalWalk.en?.trim() || globalWalk.ru?.trim());
  const emptyRouteCount = hasGlobalWalk
    ? 0
    : enabledRoutes.filter(
        (routeId) =>
          !readLocalizedField(walkByRoute[routeId]).en?.trim() &&
          !readLocalizedField(walkByRoute[routeId]).ru?.trim()
      ).length;

  const seedFromCityTemplates = () => {
    const seed = buildTenantWalkSeedFromCityTemplates({
      cityPackId,
      cityPackContent,
      settings: merged,
    });
    updateDraft(seed);
  };

  const applyCityTemplate = (routeId: RouteId) => {
    const template = readCityRouteWalkTemplate(cityRoutes, routeId);
    if (template) {
      updateWalkByRoute(routeId, template);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Last mile is <strong>hostel-specific</strong> and required before go-live. City pack walk
        text is an editorial template — pre-fill from it, then adjust for this building.
      </p>

      <AdminEditingLocaleSwitcher label="Editing language" />

      {emptyRouteCount > 0 ? (
        <button
          type="button"
          onClick={seedFromCityTemplates}
          className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10"
        >
          Pre-fill {emptyRouteCount} empty route{emptyRouteCount === 1 ? '' : 's'} from city
          templates
        </button>
      ) : null}

      <AdminLocalizedInput
        label="Walk to hostel (all routes)"
        hint="Use when the final walk is the same from every hub."
        value={globalWalk}
        onChange={(next) => updateDraft({ arrivalWalkToHostel: next })}
        multiline
        rows={2}
      />

      {enabledRoutes.length > 0 ? (
        <div className="space-y-2 border-t pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Per-route walk (required)
          </p>
          <div className="space-y-2">
            {enabledRoutes.map((routeId) => {
              const preset = ROUTE_PRESETS.find((route) => route.id === routeId);
              const cityDefault = resolveCityDefaultWalkLabel(cityRoutes, routeId, locale);
              const hasTemplate = Boolean(readCityRouteWalkTemplate(cityRoutes, routeId));

              return (
                <div key={routeId} className="rounded-lg border p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">{preset?.label ?? routeId}</p>
                    {cityDefault ? (
                      <AdminLocalizedPreview
                        label="City template"
                        value={cityDefault}
                        locale={locale}
                      />
                    ) : null}
                  </div>
                  {hasTemplate ? (
                    <button
                      type="button"
                      onClick={() => applyCityTemplate(routeId)}
                      className="mb-2 text-xs font-medium text-primary hover:underline"
                    >
                      Use city template
                    </button>
                  ) : null}
                  <AdminLocalizedInput
                    label="Hostel walk directions"
                    value={readLocalizedField(walkByRoute[routeId])}
                    onChange={(next) => updateWalkByRoute(routeId, next)}
                    multiline
                    rows={2}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="text-sm text-amber-800">
          City pack has no enabled routes yet. Configure routes in the city pack admin first.
        </p>
      )}
    </div>
  );
}

export function ArrivalTransportFields({
  settings,
  cityPackId,
  cityPackContent,
}: {
  settings?: TenantSettings;
  cityPackId: CityPackId;
  cityPackContent?: CityPackContent;
}) {
  return (
    <AdminEditingLocaleProvider>
      <ArrivalTransportFieldsBody
        settings={settings}
        cityPackId={cityPackId}
        cityPackContent={cityPackContent}
      />
    </AdminEditingLocaleProvider>
  );
}
