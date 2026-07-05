'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { CityPackContent } from '@/entities/city-pack';
import { normalizeCityPackAdminPlace } from '@/entities/city-pack/lib/normalizeCityPackAdminPlace';
import {
  isCityPackNeedNowEligibleCategory,
  resolvePlaceCategoryAdminLabel,
} from '@/entities/hostel';
import { resolveCityPackNeedNowPlaceIdsForAdmin } from '@/entities/tenant';
import type { TenantSettings } from '@/entities/tenant';
import { OwnerCityPackRequestLink } from '@/features/owner-city-pack';
import { useTenantFormDraft } from '../ui/TenantFormDraftContext';
import { useSyncedFormRef } from '../lib/syncTenantFormDraft';
import type { CityPackInheritanceSurface } from '../ui/CityPackInheritanceCard';

interface CityPackNeedNowFieldsProps {
  settings?: Pick<TenantSettings, 'cityPackNeedNowPlaceIds'>;
  cityPackId: string;
  cityPackContent?: CityPackContent;
  surface?: CityPackInheritanceSurface;
  locale?: string;
}

export function CityPackNeedNowFields({
  settings,
  cityPackId,
  cityPackContent,
  surface = 'platform',
  locale = 'en',
}: CityPackNeedNowFieldsProps) {
  const isOwner = surface === 'owner';
  const t = useTranslations('pages.owner.cityPack');
  const { updateDraft } = useTenantFormDraft();
  const places = useMemo(
    () =>
      (cityPackContent?.places ?? [])
        .map((place) => normalizeCityPackAdminPlace(place))
        .filter((place) => place.id && place.name.trim() && place.category),
    [cityPackContent?.places]
  );

  const eligiblePlaces = useMemo(
    () => places.filter((place) => isCityPackNeedNowEligibleCategory(place.category)),
    [places]
  );

  const placesKey = places.map((place) => place.id).join('\0');

  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    resolveCityPackNeedNowPlaceIdsForAdmin(settings ?? {}, places)
  );
  const selectedRef = useSyncedFormRef(selectedIds);

  const syncSelected = (next: string[]) => {
    selectedRef.current = next;
    setSelectedIds(next);
    updateDraft({ cityPackNeedNowPlaceIds: next });
  };

  // Re-seed when city pack changes; keep explicit tenant list, drop stale / ineligible ids.
  useEffect(() => {
    const next = resolveCityPackNeedNowPlaceIdsForAdmin(settings ?? {}, places);
    selectedRef.current = next;
    setSelectedIds(next);
    updateDraft({ cityPackNeedNowPlaceIds: next }, { silent: true });
    // settings intentionally omitted — only pack identity should reset selection
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pack switch only
  }, [cityPackId, placesKey]);

  const selectedPlaces = selectedIds
    .map((id) => places.find((place) => place.id === id))
    .filter((place): place is (typeof places)[number] => place != null);

  const availablePlaces = eligiblePlaces.filter((place) => !selectedIds.includes(place.id));

  const addPlace = (placeId: string) => {
    if (!placeId || selectedRef.current.includes(placeId)) {
      return;
    }
    syncSelected([...selectedRef.current, placeId]);
  };

  const removePlace = (placeId: string) => {
    syncSelected(selectedRef.current.filter((id) => id !== placeId));
  };

  return (
    <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
      <div>
        <p className="text-sm font-medium">First visit essentials</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Places guests need on first visit (ATM, pharmacy, cafe). Pick from the city pack — shown
          in Essentials. Usually 3–5. Restaurants, bars, and sights are not listed. Separate from
          “Near the hostel” spots below.
        </p>
      </div>

      <input
        type="hidden"
        name="cityPackNeedNowPlaceIdsJson"
        value={JSON.stringify(selectedIds)}
      />

      {places.length === 0 ? (
        <p className="rounded-md border border-dashed px-3 py-4 text-xs text-muted-foreground">
          {isOwner ? (
            <>
              {t('noPlaces')}{' '}
              <OwnerCityPackRequestLink locale={locale} packId={cityPackId} />
            </>
          ) : (
            'No city pack places yet. Add places in the city pack admin first.'
          )}
        </p>
      ) : (
        <div className="space-y-3">
          <select
            value=""
            onChange={(event) => {
              addPlace(event.target.value);
              event.target.value = '';
            }}
            disabled={availablePlaces.length === 0}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="">
              {availablePlaces.length === 0 ? 'All eligible places added' : 'Add essential…'}
            </option>
            {availablePlaces.map((place) => (
              <option key={place.id} value={place.id}>
                {place.name} · {resolvePlaceCategoryAdminLabel(place.category)}
              </option>
            ))}
          </select>

          {selectedPlaces.length === 0 ? (
            <p className="text-xs text-muted-foreground">No essentials selected yet.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {selectedPlaces.map((place) => (
                <li
                  key={place.id}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 text-xs"
                >
                  <span className="min-w-0 truncate font-medium">{place.name}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {resolvePlaceCategoryAdminLabel(place.category)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removePlace(place.id)}
                    className="shrink-0 rounded-full px-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label={`Remove ${place.name}`}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
