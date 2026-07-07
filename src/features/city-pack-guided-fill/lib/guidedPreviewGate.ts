import type { CityPackContent, CityPackRouteContent } from '@/entities/city-pack/model/types';
import type { GuidedRouteFillPreview } from '../model/types';
import { applyGuidedFillPreview } from './applyGuidedFillPreview';
import { formatRouteGateStatus } from '@/entities/city-pack';

export function resolveRouteAfterGuidedPreview(
  packId: string,
  routeId: Parameters<typeof applyGuidedFillPreview>[1],
  route: CityPackRouteContent,
  preview: GuidedRouteFillPreview,
  content?: CityPackContent
): CityPackRouteContent {
  return applyGuidedFillPreview(packId, routeId, route, preview, content);
}

export function isGuidedPreviewGateReady(
  packId: string,
  routeId: Parameters<typeof applyGuidedFillPreview>[1],
  route: CityPackRouteContent,
  preview: GuidedRouteFillPreview,
  content?: CityPackContent
): ReturnType<typeof formatRouteGateStatus> {
  const next = resolveRouteAfterGuidedPreview(packId, routeId, route, preview, content);
  return formatRouteGateStatus(next);
}
