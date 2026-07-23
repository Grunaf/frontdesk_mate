import type { GuestHubTransferRecord } from '@/entities/guest-hub-transfer';
import type { GuestIssueRecord } from '@/entities/guest-issue';
import type { GuestStayRecordWithLink } from '@/entities/guest-stay';
import type { ReceptionStaffPermission } from '@/entities/reception-user';

export type ReceptionOperationalContext = {
  generatedAt: string;
  operationalDayStartTime: string;
  operational: {
    operationalDate: string;
    startsAt: string;
    endsAt: string;
  };
  stays: GuestStayRecordWithLink[];
  /**
   * Bed-night occupancy for Plan / free-bed inventory (planned + not archived).
   * Includes lived shortened stays after checkout even when access is revoked.
   */
  planStays: GuestStayRecordWithLink[];
  openIssues: GuestIssueRecord[];
  openTransfers: GuestHubTransferRecord[];
  /** Loaded per request from reception_users (not stored in cookie). */
  staffPermissions?: ReceptionStaffPermission[];
};
