import type { RouteId } from '@/entities/hostel';
import type { LocalizedText } from '@/entities/city-pack/model/types';
import type { TenantLocalArrivalMode } from '@/entities/tenant';

export type TenantLastMileBulkMode = 'from_get_off' | 'walk_only_hub' | 'tenant_local_full';

export type TenantLastMileBulkHubImport = {
  mode: TenantLastMileBulkMode;
  /** Shared last-mile walk, or Local walk/on-foot primary text. */
  walkEn?: string;
  tipsEn?: string[];
  /**
   * Shared: optional get-off override.
   * Local transit_lite: get-off for hostel path.
   */
  getOffEn?: string;
  /** Local only: walk | transit_lite (default walk). */
  localMode?: TenantLocalArrivalMode;
  /** Local optional card title / summary. */
  titleEn?: string;
  summaryEn?: string;
  /** Local transit_lite: primary board/ride text (falls back to walkEn if omitted). */
  primaryEn?: string;
  /** Local transit_lite: final walk after get-off. */
  walkToHostelEn?: string;
  mapsOriginLabel?: string;
  openQuestions?: { id: string; question: string }[];
};

export type TenantLastMileBulkDocument = {
  tenantSlug: string;
  routes: Partial<Record<RouteId, TenantLastMileBulkHubImport>>;
};

export type TenantLastMileBulkParseResult =
  | { ok: true; document: TenantLastMileBulkDocument }
  | { ok: false; message: string };

export type TenantLastMileBulkHubPreview = {
  routeId: RouteId;
  hubLabel: string;
  mode: TenantLastMileBulkMode;
  anchorLabelEn?: string;
  walkPreview: string;
  tipsCount: number;
  openQuestions: { id: string; question: string }[];
  warnings: string[];
};

export type TenantLastMileBulkPreviewState = {
  document: TenantLastMileBulkDocument;
  tenantSlugMismatch: boolean;
  ignoredOutOfScopeRouteIds: RouteId[];
  hubs: TenantLastMileBulkHubPreview[];
};
