'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PlaceCategory } from '@/entities/hostel';
import { PLACE_CATEGORY_IDS, resolvePlaceCategoryAdminLabel } from '@/entities/hostel';
import {
  countGatePlaces,
  hasRouteGate,
  isPackReadyForTenants,
  MIN_PLACES_FOR_PACK,
  resolveFirstIncompletePackStep,
  type CityPackAdminPlace,
  type CityPackContent,
  type CityPackContentWarnings,
  type CityPackRecord,
  type CityPackRouteContent,
  type CityPackWizardStepId,
} from '@/entities/city-pack';
import {
  buildCityPackContentWarningsFromCode,
  buildCityPackRouteSeedContent,
  isCodeCityPackRouteSeedAvailable,
} from '@/entities/city-pack/lib/buildCityPackRouteContentFromCode';
import {
  resolveAdminCityPackEnabledRoutes,
  resolveAdminCityPackRoutes,
} from '@/entities/city-pack/lib/resolveAdminCityPackTransport';
import {
  normalizeCityPackAdminPlace,
  serializeCityPackAdminPlace,
} from '@/entities/city-pack/lib/normalizeCityPackAdminPlace';
import { saveCityPackAction } from '../actions';
import { cn } from '@/shared/lib/utils';
import { Icon } from '@/shared/ui';
import { PlaceIconPicker } from './PlaceIconPicker';
import { CityPackRoutesStep } from './CityPackRoutesStep';
import type { RouteId } from '@/entities/hostel';
import { CITY_PACK_WIZARD_STEPS } from '@/entities/city-pack';

interface CityPackWizardProps {
  pack: CityPackRecord;
  saved?: boolean;
  error?: string;
}

function createPlaceId() {
  return `place-${Date.now().toString(36)}`;
}

function readPackSeed(packId: string) {
  if (!isCodeCityPackRouteSeedAvailable(packId)) {
    return { routes: {}, warnings: undefined, preTripTips: undefined };
  }

  return buildCityPackRouteSeedContent(packId);
}

function initialWarnings(pack: CityPackRecord): CityPackContentWarnings {
  return (
    pack.content.warnings ??
    (isCodeCityPackRouteSeedAvailable(pack.id)
      ? buildCityPackContentWarningsFromCode(pack.id)
      : undefined) ??
    {}
  );
}

