import type { RouteId, RouteMode } from '@/entities/hostel';
import type { CityPackRouteContent } from '@/entities/city-pack/model/types';
import type { GuidedRouteOpenQuestion } from '@/features/city-pack-guided-fill';

export type PackBulkImportRouteBlockKey = 'transit' | 'walk' | 'taxi';

export type PackBulkImportCopyBlock = {
  publicTitle?: string;
  publicSummary?: string;
  publicPreview?: string;
  publicText?: string;
  publicGetOffAt?: string;
  publicWalkToHostel?: string;
  tips?: string[];
};

export type PackBulkImportTaxiBlock = {
  taxiCost?: string | { en?: string };
  taxiPickupPoint?: string | { en?: string };
  tips?: string[];
};

export type PackBulkImportHubImport = {
  primaryRouteMode?: RouteMode;
  transit?: PackBulkImportCopyBlock;
  walk?: PackBulkImportCopyBlock;
  taxi?: PackBulkImportTaxiBlock;
  metadata?: import('@/entities/city-pack/lib/patchRouteMetadataFromImport').RouteMetadataImport;
  openQuestions?: GuidedRouteOpenQuestion[];
};

export type PackBulkImportDocument = {
  packId: string;
  suggestedEnabledRoutes?: RouteId[];
  routes: Partial<Record<RouteId, PackBulkImportHubImport>>;
};

export type PackBulkImportParseResult =
  | { ok: true; document: PackBulkImportDocument }
  | { ok: false; message: string };

export type PackBulkImportHubPreview = {
  routeId: RouteId;
  hubLabel: string;
  primaryRouteMode: RouteMode;
  blocksPresent: PackBulkImportRouteBlockKey[];
  warnings: string[];
  openQuestions: GuidedRouteOpenQuestion[];
  gateReady: boolean;
  gateStatusLabel: string;
  /** Route after preview merge (not yet written to wizard state). */
  mergedRoute: CityPackRouteContent;
};

export type PackBulkImportPreviewState = {
  document: PackBulkImportDocument;
  packIdMismatch: boolean;
  hubs: PackBulkImportHubPreview[];
};
