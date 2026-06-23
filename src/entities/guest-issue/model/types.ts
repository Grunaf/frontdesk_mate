export const GUEST_ISSUE_CATEGORIES = [
  'shower',
  'toilet',
  'door_lock',
  'bed',
  'wifi',
  'other',
] as const;

export type GuestIssueCategory = (typeof GUEST_ISSUE_CATEGORIES)[number];

export type GuestIssueStatus = 'open' | 'done';

export interface GuestIssueRecord {
  id: string;
  tenant_id: string;
  stay_id: string;
  bed_id: string;
  category: GuestIssueCategory;
  note: string | null;
  status: GuestIssueStatus;
  guest_name: string | null;
  created_at: string;
  resolved_at: string | null;
}

export type CreateGuestIssueInput = {
  tenantSlug: string;
  stayId: string;
  category: GuestIssueCategory;
  note?: string;
};

export type CreateGuestIssueResult =
  | { ok: true; issue: GuestIssueRecord }
  | {
      ok: false;
      error:
        | 'unauthorized'
        | 'tenant_not_found'
        | 'stay_not_found'
        | 'invalid_category'
        | 'note_too_long'
        | 'too_many_open'
        | 'db_unavailable';
    };

export type ListGuestIssuesFilter = 'open' | 'done';

export type ResolveGuestIssueResult =
  | { ok: true }
  | { ok: false; error: 'unauthorized' | 'not_found' | 'db_unavailable' };
