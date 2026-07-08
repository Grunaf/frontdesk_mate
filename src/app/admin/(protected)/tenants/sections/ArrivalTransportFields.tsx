'use client';

import { useMemo, useState } from 'react';
import type { RouteId } from '@/entities/hostel';
import type { CityPackContent, CityPackRouteContent, LocalizedField, LocalizedText } from '@/entities/city-pack/model/types';
import {
  buildTenantWalkSeedFromCityTemplates,
  readCityRouteWalkTemplate,
} from '@/entities/city-pack/lib/resolveArrivalTransportReadiness';
import {
  resolveAdminCityPackEnabledRoutes,
  resolveAdminCityPackRoutes,
  resolveCityDefaultWalkLabel,
} from '@/entities/city-pack/lib/resolveAdminCityPackTransport';
import type {
  CityPackId,
  TenantLocalArrivalMode,
  TenantLocalArrivalPath,
  TenantSettings,
} from '@/entities/tenant';
import {
  ROUTE_PRESETS,
  buildLastMileCityBoundary,
  isTenantLocalHub,
  MAX_ROUTE_TIPS,
  resolveHubArrivalKind,
} from '@/entities/city-pack';
import {
  buildWalkingMapsDestinationOnlyUrl,
  resolveWalkingMapsDestination,
} from '@/features/direction-picker';
import { resolveLocalizedText } from '@/entities/city-pack/model/localized';
import { copyTenantArrivalWalkEnToRu } from '@/entities/tenant/lib/copyTenantArrivalWalkEnToRu';
import {
  AdminLocalizedInput,
  AdminLocalizedPreview,
} from '../../city-packs/ui/AdminLocalizedInput';
import {
  AdminEditingLocaleProvider,
  AdminEditingLocaleSwitcher,
  useAdminEditingLocale,
} from '../../city-packs/ui/AdminLocaleEditContext';
import { AdminLabelHelp } from '../ui/AdminLabelHelp';
import { mergeDraftSettings, useTenantFormDraft } from '../ui/TenantFormDraftContext';
import {
  TenantRouteLastMileGuidedPanel,
} from '@/features/tenant-arrival-guided-fill';
import { TenantLastMileBulkImportPanel } from '@/features/tenant-last-mile-bulk-import';
import { cn } from '@/shared/lib/utils';

type RouteEditMode = 'manual' | 'guided';

const MAPS_URL_HELP = [
  'Paste the full Google Maps walking directions link (point A → your door). Guests open it as-is — we do not rebuild the route.',
  'Hosts with a clear Maps walking CTA typically see fewer lost-guest WhatsApp messages on arrival evenings (~30–40% drop in navigation complaints in ops feedback).',
  'Use “Set route in Google Maps” next to the field: destination is already your hostel address. Pick point A, then copy the full link back here.',
];

function readLocalizedField(value: LocalizedField | undefined): LocalizedText {
  if (!value) {
    return { en: '' };
  }

  if (typeof value === 'string') {
    return { en: value };
  }

  return value;
}

function emptyLocalPath(mode: TenantLocalArrivalMode): TenantLocalArrivalPath {
  return { mode, primaryText: { en: '' } };
}

function cityPackStartHint(
  cityRoute: CityPackRouteContent | undefined,
  getOffOverrideEn?: string
): string {
  const boundary = buildLastMileCityBoundary(cityRoute, {
    getOffOverrideEn,
  });
  if (!boundary?.hasAnchoredStart) {
    return 'City pack has no get-off / walk end yet — set Maps origin to the real drop-off guests stand at.';
  }
  if (boundary.routeMode === 'walk_only') {
    return `End of city walk (pack): “${boundary.anchorLabelEn}”`;
  }
  const cityGetOff = resolveLocalizedText(cityRoute?.copy.publicGetOffAt, 'en').trim();
  if (getOffOverrideEn?.trim()) {
    return `Get-off override in use: “${boundary.anchorLabelEn}” (city pack: “${cityGetOff || '—'}”)`;
  }
  return `City pack get-off: “${boundary.anchorLabelEn}”`;
}

