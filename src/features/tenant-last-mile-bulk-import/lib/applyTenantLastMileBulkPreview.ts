import type { RouteId } from '@/entities/hostel';
import type { CityPackRouteContent } from '@/entities/city-pack/model/types';
import type { LocalizedField, LocalizedText } from '@/entities/city-pack/model/types';
import { resolveLocalizedText } from '@/entities/city-pack/model/localized';
import {
  ROUTE_PRESETS,
  buildLastMileCityBoundary,
  detectLastMileWalkOverlap,
  isTenantLocalHub,
} from '@/entities/city-pack';
import type { TenantLocalArrivalPath } from '@/entities/tenant';
import type {
  TenantLastMileBulkDocument,
  TenantLastMileBulkHubImport,
  TenantLastMileBulkHubPreview,
  TenantLastMileBulkPreviewState,
} from '../model/types';

function mergeWalkEn(walkEn: string | undefined, address: string): string {
  const trimmed = walkEn?.trim() ?? '';
  if (!trimmed) {
    return '';
  }
  if (address.trim() && trimmed.includes('{address}')) {
    return trimmed.replace(/\{address\}/g, address.trim());
  }
  return trimmed;
}

function asLocalizedText(value: LocalizedField | undefined): LocalizedText | undefined {
  if (!value) {
    return undefined;
  }
  if (typeof value === 'string') {
    return { en: value };
  }
  return value;
}

const TENANT_LAST_MILE_MAX_TIPS = 2;

function readGetOffOverrideEn(
  routeId: RouteId,
  hub: TenantLastMileBulkHubImport,
  currentGetOffByRoute: Partial<Record<RouteId, LocalizedField>> | undefined
): string | undefined {
  const fromJson = hub.getOffEn?.trim();
  if (fromJson) {
    return fromJson;
  }
  const stored = currentGetOffByRoute?.[routeId];
  if (!stored) {
    return undefined;
  }
  return resolveLocalizedText(stored, 'en').trim() || undefined;
}

function buildHubPreview(
  routeId: RouteId,
  hub: TenantLastMileBulkHubImport,
  hostelAddress: string,
  cityRoute: CityPackRouteContent | undefined,
  currentGetOffByRoute: Partial<Record<RouteId, LocalizedField>> | undefined
): TenantLastMileBulkHubPreview {
  const hubLabel = ROUTE_PRESETS.find((entry) => entry.id === routeId)?.label ?? routeId;
  const warnings: string[] = [];
  const isLocalHub = isTenantLocalHub(cityRoute);

  if (hub.mode === 'tenant_local_full') {
    if (!isLocalHub) {
      warnings.push(
        `${hubLabel}: mode tenant_local_full but city hub is Shared — switch hub to Local in city pack, or use from_get_off / walk_only_hub.`
      );
    }
    const localMode = hub.localMode === 'transit_lite' ? 'transit_lite' : 'walk';
    const primary =
      localMode === 'transit_lite'
        ? mergeWalkEn(hub.primaryEn || hub.walkEn, hostelAddress)
        : mergeWalkEn(hub.walkEn || hub.primaryEn, hostelAddress);
    if (!primary.trim()) {
      warnings.push(`${hubLabel}: primary/walkEn empty for Local hub — fill before apply.`);
    }
    const tipsCount = hub.tipsEn?.filter((tip) => tip.trim()).length ?? 0;
    return {
      routeId,
      hubLabel,
      mode: hub.mode,
      walkPreview: primary,
      tipsCount,
      openQuestions: hub.openQuestions ?? [],
      warnings,
    };
  }

  if (isLocalHub) {
    warnings.push(
      `${hubLabel}: city hub is Local — use mode tenant_local_full (shared last-mile modes ignored for guest path).`
    );
  }

  const walkPreview = mergeWalkEn(hub.walkEn, hostelAddress);
  const getOffOverrideEn = readGetOffOverrideEn(routeId, hub, currentGetOffByRoute);
  const boundary = buildLastMileCityBoundary(cityRoute, { getOffOverrideEn });
  if (!walkPreview.trim()) {
    warnings.push(`${hubLabel}: walkEn empty — fix research or open questions before apply.`);
  }
  warnings.push(...detectLastMileWalkOverlap(walkPreview, boundary));

  const tipsCount = hub.tipsEn?.filter((tip) => tip.trim()).length ?? 0;
  if (tipsCount > TENANT_LAST_MILE_MAX_TIPS) {
    warnings.push(`${hubLabel}: more than ${TENANT_LAST_MILE_MAX_TIPS} tips — trim to building-only.`);
  }
  if (tipsCount > 0 && (boundary?.cityTipsEn.length ?? 0) > 0) {
    warnings.push(
      `${hubLabel}: city pack already has tips — prefer empty tipsEn unless entrance/stairs only.`
    );
  }

  return {
    routeId,
    hubLabel,
    mode: hub.mode,
    anchorLabelEn: boundary?.hasAnchoredStart ? boundary.anchorLabelEn : undefined,
    walkPreview,
    tipsCount,
    openQuestions: hub.openQuestions ?? [],
    warnings,
  };
}

