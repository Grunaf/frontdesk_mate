export const HOUSEKEEPING_BED_STATUSES = ['needs_strip', 'stripped', 'ready'] as const;

export type HousekeepingBedStatus = (typeof HOUSEKEEPING_BED_STATUSES)[number];

export const HOUSEKEEPING_ROOM_STATUSES = ['cleaned', 'not_cleaned'] as const;

export type HousekeepingRoomStatus = (typeof HOUSEKEEPING_ROOM_STATUSES)[number];

export interface HousekeepingBedStatusRecord {
  tenant_id: string;
  bed_id: string;
  status: HousekeepingBedStatus;
  updated_at: string;
}

export interface HousekeepingRoomStatusRecord {
  tenant_id: string;
  room_id: string;
  status: HousekeepingRoomStatus;
  updated_at: string;
}

export type UpsertHousekeepingBedStatusInput = {
  tenantId: string;
  bedId: string;
  status: HousekeepingBedStatus;
};

export type UpsertHousekeepingRoomStatusInput = {
  tenantId: string;
  roomId: string;
  status: HousekeepingRoomStatus;
};

export type UpsertHousekeepingStatusResult =
  | { ok: true }
  | { ok: false; error: 'invalid_status' | 'db_unavailable' };

export const HOUSEKEEPING_LAUNDRY_RUN_STATUSES = ['running', 'done', 'cancelled'] as const;

export type HousekeepingLaundryRunStatus = (typeof HOUSEKEEPING_LAUNDRY_RUN_STATUSES)[number];

export const HOUSEKEEPING_LAUNDRY_PROGRAMS = ['wash', 'spin_drain'] as const;

export type HousekeepingLaundryProgram = (typeof HOUSEKEEPING_LAUNDRY_PROGRAMS)[number];

export const HOUSEKEEPING_LAUNDRY_PROGRAM_LABELS: Record<HousekeepingLaundryProgram, string> = {
  wash: 'Wash',
  spin_drain: 'Spin & drain',
};

export interface HousekeepingLaundryRunRecord {
  id: string;
  tenant_id: string;
  machine_id: string;
  program: HousekeepingLaundryProgram;
  status: HousekeepingLaundryRunStatus;
  started_at: string;
  ends_at: string;
  completed_at: string | null;
  started_by_reception_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export type StartLaundryRunInput = {
  tenantId: string;
  machineId: string;
  program: HousekeepingLaundryProgram;
  durationMinutes: number;
  startedByReceptionUserId?: string | null;
};

export type StartLaundryRunResult =
  | { ok: true; run: HousekeepingLaundryRunRecord }
  | {
      ok: false;
      error: 'already_running' | 'db_unavailable' | 'invalid_input';
    };

export type FinishLaundryRunInput = {
  tenantId: string;
  runId: string;
};

export type FinishLaundryRunResult =
  | { ok: true; run: HousekeepingLaundryRunRecord }
  | { ok: false; error: 'not_found' | 'not_running' | 'db_unavailable' };

/** Soft Cleaning → desk signal. Not checkout. Absence of row = unset. */
export const HOUSEKEEPING_STAY_PRESENCE_STATUSES = ['vacant', 'still_here'] as const;

export type HousekeepingStayPresenceStatus =
  (typeof HOUSEKEEPING_STAY_PRESENCE_STATUSES)[number];

export interface HousekeepingStayPresenceRecord {
  tenant_id: string;
  stay_id: string;
  bed_id: string;
  status: HousekeepingStayPresenceStatus;
  set_by_reception_user_id: string | null;
  set_at: string;
}

export type UpsertHousekeepingStayPresenceInput = {
  tenantId: string;
  stayId: string;
  bedId: string;
  status: HousekeepingStayPresenceStatus;
  setByReceptionUserId?: string | null;
};

export type ClearHousekeepingStayPresenceInput = {
  tenantId: string;
  stayId: string;
};
