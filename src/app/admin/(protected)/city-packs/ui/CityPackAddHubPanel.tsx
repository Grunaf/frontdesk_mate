'use client';

import { useEffect, useMemo, useState } from 'react';
import type { RouteCategory } from '@/entities/hostel';
import {
  CITY_PACK_HUB_TYPE_OPTIONS,
  canAddCityPackHub,
} from '@/entities/city-pack/lib/cityPackHubAdmin';
import type { CityPackRouteContent } from '@/entities/city-pack';
import type { RouteId } from '@/entities/hostel';
import { Button } from '@/shared/ui';

export function CityPackAddHubPanel({
  routes,
  onAdd,
}: {
  routes: Partial<Record<RouteId, CityPackRouteContent>>;
  onAdd: (category: RouteCategory, displayNameEn: string) => void;
}) {
  const [category, setCategory] = useState<RouteCategory>('airport');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const availableTypes = useMemo(
    () => CITY_PACK_HUB_TYPE_OPTIONS.filter((option) => canAddCityPackHub(option.category, routes)),
    [routes]
  );

  useEffect(() => {
    if (!canAddCityPackHub(category, routes) && availableTypes[0]) {
      setCategory(availableTypes[0].category);
    }
  }, [availableTypes, category, routes]);

  const selectedAvailable = canAddCityPackHub(category, routes);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const name = displayName.trim();
    if (name.length < 2) {
      setError('Enter a hub name (at least 2 characters).');
      return;
    }
    if (!canAddCityPackHub(category, routes)) {
      setError('This pack already has the maximum number of hubs for that type.');
      return;
    }
    setError(null);
    onAdd(category, name);
    setDisplayName('');
  };

  if (availableTypes.length === 0) {
    return (
      <p className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
        All arrival hub slots are in use for this pack. Turn a hub off or edit an existing one.
      </p>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-lg border border-dashed bg-muted/30 p-4 sm:flex-row sm:flex-wrap sm:items-end"
    >
      <div className="min-w-[10rem] flex-1 space-y-1">
        <label htmlFor="city-pack-hub-type" className="text-xs font-medium text-muted-foreground">
          Hub type
        </label>
        <select
          id="city-pack-hub-type"
          value={category}
          onChange={(event) => {
            setCategory(event.target.value as RouteCategory);
            setError(null);
          }}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        >
          {CITY_PACK_HUB_TYPE_OPTIONS.map((option) => (
            <option key={option.category} value={option.category} disabled={!canAddCityPackHub(option.category, routes)}>
              {option.label}
              {!canAddCityPackHub(option.category, routes) ? ' (full)' : ''}
            </option>
          ))}
        </select>
      </div>
      <div className="min-w-[12rem] flex-[2] space-y-1">
        <label htmlFor="city-pack-hub-name" className="text-xs font-medium text-muted-foreground">
          Hub name (shown to guests)
        </label>
        <input
          id="city-pack-hub-name"
          value={displayName}
          onChange={(event) => {
            setDisplayName(event.target.value);
            setError(null);
          }}
          placeholder="e.g. Tivat Airport, East bus station"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
      </div>
      <Button type="submit" variant="secondary" disabled={!selectedAvailable}>
        Add arrival hub
      </Button>
      {error ? <p className="w-full text-sm text-amber-900">{error}</p> : null}
    </form>
  );
}