export function buildTenantLastMileBulkPreviewState(input: {
  tenantSlug: string;
  document: TenantLastMileBulkDocument;
  researchRouteIds: RouteId[];
  hostelAddress: string;
  cityRoutes: Partial<Record<RouteId, CityPackRouteContent>>;
  currentGetOffByRoute?: Partial<Record<RouteId, LocalizedField>>;
}): TenantLastMileBulkPreviewState {
  const researchScope = new Set(input.researchRouteIds);
  const ignoredOutOfScopeRouteIds: RouteId[] = [];
  const hubs: TenantLastMileBulkHubPreview[] = [];

  for (const [routeId, hub] of Object.entries(input.document.routes) as [
    RouteId,
    TenantLastMileBulkHubImport | undefined,
  ][]) {
    if (!hub) {
      continue;
    }
    if (researchScope.size > 0 && !researchScope.has(routeId)) {
      ignoredOutOfScopeRouteIds.push(routeId);
      continue;
    }
    hubs.push(
      buildHubPreview(
        routeId,
        hub,
        input.hostelAddress,
        input.cityRoutes[routeId],
        input.currentGetOffByRoute
      )
    );
  }

  return {
    document: input.document,
    tenantSlugMismatch: input.document.tenantSlug.trim() !== input.tenantSlug.trim(),
    ignoredOutOfScopeRouteIds,
    hubs,
  };
}

function applyLocalHub(
  hub: TenantLastMileBulkHubImport,
  hostelAddress: string,
  previous: TenantLocalArrivalPath | undefined
): TenantLocalArrivalPath {
  const mode = hub.localMode === 'transit_lite' ? 'transit_lite' : 'walk';
  const primaryRaw =
    mode === 'transit_lite' ? hub.primaryEn || hub.walkEn : hub.walkEn || hub.primaryEn;
  const primaryEn = mergeWalkEn(primaryRaw, hostelAddress);
  const walkToHostelEn = mergeWalkEn(hub.walkToHostelEn, hostelAddress);
  const getOffEn = hub.getOffEn?.trim();
  const titleEn = hub.titleEn?.trim();
  const summaryEn = hub.summaryEn?.trim();

  return {
    mode,
    title: titleEn
      ? { en: titleEn, ru: previous?.title && typeof previous.title !== 'string' ? previous.title.ru : undefined }
      : previous?.title,
    summary: summaryEn
      ? {
          en: summaryEn,
          ru:
            previous?.summary && typeof previous.summary !== 'string'
              ? previous.summary.ru
              : undefined,
        }
      : previous?.summary,
    primaryText: primaryEn
      ? {
          en: primaryEn,
          ru:
            previous?.primaryText && typeof previous.primaryText !== 'string'
              ? previous.primaryText.ru
              : undefined,
        }
      : previous?.primaryText ?? { en: '' },
    getOffAt: getOffEn
      ? {
          en: getOffEn,
          ru:
            previous?.getOffAt && typeof previous.getOffAt !== 'string'
              ? previous.getOffAt.ru
              : undefined,
        }
      : previous?.getOffAt,
    walkToHostel: walkToHostelEn
      ? {
          en: walkToHostelEn,
          ru:
            previous?.walkToHostel && typeof previous.walkToHostel !== 'string'
              ? previous.walkToHostel.ru
              : undefined,
        }
      : previous?.walkToHostel,
  };
}