function ArrivalTransportFieldsBody({
  tenantSlug,
  settings,
  cityPackId,
  cityPackContent,
  cityLabel,
}: {
  tenantSlug: string;
  settings?: TenantSettings;
  cityPackId: CityPackId;
  cityPackContent?: CityPackContent;
  cityLabel?: string;
}) {
  const { draft, updateDraft } = useTenantFormDraft();
  const { locale } = useAdminEditingLocale();
  const [editModeByRoute, setEditModeByRoute] = useState<Partial<Record<RouteId, RouteEditMode>>>(
    {}
  );
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
  const tipsByRoute = merged.arrivalRouteTipsByRoute ?? {};
  const mapsUrlByRoute = merged.arrivalWalkMapsUrlByRoute ?? {};
  const getOffByRoute = merged.arrivalGetOffAtByRoute ?? {};
  const localByRoute = merged.arrivalLocalByRoute ?? {};
  const hostelAddress = merged.contacts?.address?.trim() ?? '';
  const mapsUrl = merged.contacts?.mapsUrl?.trim();
  const resolvedCityLabel = cityLabel?.trim() || cityPackId;
  const hostelMapsDestination = resolveWalkingMapsDestination({
    addressDisplay: hostelAddress,
    googleMapsHref: mapsUrl,
  });
  const adminMapsHelperUrl = hostelMapsDestination
    ? buildWalkingMapsDestinationOnlyUrl(hostelMapsDestination)
    : undefined;
  const hasLocalHub = enabledRoutes.some(
    (routeId) => resolveHubArrivalKind(cityRoutes[routeId]) === 'tenant_local'
  );

  const updateWalkByRoute = (routeId: RouteId, next: LocalizedText) => {
    updateDraft({
      arrivalWalkToHostelByRoute: {
        ...walkByRoute,
        [routeId]: next,
      },
    });
  };

  const updateTipsByRoute = (routeId: RouteId, next: LocalizedText[]) => {
    updateDraft({
      arrivalRouteTipsByRoute: {
        ...tipsByRoute,
        [routeId]: next,
      },
    });
  };

  const updateGetOffByRoute = (routeId: RouteId, next: LocalizedText) => {
    const nextMap: Partial<Record<RouteId, LocalizedField>> = { ...getOffByRoute };
    if (next.en?.trim() || next.ru?.trim()) {
      nextMap[routeId] = next;
    } else {
      delete nextMap[routeId];
    }
    updateDraft({ arrivalGetOffAtByRoute: nextMap });
  };

  const updateMapsUrlByRoute = (routeId: RouteId, value: string) => {
    const next: Partial<Record<RouteId, string>> = { ...mapsUrlByRoute };
    const trimmed = value.trim();
    if (trimmed) {
      next[routeId] = value;
    } else {
      delete next[routeId];
    }
    updateDraft({ arrivalWalkMapsUrlByRoute: next });
  };

  const updateLocalByRoute = (routeId: RouteId, path: TenantLocalArrivalPath | undefined) => {
    const next: Partial<Record<RouteId, TenantLocalArrivalPath>> = { ...localByRoute };
    if (path) {
      next[routeId] = path;
    } else {
      delete next[routeId];
    }
    updateDraft({ arrivalLocalByRoute: next });
  };

  const patchLocalByRoute = (
    routeId: RouteId,
    patch: Partial<TenantLocalArrivalPath> & { mode?: TenantLocalArrivalMode }
  ) => {
    const current = localByRoute[routeId];
    const mode = patch.mode ?? current?.mode ?? 'walk';
    const base = current ?? emptyLocalPath(mode);
    updateLocalByRoute(routeId, { ...base, ...patch, mode });
  };

  const hasGlobalWalk = Boolean(globalWalk.en?.trim() || globalWalk.ru?.trim());
  const emptyRouteCount = hasGlobalWalk
    ? 0
    : enabledRoutes.filter((routeId) => {
        if (isTenantLocalHub(cityRoutes[routeId])) {
          return false;
        }
        return (
          !readLocalizedField(walkByRoute[routeId]).en?.trim() &&
          !readLocalizedField(walkByRoute[routeId]).ru?.trim()
        );
      }).length;

  const seedFromCityTemplates = () => {
    const seed = buildTenantWalkSeedFromCityTemplates({
      cityPackId,
      cityPackContent,
      settings: merged,
    });
    updateDraft(seed);
  };

  const applyCityTemplate = (routeId: RouteId) => {
    const template = readCityRouteWalkTemplate(cityPackId, routeId);
    if (template) {
      updateWalkByRoute(routeId, template);
    }
  };

  const renderTipsEditor = (routeId: RouteId) => (
    <div className="mt-2 space-y-2 border-t border-dashed pt-2">
      <p className="text-[11px] font-medium text-muted-foreground">
        Hostel tips (optional, max {MAX_ROUTE_TIPS})
      </p>
      {(tipsByRoute[routeId] ?? []).map((tip, index) => (
        <AdminLocalizedInput
          key={index}
          label={`Tip ${index + 1}`}
          value={tip}
          onChange={(value) => {
            const next = [...(tipsByRoute[routeId] ?? [])];
            next[index] = value;
            updateTipsByRoute(routeId, next);
          }}
          multiline
          rows={2}
        />
      ))}
      {(tipsByRoute[routeId]?.length ?? 0) < MAX_ROUTE_TIPS ? (
        <button
          type="button"
          onClick={() =>
            updateTipsByRoute(routeId, [...(tipsByRoute[routeId] ?? []), { en: '' }])
          }
          className="rounded-md border border-dashed px-2 py-1 text-[11px] text-muted-foreground"
        >
          Add tip
        </button>
      ) : null}
    </div>
  );

  const renderMapsUrlField = (
    routeId: RouteId,
    hint: string
  ) => (
    <div className="mt-3 space-y-1.5 border-t pt-3">
      <span className="inline-flex flex-wrap items-center gap-1.5 text-xs font-medium text-foreground">
        Walking Maps link
        <span className="text-[10px] font-normal text-amber-800">Required</span>
        <AdminLabelHelp fieldLabel="Walking Maps link">
          {MAPS_URL_HELP.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </AdminLabelHelp>
        {adminMapsHelperUrl ? (
          <a
            href={adminMapsHelperUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-medium text-primary hover:underline"
          >
            Set route in Google Maps
          </a>
        ) : (
          <span className="text-[11px] font-normal text-amber-800">
            Set property address in Find building first
          </span>
        )}
      </span>
      <p className="text-[11px] text-muted-foreground">{hint}</p>
      <input
        type="url"
        value={mapsUrlByRoute[routeId] ?? ''}
        onChange={(event) => updateMapsUrlByRoute(routeId, event.target.value)}
        className="w-full rounded-md border bg-background px-2.5 py-1.5 font-mono text-[11px]"
        placeholder="https://www.google.com/maps/dir/?api=1&travelmode=walking&…"
      />
      <p className="text-[11px] text-muted-foreground">
        Paste the full walking directions URL (A → hostel). Never auto-filled.
      </p>
    </div>
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Last mile is <strong>hostel-specific</strong> and required before go-live. Optional starters
        come from built-in city i18n — adjust for this building.
        {hasLocalHub
          ? ' Shared hubs keep city pack copy + hostel walk; Local hubs need a full hostel-owned path (city pack copy is unused).'
          : null}
      </p>

      <AdminEditingLocaleSwitcher label="Editing language" />

      <button
        type="button"
        onClick={() => updateDraft(copyTenantArrivalWalkEnToRu(merged))}
        className="rounded-md border px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted/50"
      >
        Copy EN → RU (directions + tips)
      </button>

      {emptyRouteCount > 0 ? (
        <button
          type="button"
          onClick={seedFromCityTemplates}
          className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10"
        >
          Pre-fill {emptyRouteCount} empty route{emptyRouteCount === 1 ? '' : 's'} from city i18n
          starters
        </button>
      ) : null}

      <TenantLastMileBulkImportPanel
        tenantSlug={tenantSlug}
        cityLabel={resolvedCityLabel}
        hostelAddress={hostelAddress}
        mapsUrl={mapsUrl}
        enabledRoutes={enabledRoutes}
        cityRoutes={cityRoutes}
        walkByRoute={walkByRoute}
        tipsByRoute={tipsByRoute}
        getOffByRoute={getOffByRoute}
        localByRoute={localByRoute}
        onApply={(patch) =>
          updateDraft({
            arrivalWalkToHostelByRoute: patch.arrivalWalkToHostelByRoute,
            arrivalRouteTipsByRoute: patch.arrivalRouteTipsByRoute,
            ...(patch.arrivalGetOffAtByRoute !== undefined
              ? { arrivalGetOffAtByRoute: patch.arrivalGetOffAtByRoute }
              : {}),
            ...(patch.arrivalLocalByRoute !== undefined
              ? { arrivalLocalByRoute: patch.arrivalLocalByRoute }
              : {}),
          })
        }
      />

      <AdminLocalizedInput
        label="Walk to hostel (all routes)"
        hint="Use when the final walk is the same from every hub. Ignored for Local hubs."
        value={globalWalk}
        onChange={(next) => updateDraft({ arrivalWalkToHostel: next })}
        multiline
        rows={2}
      />

      {enabledRoutes.length > 0 ? (
        <div className="space-y-2 border-t pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Per-route last mile (required)
          </p>
          <div className="space-y-2">
            {enabledRoutes.map((routeId) => {
              const preset = ROUTE_PRESETS.find((route) => route.id === routeId);
              const cityDefault = resolveCityDefaultWalkLabel(cityPackId, routeId, locale);
              const hasTemplate = Boolean(readCityRouteWalkTemplate(cityPackId, routeId));
              const editMode = editModeByRoute[routeId] ?? 'manual';
              const cityRoute = cityRoutes[routeId];
              const isLocal = isTenantLocalHub(cityRoute);
              const cityGetOffEn = resolveLocalizedText(cityRoute?.copy.publicGetOffAt, 'en').trim();
              const getOffOverride = readLocalizedField(getOffByRoute[routeId]);
              const getOffOverrideEn = getOffOverride.en?.trim() ?? '';
              const isWalkOnly = cityRoute?.routeMode === 'walk_only';
              const localPath = localByRoute[routeId];
              const localMode: TenantLocalArrivalMode = localPath?.mode ?? 'walk';

              return (
                <div key={routeId} className="rounded-lg border p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">{preset?.label ?? routeId}</p>
                      {isLocal ? (
                        <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-900">
                          Local · hostel-owned path
                        </span>
                      ) : null}
                    </div>
                    {!isLocal ? (
                      <div className="inline-flex rounded-md border p-0.5 text-[10px]">
                        <button
                          type="button"
                          onClick={() =>
                            setEditModeByRoute((current) => ({ ...current, [routeId]: 'manual' }))
                          }
                          className={cn(
                            'rounded px-2 py-0.5 font-medium',
                            editMode === 'manual'
                              ? 'bg-foreground text-background'
                              : 'text-muted-foreground'
                          )}
                        >
                          Manual
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setEditModeByRoute((current) => ({ ...current, [routeId]: 'guided' }))
                          }
                          className={cn(
                            'rounded px-2 py-0.5 font-medium',
                            editMode === 'guided'
                              ? 'bg-violet-700 text-white'
                              : 'text-muted-foreground'
                          )}
                        >
                          Guided
                        </button>
                      </div>
                    ) : null}
                    {!isLocal && cityDefault ? (
                      <AdminLocalizedPreview
                        label="City i18n starter"
                        value={cityDefault}
                        locale={locale}
                      />
                    ) : null}
                  </div>

                  {isLocal ? (
                    <>
                      <p className="mb-3 rounded-md border border-amber-200 bg-amber-50/80 px-2.5 py-1.5 text-[11px] text-amber-950">
                        City pack copy is unused for this hub. Guests see the hostel-owned path below.
                      </p>

                      <div className="mb-3 space-y-1.5">
                        <p className="text-[11px] font-medium text-muted-foreground">Path mode</p>
                        <div className="inline-flex rounded-md border p-0.5 text-[11px]">
                          {([
                            ['walk', 'Walk'],
                            ['transit_lite', 'Transit lite'],
                          ] as const).map(([mode, label]) => (
                            <button
                              key={mode}
                              type="button"
                              onClick={() => {
                                if (!localPath) {
                                  updateLocalByRoute(routeId, emptyLocalPath(mode));
                                  return;
                                }
                                updateLocalByRoute(routeId, { ...localPath, mode });
                              }}
                              className={cn(
                                'rounded px-2 py-0.5 font-medium',
                                localMode === mode
                                  ? 'bg-foreground text-background'
                                  : 'text-muted-foreground'
                              )}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <AdminLocalizedInput
                          label="Title (optional)"
                          hint="Guest card title. Empty = city hub label."
                          value={readLocalizedField(localPath?.title)}
                          onChange={(next) => patchLocalByRoute(routeId, { title: next })}
                          multiline
                          rows={1}
                        />
                        <AdminLocalizedInput
                          label="Summary (optional)"
                          value={readLocalizedField(localPath?.summary)}
                          onChange={(next) => patchLocalByRoute(routeId, { summary: next })}
                          multiline
                          rows={1}
                        />
                        <AdminLocalizedInput
                          label={
                            localMode === 'transit_lite'
                              ? 'Primary directions (required)'
                              : 'Walk directions (required)'
                          }
                          hint={
                            localMode === 'transit_lite'
                              ? 'Board / ride to the drop-off before the final walk.'
                              : 'Full on-foot path from hub to door.'
                          }
                          value={readLocalizedField(localPath?.primaryText)}
                          onChange={(next) => patchLocalByRoute(routeId, { primaryText: next })}
                          multiline
                          rows={2}
                        />
                        {localMode === 'transit_lite' ? (
                          <>
                            <AdminLocalizedInput
                              label="Get off at"
                              value={readLocalizedField(localPath?.getOffAt)}
                              onChange={(next) => patchLocalByRoute(routeId, { getOffAt: next })}
                              multiline
                              rows={1}
                            />
                            <AdminLocalizedInput
                              label="Walk to hostel"
                              value={readLocalizedField(localPath?.walkToHostel)}
                              onChange={(next) =>
                                patchLocalByRoute(routeId, { walkToHostel: next })
                              }
                              multiline
                              rows={2}
                            />
                          </>
                        ) : null}
                      </div>

                      {renderTipsEditor(routeId)}
                      {renderMapsUrlField(
                        routeId,
                        'Maps start should match the hub / drop-off guests use for this hostel-owned path.'
                      )}
                    </>
                  ) : (
                    <>
                      {hasTemplate ? (
                        <button
                          type="button"
                          onClick={() => applyCityTemplate(routeId)}
                          className="mb-2 text-xs font-medium text-primary hover:underline"
                        >
                          Use i18n starter
                        </button>
                      ) : null}
                      {!isWalkOnly ? (
                        <div className="mb-3 space-y-1.5">
                          <AdminLocalizedInput
                            label="Get off (override)"
                            hint="Empty = inherit city pack. Guests and last-mile AI use this when set."
                            value={getOffOverride}
                            onChange={(next) => updateGetOffByRoute(routeId, next)}
                            multiline
                            rows={1}
                          />
                          <p className="text-[11px] text-muted-foreground">
                            City pack: {cityGetOffEn ? `“${cityGetOffEn}”` : '— (not set)'}
                          </p>
                        </div>
                      ) : null}
                      {editMode === 'guided' ? (
                        <TenantRouteLastMileGuidedPanel
                          key={`${routeId}-guided`}
                          tenantSlug={tenantSlug}
                          routeId={routeId}
                          hubLabel={preset?.label ?? routeId}
                          cityRoute={cityRoute}
                          getOffOverrideEn={getOffOverrideEn || undefined}
                          onApply={({ walkEn, tipsEn }) => {
                            const current = readLocalizedField(walkByRoute[routeId]);
                            updateWalkByRoute(routeId, {
                              en: walkEn,
                              ru: current.ru?.trim() ? current.ru : undefined,
                            });
                            if (tipsEn?.length) {
                              updateTipsByRoute(
                                routeId,
                                tipsEn.map((en) => ({ en }))
                              );
                            }
                          }}
                        />
                      ) : (
                        <>
                          <AdminLocalizedInput
                            label="Hostel walk directions"
                            value={readLocalizedField(walkByRoute[routeId])}
                            onChange={(next) => updateWalkByRoute(routeId, next)}
                            multiline
                            rows={2}
                          />
                          {renderTipsEditor(routeId)}
                        </>
                      )}

                      {renderMapsUrlField(
                        routeId,
                        cityPackStartHint(cityRoute, getOffOverrideEn || undefined)
                      )}
                    </>
                  )}
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
  tenantSlug,
  settings,
  cityPackId,
  cityPackContent,
  cityPackLabel,
}: {
  tenantSlug: string;
  settings?: TenantSettings;
  cityPackId: CityPackId;
  cityPackContent?: CityPackContent;
  cityPackLabel?: string;
}) {
  return (
    <AdminEditingLocaleProvider>
      <ArrivalTransportFieldsBody
        tenantSlug={tenantSlug}
        settings={settings}
        cityPackId={cityPackId}
        cityPackContent={cityPackContent}
        cityLabel={cityPackLabel}
      />
    </AdminEditingLocaleProvider>
  );
}
