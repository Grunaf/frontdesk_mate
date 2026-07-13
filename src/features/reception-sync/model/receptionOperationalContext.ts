import type { GuestHubTransferRecord } from '@/entities/guest-hub-transfer';
import type { GuestIssueRecord } from '@/entities/guest-issue';
import type { GuestStayRecordWithLink } from '@/entities/guest-stay';

export type ReceptionOperationalContext = {
  generatedAt: string;
  operationalDayStartTime: string;
  operational: {
    operationalDate: string;
    startsAt: string;
    endsAt: string;
  };
  stays: GuestStayRecordWithLink[];
  openIssues: GuestIssueRecord[];
  openTransfers: GuestHubTransferRecord[];
};
