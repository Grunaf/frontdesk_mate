import { MIN_PLACES_FOR_PACK } from './constants';
import type { CityPackSelectOption } from '../model/types';

export interface CityPackRegistryEntry {
  id: string;
  label: string;
  status: import('../model/types').CityPackStatus;
  placesCount: number;
  routesGateMet: boolean;
  readyForTenants: boolean;
  notReadyReason: string | null;
}

let registryCache: CityPackRegistryEntry[] | null = null;

export function setCityPackRegistry(entries: CityPackRegistryEntry[]) {
  registryCache = entries;
}

export function clearCityPackRegistry() {
  registryCache = null;
}

export function getCityPackRegistry(): CityPackRegistryEntry[] | null {
  return registryCache;
}

export function getCityPackRegistryEntry(cityPackId: string): CityPackRegistryEntry | undefined {
  return registryCache?.find((entry) => entry.id === cityPackId);
}

export function resolveHasPlacesPackFromRegistry(cityPackId: string): boolean {
  const entry = getCityPackRegistryEntry(cityPackId);
  return entry?.readyForTenants ?? false;
}

export function resolvePackNotReadyReasonFromRegistry(cityPackId: string): string | null {
  const entry = getCityPackRegistryEntry(cityPackId);
  if (entry) {
    return entry.notReadyReason;
  }

  return 'Choose a ready city pack or finish it in City packs admin.';
}

export function listReadyCityPacksFromRegistry(): CityPackSelectOption[] {
  if (registryCache) {
    return registryCache
      .filter((entry) => entry.readyForTenants)
      .map((entry) => ({
        id: entry.id,
        label: entry.label,
        status: entry.status,
        placesCount: entry.placesCount,
        readyForTenants: true,
      }));
  }

  return [];
}
