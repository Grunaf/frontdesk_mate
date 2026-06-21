export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function isWithinArrivalWindow(checkInAt: string | null | undefined, now = new Date()): boolean {
  if (!checkInAt?.trim()) {
    return false;
  }

  const checkInDate = startOfLocalDay(new Date(checkInAt));
  if (!Number.isFinite(checkInDate.getTime())) {
    return false;
  }

  const today = startOfLocalDay(now);
  const lastArrivalDay = new Date(checkInDate);
  lastArrivalDay.setDate(lastArrivalDay.getDate() + 1);

  return today >= checkInDate && today <= lastArrivalDay;
}

export function buildExploreUnlockedStorageKey(stayId: string): string {
  return `${stayId}_guide_explore_unlocked`;
}

export function readExploreUnlocked(stayId: string | null | undefined): boolean {
  if (!stayId || typeof window === 'undefined') {
    return false;
  }

  try {
    return window.localStorage.getItem(buildExploreUnlockedStorageKey(stayId)) === '1';
  } catch {
    return false;
  }
}

export function persistExploreUnlocked(stayId: string): void {
  try {
    window.localStorage.setItem(buildExploreUnlockedStorageKey(stayId), '1');
  } catch {
    // ignore storage failures
  }
}
