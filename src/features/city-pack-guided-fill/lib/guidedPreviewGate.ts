import type { CityPackRouteContent } from '@/entities/city-pack/model/types';
import type { GuidedRouteFillPreview } from '../model/types';
import { applyGuidedFillPreview } from './applyGuidedFillPreview';
import { formatRouteGateStatus } from '@/entities/city-pack';

export function resolveRouteAfterGuidedPreview(
  packId: string,
  routeId: Parameters<typeof applyGuidedFillPreview>[1],
  route: CityPackRouteContent,
  preview: GuidedRouteFillPreview
): CityPackRouteContent {
  return applyGuidedFillPreview(packId, routeId, route, preview);
}

export function isGuidedPreviewGateReady(
  packId: string,
  routeId: Parameters<typeof applyGuidedFillPreview>[1],
  route: CityPackRouteContent,
  preview: GuidedRouteFillPreview
): ReturnType<typeof formatRouteGateStatus> {
  const next = resolveRouteAfterGuidedPreview(packId, routeId, route, preview);
  return formatRouteGateStatus(next);
}
