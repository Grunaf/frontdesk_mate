'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { GuestExtraConfig } from '@/entities/guest-extra';
import type { HouseRule } from '@/entities/house-rules';
import type { GuestStayConfig, TenantLandingSettings, TenantSettings } from '@/entities/tenant';
import type { TenantHostelSettings } from '@/entities/tenant/model/hostelSettings';
import type { RouteId } from '@/entities/hostel';
import type { LocalizedField } from '@/entities/city-pack/model/types';
import type { HostelPlace } from '@/entities/tenant/model/hostelPlaces';
import { getHouseRules, migrateActiveRulesKeys } from '@/entities/house-rules';
import {
  finalizeGuestStayForSave,
  resolveTourismRegistrationConfig,
  resolveTourismRegistrationRequired,
} from '@/entities/tenant/lib/normalizeGuestStaySettings';
import { isRoomMapModuleEnabled } from '@/entities/tenant/lib/resolveGuestModuleToggles';

export interface TenantFormDraft {
  logoUrl?: string;
  heroBgUrl?: string;
  houseRules?: HouseRule[];
  guestExtras?: GuestExtraConfig[];
  guestStay?: GuestStayConfig;
  hostelPlaces?: HostelPlace[];
  landing?: TenantLandingSettings;
  hostel?: TenantHostelSettings;
  roomMapEnabled?: boolean;
  tourismRegistrationRequired?: boolean;
  tourismProfileId?: string;
  launchBookingPath?: 'engine' | 'wa';
  arrivalWalkToHostel?: LocalizedField;
  arrivalWalkToHostelByRoute?: Partial<Record<RouteId, LocalizedField>>;
}

interface UpdateDraftOptions {
  /** When true, updates draft state without marking the form unsaved. */
  silent?: boolean;
}

interface TenantFormDraftContextValue {
  draft: TenantFormDraft;
  updateDraft: (patch: Partial<TenantFormDraft>, options?: UpdateDraftOptions) => void;
  syncDraft: (patch: Partial<TenantFormDraft>) => void;
  isDirty: boolean;
  markDirty: () => void;
  resetDirty: () => void;
}

const TenantFormDraftContext = createContext<TenantFormDraftContextValue | null>(null);

export function mergeDraftSettings(base: TenantSettings, draft: TenantFormDraft): TenantSettings {
  let merged: TenantSettings = {
    ...base,
    ...(draft.logoUrl !== undefined ? { logoUrl: draft.logoUrl || undefined } : {}),
    ...(draft.heroBgUrl !== undefined ? { heroBgUrl: draft.heroBgUrl || undefined } : {}),
    ...(draft.houseRules !== undefined ? { houseRules: draft.houseRules } : {}),
    ...(draft.guestExtras !== undefined ? { guestExtras: draft.guestExtras } : {}),
    ...(draft.guestStay !== undefined ? { guestStay: draft.guestStay } : {}),
    ...(draft.hostelPlaces !== undefined ? { hostelPlaces: draft.hostelPlaces } : {}),
    ...(draft.landing !== undefined
      ? {
          landing: {
            ...base.landing,
            ...draft.landing,
            roomTypes: draft.landing.roomTypes ?? base.landing?.roomTypes,
          },
        }
      : {}),
    ...(draft.hostel !== undefined
      ? {
          hostel: {
            ...base.hostel,
            ...draft.hostel,
          },
        }
      : {}),
    ...(draft.arrivalWalkToHostel !== undefined
      ? { arrivalWalkToHostel: draft.arrivalWalkToHostel }
      : {}),
    ...(draft.arrivalWalkToHostelByRoute !== undefined
      ? { arrivalWalkToHostelByRoute: draft.arrivalWalkToHostelByRoute }
      : {}),
  };

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

  const tourismRegistrationRequired =
    draft.tourismRegistrationRequired ?? resolveTourismRegistrationRequired(base);
  const existingConfig = resolveTourismRegistrationConfig(base);
  const tourismProfileId =
    draft.tourismProfileId ?? existingConfig?.profileId;
  const roomMapEnabled = draft.roomMapEnabled ?? isRoomMapModuleEnabled(merged);

  merged = {
    ...merged,
    guestStay: finalizeGuestStayForSave({
      roomMapEnabled,
      guestStay: merged.guestStay,
      tourismRegistrationRequired,
      tourismProfileId,
    }),
  };

  return merged;
}

export function TenantFormDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<TenantFormDraft>({});
  const [isDirty, setIsDirty] = useState(false);
  const isHydratingRef = useRef(true);

  useEffect(() => {
    isHydratingRef.current = false;
  }, []);

  const markDirty = useCallback(() => setIsDirty(true), []);
  const resetDirty = useCallback(() => setIsDirty(false), []);

  const updateDraft = useCallback((patch: Partial<TenantFormDraft>, options?: UpdateDraftOptions) => {
    setDraft((current) => ({ ...current, ...patch }));
    if (!options?.silent && !isHydratingRef.current) {
      setIsDirty(true);
    }
  }, []);

  const syncDraft = useCallback((patch: Partial<TenantFormDraft>) => {
    updateDraft(patch, { silent: true });
  }, [updateDraft]);

  const value = useMemo(
    () => ({ draft, updateDraft, syncDraft, isDirty, markDirty, resetDirty }),
    [draft, updateDraft, syncDraft, isDirty, markDirty, resetDirty]
  );

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
