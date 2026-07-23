import {
  receptionStaffCanCheckIn,
  receptionStaffCanClean,
  type ReceptionStaffPermission,
} from '@/entities/reception-user';

export const CHECK_IN_DESK_TABS = [
  'desk',
  'plan',
  'access',
  'cash',
  'issues',
  'transfers',
  'archive',
] as const;

export type CheckInDeskTab = (typeof CHECK_IN_DESK_TABS)[number];
export type DeskTab = CheckInDeskTab | 'cleaning';

const CHECK_IN_TAB_SET = new Set<string>(CHECK_IN_DESK_TABS);

export function isCheckInDeskTab(value: string): value is CheckInDeskTab {
  return CHECK_IN_TAB_SET.has(value);
}

export function isDeskTab(value: string): value is DeskTab {
  return value === 'cleaning' || isCheckInDeskTab(value);
}

export function resolveAllowedDeskTabs(
  permissions: readonly string[] | null | undefined
): DeskTab[] {
  const tabs: DeskTab[] = [];
  if (receptionStaffCanCheckIn(permissions)) {
    tabs.push(...CHECK_IN_DESK_TABS);
  }
  if (receptionStaffCanClean(permissions)) {
    tabs.push('cleaning');
  }
  return tabs;
}

export function resolveDefaultDeskTab(
  permissions: readonly string[] | null | undefined
): DeskTab {
  const allowed = resolveAllowedDeskTabs(permissions);
  if (allowed.includes('desk')) return 'desk';
  if (allowed.includes('cleaning')) return 'cleaning';
  return allowed[0] ?? 'desk';
}

/** Deep-link / user pick → allowed tab (forbidden check-in tabs → cleaning or default). */
export function coerceDeskTab(
  requested: string | null | undefined,
  permissions: readonly ReceptionStaffPermission[] | readonly string[] | null | undefined
): DeskTab {
  const allowed = resolveAllowedDeskTabs(permissions);
  const allowedSet = new Set<string>(allowed);

  if (requested && isDeskTab(requested) && allowedSet.has(requested)) {
    return requested;
  }

  return resolveDefaultDeskTab(permissions);
}
