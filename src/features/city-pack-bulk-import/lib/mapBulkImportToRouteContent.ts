import type { RouteId } from '@/entities/hostel';
import type { CityPackContent, CityPackRouteContent } from '@/entities/city-pack/model/types';
import { MAX_ROUTE_TIPS } from '@/entities/city-pack';
import { applyGuidedFillPreview } from '@/features/city-pack-guided-fill';
import { enforceGuidedSingleScenario } from '@/features/city-pack-guided-fill/lib/enforceGuidedSingleScenario';
import type {
  GuidedRouteCopyFieldKey,
  GuidedRouteFillPreview,
} from '@/features/city-pack-guided-fill/model/types';
import type {
  PackBulkImportCopyBlock,
  PackBulkImportHubImport,
  PackBulkImportRouteBlockKey,
  PackBulkImportTaxiBlock,
} from '../model/types';

const COPY_KEYS: GuidedRouteCopyFieldKey[] = [
  'publicTitle',
  'publicSummary',
  'publicPreview',
  'publicText',
  'publicGetOffAt',
];

function trimOrUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function readLocalizedEn(value: string | { en?: string } | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value === 'string') {
    return trimOrUndefined(value);
  }
  return trimOrUndefined(value.en);
}

function copyBlockToPartialCopy(
  block: PackBulkImportCopyBlock | undefined
): Partial<Record<GuidedRouteCopyFieldKey, string>> {
  if (!block) {
    return {};
  }

  const copy: Partial<Record<GuidedRouteCopyFieldKey, string>> = {};
  for (const key of COPY_KEYS) {
    const value = trimOrUndefined(block[key]);
    if (value) {
      copy[key] = value;
    }
  }
  return copy;
}

function mergeTips(
  ...groups: (string[] | undefined)[]
): string[] | undefined {
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const group of groups) {
    for (const tip of group ?? []) {
      const normalized = tip.trim();
      if (!normalized || seen.has(normalized.toLowerCase())) {
        continue;
      }
      seen.add(normalized.toLowerCase());
      merged.push(normalized);
      if (merged.length >= MAX_ROUTE_TIPS) {
        return merged;
      }
    }
  }
  return merged.length ? merged : undefined;
}

function resolvePrimaryMode(hub: PackBulkImportHubImport): 'transit' | 'walk_only' {
  if (hub.primaryRouteMode) {
    return hub.primaryRouteMode;
  }
  const hasTransitCopy = hub.transit && Object.keys(copyBlockToPartialCopy(hub.transit)).length > 0;
  const hasWalkCopy = hub.walk && Object.keys(copyBlockToPartialCopy(hub.walk)).length > 0;
  if (hasWalkCopy && !hasTransitCopy) {
    return 'walk_only';
  }
  return 'transit';
}

function resolvePrimaryCopyBlock(
  hub: PackBulkImportHubImport,
  mode: 'transit' | 'walk_only'
): PackBulkImportCopyBlock | undefined {
  if (mode === 'walk_only') {
    return hub.walk ?? hub.transit;
  }
  return hub.transit ?? hub.walk;
}

export function listBulkImportHubBlocks(hub: PackBulkImportHubImport): PackBulkImportRouteBlockKey[] {
  const blocks: PackBulkImportRouteBlockKey[] = [];
  if (hub.transit && Object.keys(copyBlockToPartialCopy(hub.transit)).length > 0) {
    blocks.push('transit');
  }
  if (hub.walk && Object.keys(copyBlockToPartialCopy(hub.walk)).length > 0) {
    blocks.push('walk');
  }
  if (hub.taxi && hasTaxiBlockContent(hub.taxi)) {
    blocks.push('taxi');
  }
  return blocks;
}

function hasTaxiBlockContent(taxi: PackBulkImportTaxiBlock): boolean {
  return Boolean(
    readLocalizedEn(taxi.taxiCost) ||
      readLocalizedEn(taxi.taxiPickupPoint) ||
      taxi.tips?.some((tip) => tip.trim())
  );
}

export function hubImportToGuidedPreview(
  hub: PackBulkImportHubImport,
  enforcementSource: string
): GuidedRouteFillPreview {
  const routeMode = resolvePrimaryMode(hub);
  const primaryBlock = resolvePrimaryCopyBlock(hub, routeMode);

  const preview: GuidedRouteFillPreview = {
    routeMode,
    copy: copyBlockToPartialCopy(primaryBlock),
    tips: mergeTips(primaryBlock?.tips, hub.taxi?.tips),
    metadata: hub.metadata,
    openQuestions: hub.openQuestions ?? [],
  };

  return enforceGuidedSingleScenario(preview, enforcementSource);
}

function patchTaxiCopyFields(
  route: CityPackRouteContent,
  taxi: PackBulkImportTaxiBlock | undefined
): CityPackRouteContent {
  if (!taxi) {
    return route;
  }

  const taxiCost = readLocalizedEn(taxi.taxiCost);
  const taxiPickup = readLocalizedEn(taxi.taxiPickupPoint);
  if (!taxiCost && !taxiPickup) {
    return route;
  }

  return {
    ...route,
    copy: {
      ...route.copy,
      taxiCost: taxiCost
        ? { en: taxiCost, ru: route.copy.taxiCost.ru?.trim() ? route.copy.taxiCost.ru : undefined }
        : route.copy.taxiCost,
      taxiPickupPoint: taxiPickup
        ? {
            en: taxiPickup,
            ru: route.copy.taxiPickupPoint.ru?.trim() ? route.copy.taxiPickupPoint.ru : undefined,
          }
        : route.copy.taxiPickupPoint,
    },
  };
}

export function mapBulkImportHubToRouteContent(
  packId: string,
  routeId: RouteId,
  existing: CityPackRouteContent,
  hub: PackBulkImportHubImport,
  enforcementSource: string,
  content?: CityPackContent
): CityPackRouteContent {
  const preview = hubImportToGuidedPreview(hub, enforcementSource);
  let next = applyGuidedFillPreview(packId, routeId, existing, preview, content);
  next = patchTaxiCopyFields(next, hub.taxi);
  return next;
}
