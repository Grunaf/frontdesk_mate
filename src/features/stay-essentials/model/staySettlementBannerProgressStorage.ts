export type StaySettlementBannerProgress = {
  essentialsDone: boolean;
  roomDone: boolean;
};

const EMPTY_PROGRESS: StaySettlementBannerProgress = {
  essentialsDone: false,
  roomDone: false,
};

export function buildStaySettlementBannerProgressStorageKey(
  tenantSlug: string,
  stayId: string
): string {
  return `staySettlementBanner:${tenantSlug}:${stayId}`;
}

function parseProgress(raw: string | null): StaySettlementBannerProgress {
  if (!raw) {
    return { ...EMPTY_PROGRESS };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StaySettlementBannerProgress>;
    return {
      essentialsDone: parsed.essentialsDone === true,
      roomDone: parsed.roomDone === true,
    };
  } catch {
    return { ...EMPTY_PROGRESS };
  }
}

function writeProgress(storageKey: string, progress: StaySettlementBannerProgress): void {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(progress));
  } catch {
    // ignore storage failures
  }
}

export function readStaySettlementBannerProgress(
  tenantSlug: string,
  stayId: string
): StaySettlementBannerProgress {
  if (typeof window === 'undefined') {
    return { ...EMPTY_PROGRESS };
  }

  const key = buildStaySettlementBannerProgressStorageKey(tenantSlug, stayId);
  return parseProgress(window.localStorage.getItem(key));
}

export function persistStaySettlementBannerProgress(
  tenantSlug: string,
  stayId: string,
  progress: StaySettlementBannerProgress
): void {
  if (typeof window === 'undefined') {
    return;
  }

  const key = buildStaySettlementBannerProgressStorageKey(tenantSlug, stayId);
  writeProgress(key, progress);
}

export function markStaySettlementEssentialsDone(tenantSlug: string, stayId: string): void {
  const current = readStaySettlementBannerProgress(tenantSlug, stayId);
  if (current.essentialsDone) {
    return;
  }

  persistStaySettlementBannerProgress(tenantSlug, stayId, {
    ...current,
    essentialsDone: true,
  });
}

export function markStaySettlementRoomDone(tenantSlug: string, stayId: string): void {
  const current = readStaySettlementBannerProgress(tenantSlug, stayId);
  if (current.roomDone) {
    return;
  }

  persistStaySettlementBannerProgress(tenantSlug, stayId, {
    ...current,
    roomDone: true,
  });
}
