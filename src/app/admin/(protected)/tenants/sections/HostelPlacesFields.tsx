'use client';

import { useState } from 'react';
import type { HostelPlace, HostelPlaceCategory } from '@/entities/tenant/model/hostelPlaces';
import { HOSTEL_PLACE_CATEGORIES } from '@/entities/tenant/model/hostelPlaces';
import { useTenantFormDraft } from '../ui/TenantFormDraftContext';
import { useSyncedFormRef } from '../lib/syncTenantFormDraft';

interface HostelPlacesFieldsProps {
  settings?: { hostelPlaces?: HostelPlace[] };
}

function createHostelPlaceId() {
  return `near-${Date.now().toString(36)}`;
}

export function HostelPlacesFields({ settings }: HostelPlacesFieldsProps) {
  const { updateDraft } = useTenantFormDraft();
  const [places, setPlaces] = useState<HostelPlace[]>(settings?.hostelPlaces ?? []);
  const placesRef = useSyncedFormRef(places);

  const syncPlaces = (next: HostelPlace[]) => {
    placesRef.current = next;
    setPlaces(next);
    updateDraft({ hostelPlaces: next });
  };

  const applyPlaces = (updater: (current: HostelPlace[]) => HostelPlace[]) => {
    syncPlaces(updater(placesRef.current));
  };

  const addPlace = () => {
    applyPlaces((current) => [
      ...current,
      {
        id: createHostelPlaceId(),
        name: '',
        category: 'food',
      },
    ]);
  };

  const updatePlace = (id: string, patch: Partial<HostelPlace>) => {
    applyPlaces((current) =>
      current.map((place) => (place.id === id ? { ...place, ...patch } : place))
    );
  };

  const removePlace = (id: string) => {
    applyPlaces((current) => current.filter((place) => place.id !== id));
  };

  return (
    <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
      <div>
        <p className="text-sm font-medium">Near the hostel</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Add 3–5 spots within walking distance. Shown above the city guide in the guest app.
          Does not affect city pack gate.
        </p>
      </div>

      <input type="hidden" name="hostelPlacesJson" value={JSON.stringify(places)} />

      <div className="space-y-3">
        {places.map((place) => (
          <div key={place.id} className="space-y-2 rounded-lg border bg-background p-3">
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
                  updatePlace(place.id, { category: event.target.value as HostelPlaceCategory })
                }
                className="rounded-md border bg-background px-3 py-2 text-sm"
              >
                {HOSTEL_PLACE_CATEGORIES.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>
            <input
              value={place.walkHint ?? ''}
              onChange={(event) => updatePlace(place.id, { walkHint: event.target.value })}
              placeholder="Walk hint (e.g. 2 min left on Dalmatinska)"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
            <input
              value={place.mapsUrl ?? ''}
              onChange={(event) => updatePlace(place.id, { mapsUrl: event.target.value })}
              placeholder="Google Maps link"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
            <textarea
              value={place.note ?? ''}
              onChange={(event) => updatePlace(place.id, { note: event.target.value })}
              placeholder="Short note"
              rows={2}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
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
        Add spot
      </button>
    </div>
  );
}
