import 'server-only';

import { notifyReceptionDesk } from '../api/receptionPushRepository';
import type { GuestIssueCategory } from '@/entities/guest-issue';
import type { GuestHubTransferRecord } from '@/entities/guest-hub-transfer';
import {
  buildGuestHubTransferPushPayload,
  buildGuestIssuePushPayload,
} from './receptionPushMessages';

export async function notifyReceptionGuestIssue(input: {
  tenantSlug: string;
  category: GuestIssueCategory;
  guestName: string | null;
}): Promise<void> {
  await notifyReceptionDesk({
    tenantSlug: input.tenantSlug,
    payload: buildGuestIssuePushPayload(input),
  });
}

export async function notifyReceptionHubTransfer(input: {
  tenantSlug: string;
  transfer: GuestHubTransferRecord;
}): Promise<void> {
  await notifyReceptionDesk({
    tenantSlug: input.tenantSlug,
    payload: buildGuestHubTransferPushPayload(input.transfer),
  });
}
