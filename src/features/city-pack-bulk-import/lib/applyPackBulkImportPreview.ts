import type { RouteId } from '@/entities/hostel';
import type { CityPackContent, CityPackRouteContent } from '@/entities/city-pack/model/types';
import { formatRouteGateStatus, ROUTE_PRESETS } from '@/entities/city-pack';
import { ensureCityPackRouteContent } from '@/entities/city-pack/lib/resolveAdminCityPackTransport';
import type {
  PackBulkImportDocument,
  PackBulkImportHubPreview,
  PackBulkImportPreviewState,
} from '../model/types';
import { hubImportToGuidedPreview, listBulkImportHubBlocks, mapBulkImportHubToRouteContent } from './mapBulkImportToRouteContent';

const TAXI_IN_TRANSIT_WARNING =
  'Transit copy still mentions taxi after cleanup — check tips vs step-by-step.';

function collectHubWarnings(hubLabel: string, route: CityPackRouteContent): string[] {
  const warnings: string[] = [];
  const gate = formatRouteGateStatus(route);
  if (!gate.ready) {
    warnings.push(`${hubLabel}: ${gate.statusLabel}`);
  }

  if (route.routeMode !== 'walk_only' && /\btaxi\b/i.test(route.copy.publicText.en ?? '')) {
    warnings.push(`${hubLabel}: ${TAXI_IN_TRANSIT_WARNING}`);
  }

  return warnings;
}

export function buildPackBulkImportPreviewState(input: {
  packId: string;
  notes: string;
  document: PackBulkImportDocument;
  currentRoutes: Partial<Record<RouteId, CityPackRouteContent>>;
  transportCurrencyMode?: CityPackContent['transportCurrency'];
}): PackBulkImportPreviewState {
  const enforcementSource = input.notes.trim();
  const packIdMismatch = input.document.packId.trim() !== input.packId.trim();
  const content: CityPackContent | undefined = input.transportCurrencyMode
    ? { transportCurrency: input.transportCurrencyMode }
    : undefined;

  const hubs: PackBulkImportHubPreview[] = [];

  for (const [routeId, hubImport] of Object.entries(input.document.routes) as [
    RouteId,
    NonNullable<PackBulkImportDocument['routes'][RouteId]>,
  ][]) {
    if (!hubImport) {
      continue;
    }

    const existing = ensureCityPackRouteContent(input.packId, routeId, input.currentRoutes[routeId], content);
    const mergedRoute = mapBulkImportHubToRouteContent(
      input.packId,
      routeId,
      existing,
      hubImport,
      enforcementSource,
      content
    );
    const hubLabel = ROUTE_PRESETS.find((entry) => entry.id === routeId)?.label ?? routeId;
    const gate = formatRouteGateStatus(mergedRoute);
    const preview = hubImportToGuidedPreview(hubImport, enforcementSource);

    hubs.push({
      routeId,
      hubLabel,
      primaryRouteMode: mergedRoute.routeMode ?? 'transit',
      blocksPresent: listBulkImportHubBlocks(hubImport),
      warnings: collectHubWarnings(hubLabel, mergedRoute),
      openQuestions: preview.openQuestions,
      gateReady: gate.ready,
      gateStatusLabel: gate.statusLabel,
      mergedRoute,
    });
  }

  return {
    document: input.document,
    packIdMismatch,
    hubs,
  };
}

export function applyPackBulkImportPreview(input: {
  packId: string;
  notes: string;
  document: PackBulkImportDocument;
  currentRoutes: Partial<Record<RouteId, CityPackRouteContent>>;
  routeIdsToApply: RouteId[];
  currentEnabledRoutes: RouteId[];
  applySuggestedEnabledRoutes: boolean;
  transportCurrencyMode?: CityPackContent['transportCurrency'];
}): {
  routes: Partial<Record<RouteId, CityPackRouteContent>>;
  enabledRoutes: RouteId[];
} {
  const routes = { ...input.currentRoutes };
  const enforcementSource = input.notes.trim();
  const content: CityPackContent | undefined = input.transportCurrencyMode
    ? { transportCurrency: input.transportCurrencyMode }
    : undefined;

  for (const routeId of input.routeIdsToApply) {
    const hubImport = input.document.routes[routeId];
    if (!hubImport) {
      continue;
    }
    const existing = ensureCityPackRouteContent(input.packId, routeId, routes[routeId], content);
    routes[routeId] = mapBulkImportHubToRouteContent(
      input.packId,
      routeId,
      existing,
      hubImport,
      enforcementSource,
      content
    );
  }

  let enabledRoutes = [...input.currentEnabledRoutes];
  if (input.applySuggestedEnabledRoutes && input.document.suggestedEnabledRoutes?.length) {
    const suggested = input.document.suggestedEnabledRoutes;
    enabledRoutes = [...new Set([...enabledRoutes, ...suggested])];
  }

  return { routes, enabledRoutes };
}
