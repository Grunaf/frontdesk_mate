import type { GuestIssueCategory } from '@/entities/guest-issue';
import type { GuestHubTransferRecord } from '@/entities/guest-hub-transfer';
import type { ReceptionPushPayload } from '../model/types';

const ISSUE_CATEGORY_LABEL: Record<GuestIssueCategory, string> = {
  shower: 'Shower',
  toilet: 'Toilet',
  door_lock: 'Door / lock',
  bed: 'Bed',
  wifi: 'Wi‑Fi',
  other: 'Other',
};

export function buildGuestIssuePushPayload(input: {
  category: GuestIssueCategory;
  guestName: string | null;
}): ReceptionPushPayload {
  const categoryLabel = ISSUE_CATEGORY_LABEL[input.category] ?? 'Issue';
  const guest = input.guestName?.trim() || 'Guest';
  return {
    title: 'New guest issue',
    body: `${categoryLabel} — ${guest}`,
    url: '/?tab=issues',
    tag: 'reception-guest-issue',
    refresh: 'context',
  };
}

export function buildGuestStayPushPayload(input: {
  guestName: string | null;
  kind: 'reservation' | 'walk-in';
}): ReceptionPushPayload {
  const guest = input.guestName?.trim() || 'Guest';
  const title = input.kind === 'walk-in' ? 'Walk-in' : 'New reservation';
  return {
    title,
    body: guest,
    url: '/?tab=desk',
    tag: 'reception-stay',
    refresh: 'context',
  };
}

export function buildGuestHubTransferPushPayload(transfer: GuestHubTransferRecord): ReceptionPushPayload {
  const guest = transfer.guest_name?.trim() || 'Guest';
  const when = `${transfer.requested_date} ${transfer.requested_time}`;
  return {
    title: 'Transfer request',
    body: `${guest} · ${transfer.direction} · ${when}`,
    url: '/?tab=transfers',
    tag: 'reception-hub-transfer',
    refresh: 'context',
  };
}
