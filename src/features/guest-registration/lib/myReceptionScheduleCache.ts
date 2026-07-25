import type { LoadMyReceptionScheduleResult } from '../actions/myScheduleActions';
import { loadMyReceptionScheduleAction } from '../actions/myScheduleActions';

type CachedOk = Extract<LoadMyReceptionScheduleResult, { ok: true }>;

type CacheEntry = {
  data: CachedOk | null;
  inflight: Promise<LoadMyReceptionScheduleResult> | null;
};

const cacheByKey = new Map<string, CacheEntry>();

function weekCacheKey(tenantSlug: string, weekStartMonday: string) {
  return `${tenantSlug}::${weekStartMonday}`;
}

function pendingKey(tenantSlug: string) {
  return `${tenantSlug}::__pending__`;
}

export function readMyReceptionScheduleCache(
  tenantSlug: string,
  weekStartMonday: string
): CachedOk | null {
  return cacheByKey.get(weekCacheKey(tenantSlug, weekStartMonday))?.data ?? null;
}

/** Prefetch / load with single-flight + memory cache per tenant + week. */
export async function loadMyReceptionScheduleCached(
  tenantSlug: string,
  options?: { weekStartMonday?: string; force?: boolean }
): Promise<LoadMyReceptionScheduleResult> {
  const requestedWeek = options?.weekStartMonday?.trim() || '';

  if (!options?.force && requestedWeek) {
    const hit = readMyReceptionScheduleCache(tenantSlug, requestedWeek);
    if (hit) return hit;
    const existing = cacheByKey.get(weekCacheKey(tenantSlug, requestedWeek));
    if (existing?.inflight) return existing.inflight;
  }

  if (!options?.force && !requestedWeek) {
    const pending = cacheByKey.get(pendingKey(tenantSlug));
    if (pending?.inflight) return pending.inflight;
  }

  const storeKey = requestedWeek
    ? weekCacheKey(tenantSlug, requestedWeek)
    : pendingKey(tenantSlug);
  const previous = requestedWeek
    ? readMyReceptionScheduleCache(tenantSlug, requestedWeek)
    : null;

  const inflight = loadMyReceptionScheduleAction({
    tenantSlug,
    weekStartMonday: requestedWeek || undefined,
  }).then((result) => {
    cacheByKey.delete(pendingKey(tenantSlug));
    if (result.ok) {
      cacheByKey.set(weekCacheKey(tenantSlug, result.weekStartMonday), {
        data: result,
        inflight: null,
      });
    } else if (requestedWeek) {
      cacheByKey.set(weekCacheKey(tenantSlug, requestedWeek), {
        data: previous,
        inflight: null,
      });
    }
    return result;
  });

  cacheByKey.set(storeKey, { data: previous, inflight });
  return inflight;
}

export function prefetchMyReceptionSchedule(tenantSlug: string): void {
  void loadMyReceptionScheduleCached(tenantSlug);
}
