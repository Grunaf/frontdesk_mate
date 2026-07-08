import type { RouteConfig } from '@/entities/hostel';
import { isTenantLocalRoute, isWalkOnlyRoute } from '@/entities/hostel';
import type { TenantSettings } from '@/entities/tenant';

/** Admin helper: destination (= hostel) filled, leave point A for the operator to set in Maps. */
export function buildWalkingMapsDestinationOnlyUrl(destination: string): string | undefined {
  const trimmed = destination.trim();
  if (!trimmed) {
    return undefined;
  }
  const params = new URLSearchParams({
    api: '1',
    travelmode: 'walking',
    destination: trimmed,
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function resolveWalkingMapsDestination(input: {
  addressDisplay?: string;
  googleMapsHref?: string;
}): string | undefined {
  const href = input.googleMapsHref?.trim();
  if (href) {
    return href;
  }
  const display = input.addressDisplay?.trim();
  return display || undefined;
}

/** Guest CTA: full walking Maps URL saved by the operator — never auto-built. */
export function resolveWalkingMapsUrlFromSettings(
  route: RouteConfig,
  settings?: TenantSettings
): string | undefined {
  // Shared walk_only + Local (any mode): show CTA when operator pasted a Maps URL.
  if (!isWalkOnlyRoute(route) && !isTenantLocalRoute(route)) {
    return undefined;
  }
  return settings?.arrivalWalkMapsUrlByRoute?.[route.id]?.trim() || undefined;
}
