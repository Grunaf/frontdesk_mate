export type VolunteerSource = 'direct' | 'worldpacker';

export type VolunteerRecord = {
  id: string;
  tenant_id: string;
  reservation_id: string;
  reception_user_id: string | null;
  display_name: string;
  source: VolunteerSource;
  /** Agreed weekly hours (default 25). */
  weekly_hours_target: number;
  is_archived: boolean;
  archived_at: string | null;
  archived_by_owner_user_id: string | null;
  created_at: string;
  updated_at: string;
};

export type VolunteerListItem = VolunteerRecord & {
  bed_id: string;
  check_in_date: string;
  check_out_date: string;
  staff_login: string | null;
  guest_pin: string | null;
  magic_link_url: string | null;
};

export type VolunteerShiftRecord = {
  id: string;
  tenant_id: string;
  volunteer_id: string;
  starts_at: string;
  ends_at: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateVolunteerStayInput = {
  tenantSlug: string;
  displayName: string;
  source: VolunteerSource;
  bedId: string;
  checkInDate: string;
  checkOutDate: string;
  locale?: string;
};

export type CreateVolunteerStayResult =
  | {
      ok: true;
      volunteer: VolunteerRecord;
      stayId: string;
      accessToken: string;
      magicLinkUrl: string;
      guestPin: string;
      staffLogin: string;
      staffPin: string;
    }
  | {
      ok: false;
      error:
        | 'tenant_not_found'
        | 'bed_not_found'
        | 'access_overlap'
        | 'db_unavailable'
        | 'invalid_source'
        | 'invalid_name'
        | 'staff_limit_reached'
        | 'login_taken';
    };

export type ArchiveVolunteerStayInput = {
  tenantSlug: string;
  volunteerId: string;
  ownerUserId: string;
  /** Property operational calendar day YYYY-MM-DD. */
  operationalDate: string;
};

export type ArchiveVolunteerStayResult =
  | { ok: true }
  | {
      ok: false;
      error:
        | 'not_found'
        | 'already_archived'
        | 'tenant_not_found'
        | 'db_unavailable'
        | 'invalid_operational_day';
    };

export type CreateVolunteerShiftInput = {
  tenantSlug: string;
  volunteerId: string;
  /** Property-local calendar day YYYY-MM-DD. */
  workDate: string;
  /** HH:mm property-local. */
  startTime: string;
  /** HH:mm property-local; must be after startTime same day. */
  endTime: string;
  notes?: string;
};

export type CreateVolunteerShiftResult =
  | { ok: true; shift: VolunteerShiftRecord }
  | {
      ok: false;
      error:
        | 'tenant_not_found'
        | 'not_found'
        | 'archived'
        | 'invalid_range'
        | 'db_unavailable';
    };

export type CreateVolunteerShiftsBulkInput = {
  tenantSlug: string;
  volunteerId: string;
  /** Property-local calendar days YYYY-MM-DD. */
  workDates: string[];
  /** HH:mm property-local. */
  startTime: string;
  /** HH:mm property-local; must be after startTime same day. */
  endTime: string;
  /** Default: skip days that already have a shift. */
  conflictPolicy?: 'skip' | 'overwrite';
  notes?: string;
};

export type CreateVolunteerShiftsBulkResult =
  | {
      ok: true;
      created: VolunteerShiftRecord[];
      skippedDates: string[];
      overwrittenDates: string[];
    }
  | {
      ok: false;
      error:
        | 'tenant_not_found'
        | 'not_found'
        | 'archived'
        | 'invalid_range'
        | 'db_unavailable';
    };

export type UpdateVolunteerShiftInput = {
  tenantSlug: string;
  shiftId: string;
  /** Property-local calendar day YYYY-MM-DD. */
  workDate: string;
  /** HH:mm property-local. */
  startTime: string;
  /** HH:mm property-local; must be after startTime same day. */
  endTime: string;
  notes?: string | null;
};

export type UpdateVolunteerShiftResult =
  | { ok: true; shift: VolunteerShiftRecord }
  | {
      ok: false;
      error:
        | 'tenant_not_found'
        | 'not_found'
        | 'archived'
        | 'invalid_range'
        | 'db_unavailable';
    };

export type DeleteVolunteerShiftResult =
  | { ok: true }
  | { ok: false; error: 'tenant_not_found' | 'not_found' | 'db_unavailable' };

export type UpdateVolunteerWeeklyHoursTargetResult =
  | { ok: true; weeklyHoursTarget: number }
  | {
      ok: false;
      error: 'tenant_not_found' | 'not_found' | 'invalid_target' | 'db_unavailable';
    };
