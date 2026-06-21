'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { HouseRule } from '@/entities/house-rules';
import type { GuestStayConfig, TenantSettings } from '@/entities/tenant';
import type { HostelPlace } from '@/entities/tenant/model/hostelPlaces';
import { getHouseRules, migrateActiveRulesKeys } from '@/entities/house-rules';

export interface TenantFormDraft {
  highlightedBedId?: string;
  houseRules?: HouseRule[];
  guestStay?: GuestStayConfig;
  hostelPlaces?: HostelPlace[];
  roomMapEnabled?: boolean;
  launchBookingPath?: 'engine' | 'wa';
}

interface TenantFormDraftContextValue {
  draft: TenantFormDraft;
  updateDraft: (patch: Partial<TenantFormDraft>) => void;
}

const TenantFormDraftContext = createContext<TenantFormDraftContextValue | null>(null);

export function mergeDraftSettings(base: TenantSettings, draft: TenantFormDraft): TenantSettings {
  let merged: TenantSettings = {
    ...base,
    ...(draft.highlightedBedId !== undefined ? { highlightedBedId: draft.highlightedBedId } : {}),
    ...(draft.houseRules !== undefined ? { houseRules: draft.houseRules } : {}),
    ...(draft.guestStay !== undefined ? { guestStay: draft.guestStay } : {}),
    ...(draft.hostelPlaces !== undefined ? { hostelPlaces: draft.hostelPlaces } : {}),
  };

  if (draft.roomMapEnabled === false) {
    merged = {
      ...merged,
      highlightedBedId: undefined,
      guestStay: undefined,
    };
  }

  if (draft.houseRules !== undefined) {
    merged = {
      ...merged,
      houseRules: draft.houseRules,
      activeRulesKeys: undefined,
    };
  } else if (merged.activeRulesKeys?.length && !merged.houseRules) {
    merged = {
      ...merged,
      houseRules: migrateActiveRulesKeys(merged.activeRulesKeys),
    };
  }

  return merged;
}

export function TenantFormDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<TenantFormDraft>({});

  const updateDraft = useCallback((patch: Partial<TenantFormDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
  }, []);

  const value = useMemo(() => ({ draft, updateDraft }), [draft, updateDraft]);

  return <TenantFormDraftContext.Provider value={value}>{children}</TenantFormDraftContext.Provider>;
}

export function useTenantFormDraft(): TenantFormDraftContextValue {
  const context = useContext(TenantFormDraftContext);
  if (!context) {
    throw new Error('useTenantFormDraft must be used within TenantFormDraftProvider');
  }
  return context;
}

export { getHouseRules };
