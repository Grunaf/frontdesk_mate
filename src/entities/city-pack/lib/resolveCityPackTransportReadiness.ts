import type { CityPackId, RouteId } from '@/entities/hostel';
import type { CityPackContent, CityPackRouteContent, LocalizedText } from '../model/types';
import { ROUTE_PRESETS } from './constants';
import {
  resolveAdminCityPackEnabledRoutes,
  resolveAdminCityPackRoutes,
} from './resolveAdminCityPackTransport';
import { isLocalizedFilled } from './resolveLocalizedLocaleStatus';

export interface CityPackTransportReadinessResult {
  ready: boolean;
  detail?: string;
  missingRouteLabels?: string[];
}

export type RouteGateFieldId =
  | 'publicTitle'
  | 'publicSummary'
  | 'publicText'
  | 'publicGetOffAt';

export const ROUTE_GATE_FIELDS: { id: RouteGateFieldId; label: string }[] = [
  { id: 'publicTitle', label: 'Card title' },
  { id: 'publicSummary', label: 'Card summary' },
  { id: 'publicText', label: 'Step-by-step' },
  { id: 'publicGetOffAt', label: 'Get off at' },
];

function readRouteGateField(
  route: CityPackRouteContent,
  fieldId: RouteGateFieldId
): LocalizedText | undefined {
  switch (fieldId) {
    case 'publicTitle':
      return route.copy.publicTitle;
    case 'publicSummary':
      return route.copy.publicSummary;
    case 'publicText':
      return route.copy.publicText;
    case 'publicGetOffAt':
      return route.copy.publicGetOffAt;
  }
}

function gateFieldsForRoute(route: CityPackRouteContent | undefined) {
  if (route?.routeMode === 'walk_only') {
    return ROUTE_GATE_FIELDS.filter((field) => field.id !== 'publicGetOffAt');
  }
  return ROUTE_GATE_FIELDS;
}

/** Human-readable EN gate fields still missing for publish. */
export function resolveRouteGateMissingFields(
  route: CityPackRouteContent | undefined
): string[] {
  return gateFieldsForRoute(route)
    .filter((field) => !route || !isLocalizedFilled(readRouteGateField(route, field.id), 'en'))
    .map((field) => field.label);
}

export function isRouteGuestReadyEn(route: CityPackRouteContent | undefined): boolean {
  return resolveRouteGateMissingFields(route).length === 0;
}

export function formatRouteGateStatus(route: CityPackRouteContent | undefined): {
  ready: boolean;
  missingFields: string[];
  /** Full line, e.g. "Missing: Card title, Summary". */
  statusLabel: string;
  /** Compact chip label, e.g. "Missing (2)". */
  shortLabel: string;
} {
  const missingFields = resolveRouteGateMissingFields(route);
  if (missingFields.length === 0) {
    return { ready: true, missingFields: [], statusLabel: 'Ready', shortLabel: 'Ready' };
  }

  return {
    ready: false,
    missingFields,
    statusLabel: `Missing: ${missingFields.join(', ')}`,
    shortLabel: `Missing (${missingFields.length})`,
  };
}

function routeLabel(routeId: RouteId): string {
  return ROUTE_PRESETS.find((route) => route.id === routeId)?.label ?? routeId;
}

export function resolveCityPackTransportReadiness(input: {
  packId: CityPackId | string;
  content?: CityPackContent;
}): CityPackTransportReadinessResult {
  const packId = input.packId as CityPackId;
  const enabledRoutes = resolveAdminCityPackEnabledRoutes(packId, input.content);

  if (enabledRoutes.length === 0) {
    return {
      ready: false,
      detail: 'City pack has no arrival routes enabled.',
      missingRouteLabels: [],
    };
  }

  const routes = resolveAdminCityPackRoutes(packId, input.content);
  const missingRouteLabels: string[] = [];

  for (const routeId of enabledRoutes) {
    if (!isRouteGuestReadyEn(routes[routeId])) {
      missingRouteLabels.push(routeLabel(routeId));
    }
  }

  if (missingRouteLabels.length === 0) {
    return { ready: true, missingRouteLabels: [] };
  }

  return {
    ready: false,
    missingRouteLabels,
    detail: `Fill route content for: ${missingRouteLabels.join(', ')}`,
  };
}

/** @deprecated Use resolveCityPackTransportReadiness — kept as alias for routes gate naming. */
export function hasRouteContentGate(input: {
  packId: CityPackId | string;
  content?: CityPackContent;
}): boolean {
  return resolveCityPackTransportReadiness(input).ready;
}
