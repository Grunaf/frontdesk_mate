import {
  receptionStaffCanCheckIn,
  receptionStaffCanClean,
  type ReceptionStaffPermission,
} from '@/entities/reception-user';

/** All deep-linkable desk tabs (URL `?tab=`). */
export const CHECK_IN_DESK_TABS = [
  'desk',
  'plan',
  'access',
  'cash',
  'issues',
  'transfers',
  'booking-inbox',
  'archive',
] as const;

export type CheckInDeskTab = (typeof CHECK_IN_DESK_TABS)[number];
export type DeskTab = CheckInDeskTab | 'cleaning' | 'schedule' | 'wash';

/**
 * Screens listed in More (type union). Order within groups: see MORE_MENU_GROUPS.
 * Plan opens via bottom Bookings; Booking.com inbox / Archive via Plan chrome (or deep-link).
 * Access/Cash/Wash via More (or deep-link).
 */
export const MORE_MENU_TABS = [
  'access',
  'cash',
  'issues',
  'transfers',
  'cleaning',
  'wash',
  'schedule',
] as const;
export type MoreMenuTab = (typeof MORE_MENU_TABS)[number];

/** More menu sections — always render non-empty groups in this order. */
export const MORE_MENU_GROUPS = [
  { id: 'stay', label: 'Stay', tabs: ['access', 'cash'] },
  { id: 'inbox', label: 'Inbox', tabs: ['issues', 'transfers'] },
  { id: 'housekeeping', label: 'Housekeeping', tabs: ['cleaning', 'wash'] },
  { id: 'other', label: 'Other', tabs: ['schedule'] },
] as const;

export type MoreMenuGroupId = (typeof MORE_MENU_GROUPS)[number]['id'];

export type MoreMenuGroup = {
  id: MoreMenuGroupId;
  label: string;
  items: MoreMenuTab[];
};

/**
 * Project visible More tabs into labeled groups.
 * Empty groups are omitted; group and item order follow MORE_MENU_GROUPS.
 */
export function groupMoreMenuTabs(items: readonly MoreMenuTab[]): MoreMenuGroup[] {
  const present = new Set<MoreMenuTab>(items);
  const groups: MoreMenuGroup[] = [];
  for (const def of MORE_MENU_GROUPS) {
    const groupItems = def.tabs.filter((tab): tab is MoreMenuTab => present.has(tab));
    if (groupItems.length === 0) continue;
    groups.push({ id: def.id, label: def.label, items: [...groupItems] });
  }
  return groups;
}

export type ReceptionPrimaryNav =
  | 'today'
  | 'bookings'
  | 'more'
  | 'cleaning'
  | 'schedule';

export type ResolveMoreMenuTabsOptions = {
  /** When true, include Wash (laundry machines configured). */
  showWash?: boolean;
};

const CHECK_IN_TAB_SET = new Set<string>(CHECK_IN_DESK_TABS);
const MORE_TAB_SET = new Set<string>(MORE_MENU_TABS);

/** More tabs that can sit directly in bottom nav when they are the only More item. */
function moreMenuTabAsPrimary(tab: MoreMenuTab): ReceptionPrimaryNav | null {
  if (tab === 'schedule' || tab === 'cleaning') return tab;
  return null;
}

function resolveCandidateMoreMenuTabs(
  permissions: readonly string[] | null | undefined,
  options: ResolveMoreMenuTabsOptions = {}
): MoreMenuTab[] {
  const tabs: MoreMenuTab[] = [];
  const canCheckIn = receptionStaffCanCheckIn(permissions);
  const canClean = receptionStaffCanClean(permissions);

  if (canCheckIn) {
    tabs.push('access', 'cash');
  }
  if (canCheckIn || canClean) {
    tabs.push('schedule');
  }
  if (canCheckIn) {
    tabs.push('issues', 'transfers');
  }
  if (canClean && canCheckIn) {
    // Cleaning-only staff uses Cleaning as primary, not More.
    tabs.push('cleaning');
  }
  if (canClean && options.showWash) {
    tabs.push('wash');
  }
  return tabs;
}

export function isCheckInDeskTab(value: string): value is CheckInDeskTab {
  return CHECK_IN_TAB_SET.has(value);
}

export function isDeskTab(value: string): value is DeskTab {
  return (
    value === 'cleaning' ||
    value === 'schedule' ||
    value === 'wash' ||
    isCheckInDeskTab(value)
  );
}

export function isMoreMenuTab(value: string): value is MoreMenuTab {
  return MORE_TAB_SET.has(value);
}

