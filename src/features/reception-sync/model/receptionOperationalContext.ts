import type { BookingComExternalBookingRecord } from '@/entities/booking-com-external-booking';
import type { GuestHubTransferRecord } from '@/entities/guest-hub-transfer';
import type { GuestIssueRecord } from '@/entities/guest-issue';
import type { GuestStayRecordWithLink } from '@/entities/guest-stay';
import type { ReceptionStaffPermission } from '@/entities/reception-user';
import type { ManualHousekeepingDayStartView } from '@/features/guest-registration/lib/resolveManualHousekeepingDayStart';

export type ReceptionOperationalContext = {
  generatedAt: string;
  operationalDayStartTime: string;
  operational: {
    operationalDate: string;
    startsAt: string;
    endsAt: string;
  };
  /**
   * Hub “Start operational day” gate — resolved on the server with the same clock
   * as `operational` / `generatedAt` so SSR and hydrate match.
   */
  housekeepingDayStart: ManualHousekeepingDayStartView;
  stays: GuestStayRecordWithLink[];
  /**
   * Bed-night occupancy for Plan / free-bed inventory (planned + not archived).
   * Includes lived shortened stays after checkout even when access is revoked.
   */
  planStays: GuestStayRecordWithLink[];
  openIssues: GuestIssueRecord[];
  openTransfers: GuestHubTransferRecord[];
  openBookingInbox: BookingComExternalBookingRecord[];
  /** Loaded per request from reception_users (not stored in cookie). */
  staffPermissions?: ReceptionStaffPermission[];
};
