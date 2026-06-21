import {
  getActiveRoutes,
  getCityPack,
  isCityPackId,
  type RouteId,
} from '@/entities/hostel';
import { MIN_PLACES_FOR_PACK } from './constants';
import type { CityPackContent, CityPackStatus, CityPackWizardStepId } from '../model/types';

export function countGatePlaces(content: CityPackContent): number {
  return (content.places ?? []).filter((place) => place.name.trim() && place.category).length;
}

export function hasRouteGate(content: CityPackContent, packId: string): boolean {
  if ((content.enabledRoutes ?? []).length > 0) {
    return true;
  }

  if (isCityPackId(packId)) {
    return getActiveRoutes(getCityPack(packId).routes).length > 0;
  }

  return false;
}

export function isPackReadyForTenants(input: {
  status: CityPackStatus;
  content: CityPackContent;
  packId: string;
}): boolean {
  return (
    input.status === 'ready' &&
    countGatePlaces(input.content) >= MIN_PLACES_FOR_PACK &&
    hasRouteGate(input.content, input.packId)
  );
}

export function resolveHasPlacesPack(input: {
  status: CityPackStatus;
  content: CityPackContent;
  packId: string;
}): boolean {
  return isPackReadyForTenants(input);
}

export function resolveFirstIncompletePackStep(input: {
  label: string;
  content: CityPackContent;
  packId: string;
}): CityPackWizardStepId {
  if (!input.label.trim()) {
    return 'identity';
  }

  if (countGatePlaces(input.content) < MIN_PLACES_FOR_PACK) {
    return 'places';
  }

  if (!hasRouteGate(input.content, input.packId)) {
    return 'routes';
  }

  return 'preview';
}

export function resolvePackNotReadyReason(input: {
  status: CityPackStatus;
  content: CityPackContent;
  packId: string;
}): string | null {
  if (isPackReadyForTenants(input)) {
    return null;
  }

  if (input.status !== 'ready') {
    return 'City pack is still draft — publish it in City packs admin.';
  }

  const placesCount = countGatePlaces(input.content);
  if (placesCount < MIN_PLACES_FOR_PACK) {
    return `City pack needs ${MIN_PLACES_FOR_PACK} places (${placesCount}/${MIN_PLACES_FOR_PACK}).`;
  }

  if (!hasRouteGate(input.content, input.packId)) {
    return 'City pack has no arrival routes enabled.';
  }

  return 'City pack is not ready for tenants.';
}

export function normalizeEnabledRoutes(raw: unknown): RouteId[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const allowed: RouteId[] = ['airport', 'bus_central', 'bus_istochno', 'train_station'];
  return raw.filter((value): value is RouteId => typeof value === 'string' && allowed.includes(value as RouteId));
}