export function resolveAllowedDeskTabs(
  permissions: readonly string[] | null | undefined
): DeskTab[] {
  const tabs: DeskTab[] = [];
  const canCheckIn = receptionStaffCanCheckIn(permissions);
  const canClean = receptionStaffCanClean(permissions);

  if (canCheckIn) {
    tabs.push(...CHECK_IN_DESK_TABS);
  }
  if (canClean) {
    tabs.push('cleaning', 'wash');
  }
  if (canCheckIn || canClean) {
    tabs.push('schedule');
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

/**
 * Tabs shown inside the More menu surface.
 * When there is exactly one candidate and it can be a bottom-nav primary,
 * it is promoted out of More (empty list).
 */
export function resolveMoreMenuTabs(
  permissions: readonly string[] | null | undefined,
  options: ResolveMoreMenuTabsOptions = {}
): MoreMenuTab[] {
  const tabs = resolveCandidateMoreMenuTabs(permissions, options);
  if (tabs.length === 1 && moreMenuTabAsPrimary(tabs[0])) {
    return [];
  }
  return tabs;
}

/**
 * Open Issues/Transfers count for the More badge — only tabs visible in More.
 * Booking.com inbox lives on Plan chrome, not More.
 */
export function resolveMoreBadgeCount(
  permissions: readonly string[] | null | undefined,
  openIssuesCount: number,
  openTransfersCount: number,
  options: ResolveMoreMenuTabsOptions = {}
): number {
  const tabs = resolveMoreMenuTabs(permissions, options);
  let count = 0;
  if (tabs.includes('issues')) count += openIssuesCount;
  if (tabs.includes('transfers')) count += openTransfersCount;
  return count;
}

/**
 * Bottom nav destinations for the current role mix.
 * - check-in: Today · Bookings · More
 * - cleaning-only: Cleaning · My schedule (single More item promoted) or Cleaning · More
 * - both: Today · Bookings · More (Cleaning / Wash live in More)
 */
export function resolveBottomNavItems(
  permissions: readonly string[] | null | undefined,
  options: ResolveMoreMenuTabsOptions = {}
): ReceptionPrimaryNav[] {
  const canCheckIn = receptionStaffCanCheckIn(permissions);
  const canClean = receptionStaffCanClean(permissions);
  const candidates = resolveCandidateMoreMenuTabs(permissions, options);
  const promoted =
    candidates.length === 1 ? moreMenuTabAsPrimary(candidates[0]) : null;

  const trailing: ReceptionPrimaryNav[] = promoted
    ? [promoted]
    : candidates.length > 0
      ? ['more']
      : [];

  if (canCheckIn) {
    return ['today', 'bookings', ...trailing];
  }
  if (canClean) {
    return ['cleaning', ...trailing];
  }
  return [];
}

/** Map active desk tab → which bottom-nav item is selected. */
export function resolvePrimaryNavForDeskTab(
  deskTab: DeskTab,
  permissions: readonly string[] | null | undefined,
  options: ResolveMoreMenuTabsOptions = {}
): ReceptionPrimaryNav {
  const bottom = resolveBottomNavItems(permissions, options);
  if (deskTab === 'desk') return 'today';
  // Bookings cluster: Plan + Booking.com inbox + Archive (shortcuts on Plan chrome).
  if (deskTab === 'plan' || deskTab === 'booking-inbox' || deskTab === 'archive') {
    return 'bookings';
  }
  if (deskTab === 'cleaning') {
    // Cleaning-only: primary Cleaning. Dual role: Cleaning lives under More.
    return bottom.includes('cleaning') ? 'cleaning' : 'more';
  }
  if (deskTab === 'schedule') {
    return bottom.includes('schedule') ? 'schedule' : 'more';
  }
  if (isMoreMenuTab(deskTab)) return 'more';
  return 'today';
}

/**
 * Default desk tab when tapping a bottom-nav item.
 * `more` is a shell menu surface (no desk tab) — returns null.
 * Bookings always opens Plan.
 */
export function resolveDeskTabForPrimaryNav(
  primary: ReceptionPrimaryNav,
  permissions: readonly ReceptionStaffPermission[] | readonly string[] | null | undefined
): DeskTab | null {
  switch (primary) {
    case 'today':
      return coerceDeskTab('desk', permissions);
    case 'bookings':
      return coerceDeskTab('plan', permissions);
    case 'more':
      return null;
    case 'cleaning':
      return coerceDeskTab('cleaning', permissions);
    case 'schedule':
      return coerceDeskTab('schedule', permissions);
    default:
      return resolveDefaultDeskTab(permissions);
  }
}

/**
 * Bottom-nav selection for the shell.
 * When the More menu is open, More stays selected even if URL still points elsewhere.
 */
export function resolveActivePrimaryNav(options: {
  deskTab: DeskTab;
  moreMenuOpen: boolean;
  permissions: readonly string[] | null | undefined;
  showWash?: boolean;
}): ReceptionPrimaryNav {
  if (options.moreMenuOpen) return 'more';
  return resolvePrimaryNavForDeskTab(options.deskTab, options.permissions, {
    showWash: options.showWash,
  });
}