export function applyTenantLastMileBulkPreview(input: {
  document: TenantLastMileBulkDocument;
  routeIdsToApply: RouteId[];
  hostelAddress: string;
  currentWalkByRoute: Partial<Record<RouteId, LocalizedField>>;
  currentTipsByRoute: Partial<Record<RouteId, LocalizedText[]>>;
  currentGetOffByRoute?: Partial<Record<RouteId, LocalizedField>>;
  currentLocalByRoute?: Partial<Record<RouteId, TenantLocalArrivalPath>>;
  cityRoutes?: Partial<Record<RouteId, CityPackRouteContent>>;
}): {
  arrivalWalkToHostelByRoute: Partial<Record<RouteId, LocalizedText>>;
  arrivalRouteTipsByRoute: Partial<Record<RouteId, LocalizedText[]>>;
  arrivalGetOffAtByRoute: Partial<Record<RouteId, LocalizedField>>;
  arrivalLocalByRoute: Partial<Record<RouteId, TenantLocalArrivalPath>>;
} {
  const arrivalWalkToHostelByRoute: Partial<Record<RouteId, LocalizedText>> = {};
  for (const [routeId, value] of Object.entries(input.currentWalkByRoute) as [
    RouteId,
    LocalizedField | undefined,
  ][]) {
    const text = asLocalizedText(value);
    if (text) {
      arrivalWalkToHostelByRoute[routeId] = text;
    }
  }
  const arrivalRouteTipsByRoute = { ...input.currentTipsByRoute };
  const arrivalGetOffAtByRoute: Partial<Record<RouteId, LocalizedField>> = {
    ...(input.currentGetOffByRoute ?? {}),
  };
  const arrivalLocalByRoute: Partial<Record<RouteId, TenantLocalArrivalPath>> = {
    ...(input.currentLocalByRoute ?? {}),
  };

  for (const routeId of input.routeIdsToApply) {
    const hub = input.document.routes[routeId];
    if (!hub) {
      continue;
    }

    const tipsEn = hub.tipsEn?.map((tip) => tip.trim()).filter(Boolean).slice(0, TENANT_LAST_MILE_MAX_TIPS);
    if (tipsEn?.length) {
      arrivalRouteTipsByRoute[routeId] = tipsEn.map((en) => ({ en }));
    }

    if (hub.mode === 'tenant_local_full') {
      arrivalLocalByRoute[routeId] = applyLocalHub(
        hub,
        input.hostelAddress,
        arrivalLocalByRoute[routeId]
      );
      continue;
    }

    // Shared modes — skip writing shared walk when city hub is Local.
    if (isTenantLocalHub(input.cityRoutes?.[routeId])) {
      continue;
    }

    const walkEn = mergeWalkEn(hub.walkEn, input.hostelAddress);
    if (walkEn) {
      const previous = arrivalWalkToHostelByRoute[routeId];
      arrivalWalkToHostelByRoute[routeId] = {
        en: walkEn,
        ru: previous?.ru?.trim() ? previous.ru : undefined,
      };
    }

    const getOffEn = hub.getOffEn?.trim();
    if (getOffEn) {
      const previous = asLocalizedText(arrivalGetOffAtByRoute[routeId]);
      arrivalGetOffAtByRoute[routeId] = {
        en: getOffEn,
        ru: previous?.ru?.trim() || undefined,
      };
    }
  }

  return {
    arrivalWalkToHostelByRoute,
    arrivalRouteTipsByRoute,
    arrivalGetOffAtByRoute,
    arrivalLocalByRoute,
  };
}
