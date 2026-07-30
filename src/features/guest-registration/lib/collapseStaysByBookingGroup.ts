import type { GuestStayRecordWithLink } from '@/entities/guest-stay';

/**
 * One row per booking_group_id for Hub/Cash lists.
 * Representative = balance-bearing row when present, else earliest created_at.
 * Singletons (no group) pass through unchanged. Order follows first appearance.
 */
export function collapseStaysByBookingGroup(
  stays: GuestStayRecordWithLink[]
): GuestStayRecordWithLink[] {
  const byGroup = new Map<string, GuestStayRecordWithLink[]>();
  for (const stay of stays) {
    const groupId = stay.booking_group_id?.trim();
    if (!groupId) continue;
    const list = byGroup.get(groupId) ?? [];
    list.push(stay);
    byGroup.set(groupId, list);
  }

  const emittedGroups = new Set<string>();
  const result: GuestStayRecordWithLink[] = [];

  for (const stay of stays) {
    const groupId = stay.booking_group_id?.trim();
    if (!groupId) {
      result.push(stay);
      continue;
    }
    if (emittedGroups.has(groupId)) continue;
    emittedGroups.add(groupId);

    const members = byGroup.get(groupId) ?? [stay];
    if (members.length === 1) {
      result.push(members[0]!);
      continue;
    }

    const withBalance = members.find((member) => member.booking_amount_due_minor != null);
    if (withBalance) {
      result.push(withBalance);
      continue;
    }

    const earliest = [...members].sort((a, b) => a.created_at.localeCompare(b.created_at))[0];
    result.push(earliest ?? stay);
  }

  return result;
}

/** Party size for a stay within a full stay list (plan/active). */
export function countBookingGroupMembers(
  stays: GuestStayRecordWithLink[],
  bookingGroupId: string | null | undefined
): number {
  const groupId = bookingGroupId?.trim();
  if (!groupId) return 1;
  return stays.filter((stay) => stay.booking_group_id === groupId).length;
}
