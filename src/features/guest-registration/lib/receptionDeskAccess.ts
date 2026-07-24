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
  'archive',
] as const;

export type CheckInDeskTab = (typeof CHECK_IN_DESK_TABS)[number];
export type DeskTab = CheckInDeskTab | 'cleaning';

/** Plan / Access / Cash — context tabs under Bookings. */
export const BOOKINGS_CONTEXT_TABS = ['plan', 'access', 'cash'] as const;
export type BookingsContextTab = (typeof BOOKINGS_CONTEXT_TABS)[number];

/** Interrupt + utility screens reached from More (or Today shortcuts). */
export const MORE_MENU_TABS = ['issues', 'transfers', 'archive', 'cleaning'] as const;
export type MoreMenuTab = (typeof MORE_MENU_TABS)[number];

export type ReceptionPrimaryNav =
  | 'today'
  | 'bookings'
  | 'more'
  | 'cleaning';

const CHECK_IN_TAB_SET = new Set<string>(CHECK_IN_DESK_TABS);
const BOOKINGS_TAB_SET = new Set<string>(BOOKINGS_CONTEXT_TABS);
const MORE_TAB_SET = new Set<string>(MORE_MENU_TABS);

export function isCheckInDeskTab(value: string): value is CheckInDeskTab {
  return CHECK_IN_TAB_SET.has(value);
}

export function isDeskTab(value: string): value is DeskTab {
  return value === 'cleaning' || isCheckInDeskTab(value);
}

export function isBookingsContextTab(value: string): value is BookingsContextTab {
  return BOOKINGS_TAB_SET.has(value);
}

export function isMoreMenuTab(value: string): value is MoreMenuTab {
  return MORE_TAB_SET.has(value);
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

export function resolveBookingsContextTabs(
  permissions: readonly string[] | null | undefined
): BookingsContextTab[] {
  if (!receptionStaffCanCheckIn(permissions)) return [];
  return [...BOOKINGS_CONTEXT_TABS];
}

export function resolveMoreMenuTabs(
  permissions: readonly string[] | null | undefined
): MoreMenuTab[] {
  const tabs: MoreMenuTab[] = [];
  if (receptionStaffCanCheckIn(permissions)) {
    tabs.push('issues', 'transfers', 'archive');
  }
  if (receptionStaffCanClean(permissions) && receptionStaffCanCheckIn(permissions)) {
    // Cleaning-only staff uses Cleaning as primary, not More.
    tabs.push('cleaning');
  }
  return tabs;
}

/**
 * Bottom nav destinations for the current role mix.
 * - check-in: Today · Bookings · More
 * - cleaning-only: Cleaning
 * - both: Today · Bookings · More (Cleaning lives in More)
 */
export function resolveBottomNavItems(
  permissions: readonly string[] | null | undefined
): ReceptionPrimaryNav[] {
  const canCheckIn = receptionStaffCanCheckIn(permissions);
  const canClean = receptionStaffCanClean(permissions);

  if (canCheckIn) {
    return ['today', 'bookings', 'more'];
  }
  if (canClean) {
    return ['cleaning'];
  }
  return [];
}

/** Map active desk tab → which bottom-nav item is selected. */
export function resolvePrimaryNavForDeskTab(
  deskTab: DeskTab,
  permissions: readonly string[] | null | undefined
): ReceptionPrimaryNav {
  const bottom = resolveBottomNavItems(permissions);
  if (bottom.length === 1 && bottom[0] === 'cleaning') {
    return 'cleaning';
  }
  if (deskTab === 'desk') return 'today';
  if (isBookingsContextTab(deskTab)) return 'bookings';
  if (isMoreMenuTab(deskTab)) return 'more';
  return 'today';
}

/**
 * Default desk tab when tapping a bottom-nav item.
 * `more` is a shell menu surface (no desk tab) — returns null.
 */
export function resolveDeskTabForPrimaryNav(
  primary: ReceptionPrimaryNav,
  permissions: readonly ReceptionStaffPermission[] | readonly string[] | null | undefined,
  lastBookingsTab: BookingsContextTab | null = null
): DeskTab | null {
  switch (primary) {
    case 'today':
      return coerceDeskTab('desk', permissions);
    case 'bookings': {
      const preferred =
        lastBookingsTab && isBookingsContextTab(lastBookingsTab) ? lastBookingsTab : 'plan';
      return coerceDeskTab(preferred, permissions);
    }
    case 'more':
      return null;
    case 'cleaning':
      return coerceDeskTab('cleaning', permissions);
    default:
      return resolveDefaultDeskTab(permissions);
  }
}

/** Whether the Bookings context strip should render for this desk tab. */
export function shouldShowBookingsContextTabs(deskTab: DeskTab): boolean {
  return isBookingsContextTab(deskTab);
}

/**
 * Bottom-nav selection for the shell.
 * When the More menu is open, More stays selected even if URL still points elsewhere.
 */
export function resolveActivePrimaryNav(options: {
  deskTab: DeskTab;
  moreMenuOpen: boolean;
  permissions: readonly string[] | null | undefined;
}): ReceptionPrimaryNav {
  if (options.moreMenuOpen) return 'more';
  return resolvePrimaryNavForDeskTab(options.deskTab, options.permissions);
}
