'use client';

import { useMemo } from 'react';
import type { RouteId } from '@/entities/hostel';
import type { CityPackContent } from '@/entities/city-pack/model/types';
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

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Last-mile overrides are hostel-specific. Empty fields fall back to the city pack default.
      </p>

      <AdminEditingLocaleSwitcher label="Editing language" />

      <AdminLocalizedInput
        label="Walk to hostel (all routes)"
        hint="Overrides city default unless a per-route field is set."
        value={globalWalk}
        onChange={(next) => updateDraft({ arrivalWalkToHostel: next })}
        multiline
        rows={2}
      />

      {enabledRoutes.length > 0 ? (
        <div className="space-y-2 border-t pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Per-route overrides
          </p>
          <div className="space-y-2">
            {enabledRoutes.map((routeId) => {
              const preset = ROUTE_PRESETS.find((route) => route.id === routeId);
              const cityDefault = resolveCityDefaultWalkLabel(cityRoutes, routeId, locale);

              return (
                <div key={routeId} className="rounded-lg border p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">{preset?.label ?? routeId}</p>
                    {cityDefault ? (
                      <AdminLocalizedPreview
                        label="City default"
                        value={cityDefault}
                        locale={locale}
                      />
                    ) : null}
                  </div>
                  <AdminLocalizedInput
                    label="Hostel override"
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