export function CityPackWizard({ pack, saved, error }: CityPackWizardProps) {
  const initialStep = resolveFirstIncompletePackStep({
    label: pack.label,
    content: pack.content,
    packId: pack.id,
  });

  const [stepId, setStepId] = useState<CityPackWizardStepId>(initialStep);
  const [label, setLabel] = useState(pack.label);
  const [places, setPlaces] = useState<CityPackAdminPlace[]>(() =>
    (pack.content.places ?? []).map(normalizeCityPackAdminPlace)
  );
  const [enabledRoutes, setEnabledRoutes] = useState<RouteId[]>(() =>
    resolveAdminCityPackEnabledRoutes(pack.id, pack.content)
  );
  const [routes, setRoutes] = useState<Partial<Record<RouteId, CityPackRouteContent>>>(() =>
    resolveAdminCityPackRoutes(pack.id, pack.content)
  );
  const [warnings, setWarnings] = useState<CityPackContentWarnings>(() => initialWarnings(pack));
  const [preTripSundayClosure, setPreTripSundayClosure] = useState(
    () =>
      pack.content.preTripTips?.includes('sundayClosure') ??
      readPackSeed(pack.id).preTripTips?.includes('sundayClosure') ??
      false
  );
  const [taxiName, setTaxiName] = useState(pack.content.recommendedTaxi?.name ?? '');
  const [taxiPhone, setTaxiPhone] = useState(pack.content.recommendedTaxi?.phoneRaw ?? '');
  const [taxiMask, setTaxiMask] = useState(pack.content.recommendedTaxi?.phoneMask ?? '');

  const content = useMemo<CityPackContent>(
    () => ({
      places,
      enabledRoutes,
      routes,
      warnings,
      preTripTips: preTripSundayClosure ? ['sundayClosure'] : undefined,
      recommendedTaxi: taxiName.trim()
        ? {
            name: taxiName.trim(),
            phoneRaw: taxiPhone.trim() || undefined,
            phoneMask: taxiMask.trim() || undefined,
          }
        : undefined,
    }),
    [enabledRoutes, places, preTripSundayClosure, routes, taxiMask, taxiName, taxiPhone, warnings]
  );

  const placesCount = countGatePlaces(content);
  const routesGateMet = hasRouteGate(content);
  const gateContentMet = isPackReadyForTenants({
    status: 'ready',
    content,
    packId: pack.id,
  });
  const publishedReady = pack.status === 'ready' && gateContentMet;
  const readyToPublish = pack.status === 'draft' && gateContentMet;
  const badgeLabel = publishedReady
    ? 'Ready for tenants'
    : readyToPublish
      ? 'Ready to publish'
      : 'Not ready for tenants';
  const badgeClass = publishedReady
    ? 'bg-green-100 text-green-800'
    : 'bg-amber-100 text-amber-900';

  const stepIndex = CITY_PACK_WIZARD_STEPS.findIndex((step) => step.id === stepId);

  const goNext = () => {
    const next = CITY_PACK_WIZARD_STEPS[stepIndex + 1];
    if (next) {
      setStepId(next.id);
    }
  };

  const goBack = () => {
    const prev = CITY_PACK_WIZARD_STEPS[stepIndex - 1];
    if (prev) {
      setStepId(prev.id);
    }
  };

  const addPlace = () => {
    setPlaces((current) => [
      ...current,
      {
        id: createPlaceId(),
        name: '',
        category: 'food',
        isTopPick: false,
        needNow: false,
      },
    ]);
  };

  const updatePlace = (id: string, patch: Partial<CityPackAdminPlace>) => {
    setPlaces((current) => current.map((place) => (place.id === id ? { ...place, ...patch } : place)));
  };

  const removePlace = (id: string) => {
    setPlaces((current) => current.filter((place) => place.id !== id));
  };

  const handleEnabledRoutesChange = (next: RouteId[]) => {
    const seedRoutes = resolveAdminCityPackRoutes(pack.id, pack.content);
    setRoutes((current) => {
      const merged = { ...current };
      for (const routeId of next) {
        if (!merged[routeId] && seedRoutes[routeId]) {
          merged[routeId] = seedRoutes[routeId]!;
        }
      }
      return merged;
    });
    setEnabledRoutes(next);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/city-packs" className="text-sm text-muted-foreground hover:text-foreground">
            ← City packs
          </Link>
          <h2 className="mt-1 text-xl font-semibold">{pack.label}</h2>
          <p className="text-xs text-muted-foreground">
            {pack.id} · {pack.status} · {pack.tenantCount} tenant{pack.tenantCount === 1 ? '' : 's'}
          </p>
        </div>
        <span className={cn('rounded-full px-3 py-1 text-xs font-medium', badgeClass)}>
          {badgeLabel}
        </span>
      </div>

      {saved ? (
        <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
          City pack saved.
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {CITY_PACK_WIZARD_STEPS.map((step, index) => (
          <button
            key={step.id}
            type="button"
            onClick={() => setStepId(step.id)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium',
              step.id === stepId
                ? 'border-foreground bg-foreground text-background'
                : 'border-border bg-background text-muted-foreground hover:text-foreground'
            )}
          >
            {index + 1}. {step.label}
          </button>
        ))}
      </div>

      <form action={saveCityPackAction} className="space-y-6 rounded-xl border bg-background p-6">
        <input type="hidden" name="id" value={pack.id} />
        <input type="hidden" name="label" value={label} />
        <input
          type="hidden"
          name="placesJson"
          value={JSON.stringify(places.map(serializeCityPackAdminPlace))}
        />
        <input type="hidden" name="enabledRoutesJson" value={JSON.stringify(enabledRoutes)} />
        <input type="hidden" name="routesJson" value={JSON.stringify(routes)} />
        <input type="hidden" name="warningsJson" value={JSON.stringify(warnings)} />
        <input
          type="hidden"
          name="preTripTipsJson"
          value={JSON.stringify(preTripSundayClosure ? ['sundayClosure'] : [])}
        />
        <input type="hidden" name="recommendedTaxiName" value={taxiName} />
        <input type="hidden" name="recommendedTaxiPhoneRaw" value={taxiPhone} />
        <input type="hidden" name="recommendedTaxiPhoneMask" value={taxiMask} />

        {stepId === 'identity' ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Tenants only see packs with status Ready and at least {MIN_PLACES_FOR_PACK} places.
            </p>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Pack id</span>
              <input value={pack.id} disabled className="w-full rounded-md border bg-muted px-3 py-2 text-sm" />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Label</span>
              <input
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </label>
          </div>
        ) : null}

        {stepId === 'places' ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Must for gate: {placesCount}/{MIN_PLACES_FOR_PACK} places with name and category.
            </p>
            <div className="space-y-3">
              {places.map((place) => (
                <div key={place.id} className="space-y-2 rounded-lg border p-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      value={place.name}
                      onChange={(event) => updatePlace(place.id, { name: event.target.value })}
                      placeholder="Name"
                      className="rounded-md border bg-background px-3 py-2 text-sm"
                    />
                    <select
                      value={place.category}
                      onChange={(event) =>
                        updatePlace(place.id, { category: event.target.value as PlaceCategory })
                      }
                      className="rounded-md border bg-background px-3 py-2 text-sm"
                    >
                      {PLACE_CATEGORY_IDS.map((category) => (
                        <option key={category} value={category}>
                          {resolvePlaceCategoryAdminLabel(category)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <input
                    value={place.googleMapsUrl ?? ''}
                    onChange={(event) => updatePlace(place.id, { googleMapsUrl: event.target.value })}
                    placeholder="Google Maps URL"
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  />
                  <input
                    value={place.walkHint ?? ''}
                    onChange={(event) => updatePlace(place.id, { walkHint: event.target.value })}
                    placeholder="Walk hint (e.g. 2 min walk)"
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  />
                  <PlaceIconPicker
                    value={place.iconId}
                    onChange={(iconId) => updatePlace(place.id, { iconId })}
                  />
                  <textarea
                    value={place.description ?? ''}
                    onChange={(event) => updatePlace(place.id, { description: event.target.value })}
                    placeholder="Why we recommend (optional — overrides pack i18n when filled)"
                    rows={2}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  />
                  <div className="flex flex-wrap items-center gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={place.isTopPick ?? false}
                        onChange={(event) => updatePlace(place.id, { isTopPick: event.target.checked })}
                      />
                      Top pick
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={place.needNow ?? false}
                        onChange={(event) => updatePlace(place.id, { needNow: event.target.checked })}
                      />
                      Need now (first visit)
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => removePlace(place.id)}
                    className="text-xs text-red-700 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addPlace}
              className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted/50"
            >
              Add place
            </button>
          </div>
        ) : null}

        {stepId === 'routes' ? (
          <CityPackRoutesStep
            packId={pack.id}
            enabledRoutes={enabledRoutes}
            routes={routes}
            warnings={warnings}
            preTripSundayClosure={preTripSundayClosure}
            taxiName={taxiName}
            taxiPhone={taxiPhone}
            taxiMask={taxiMask}
            onEnabledRoutesChange={handleEnabledRoutesChange}
            onRoutesChange={setRoutes}
            onWarningsChange={setWarnings}
            onPreTripSundayClosureChange={setPreTripSundayClosure}
            onTaxiNameChange={setTaxiName}
            onTaxiPhoneChange={setTaxiPhone}
            onTaxiMaskChange={setTaxiMask}
          />
        ) : null}

        {stepId === 'preview' ? (
          <div className="space-y-4">
            <ul className="space-y-2 text-sm">
              <li>
                Places: {placesCount}/{MIN_PLACES_FOR_PACK} {placesCount >= MIN_PLACES_FOR_PACK ? '✓' : '—'}
              </li>
              <li>Routes: {routesGateMet ? '✓' : '—'}</li>
              <li>Status: {pack.status}</li>
            </ul>
            <p className="text-sm text-muted-foreground">
              Publish sets status to Ready only when the must checklist is green. Save draft keeps current tenants
              on a previously published pack unchanged until you publish again.
            </p>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={goBack}
              disabled={stepIndex === 0}
              className="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-sm disabled:opacity-40"
            >
              <Icon icon={ChevronLeft} className="h-4 w-4" />
              Back
            </button>
            {stepIndex < CITY_PACK_WIZARD_STEPS.length - 1 ? (
              <button
                type="button"
                onClick={goNext}
                className="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-sm"
              >
                Next
                <Icon icon={ChevronRight} className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          <div className="flex gap-2">
            <button type="submit" name="publish" value="false" className="rounded-md border px-4 py-2 text-sm">
              Save draft
            </button>
            <button
              type="submit"
              name="publish"
              value="true"
              disabled={!gateContentMet}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40"
            >
              Publish (Ready)
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
