import type { RouteCategory } from '@/entities/hostel';

export const HUB_TRANSFER_CATEGORIES = ['airport', 'bus', 'train'] as const satisfies readonly RouteCategory[];

export type HubTransferCategory = (typeof HUB_TRANSFER_CATEGORIES)[number];

export const HUB_TRANSFER_DIRECTIONS = ['to_hostel', 'from_hostel'] as const;

export type HubTransferDirection = (typeof HUB_TRANSFER_DIRECTIONS)[number];

export type GuestHubTransferStatus = 'open' | 'done';

export interface GuestHubTransferRecord {
  id: string;
  tenant_id: string;
  stay_id: string;
  bed_id: string;
  guest_name: string | null;
  hub_category: HubTransferCategory;
  direction: HubTransferDirection;
  requested_date: string;
  requested_time: string;
  status: GuestHubTransferStatus;
  note: string | null;
  created_at: string;
  resolved_at: string | null;
}

export type CreateGuestHubTransferInput = {
  tenantSlug: string;
  stayId: string;
  hubCategory: HubTransferCategory;
  direction: HubTransferDirection;
  requestedDate: string;
  requestedTime: string;
  note?: string;
};

export type CreateGuestHubTransferResult =
  | { ok: true; transfer: GuestHubTransferRecord }
  | {
      ok: false;
      error:
        | 'unauthorized'
        | 'tenant_not_found'
        | 'invalid_category'
        | 'invalid_direction'
        | 'invalid_date'
        | 'invalid_time'
        | 'note_too_long'
        | 'too_many_open'
        | 'db_unavailable';
    };

export type ListGuestHubTransfersFilter = 'open' | 'done';

export type ResolveGuestHubTransferResult =
  | { ok: true }
  | { ok: false; error: 'not_found' | 'db_unavailable' };
