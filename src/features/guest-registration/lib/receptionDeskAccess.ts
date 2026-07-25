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
export type DeskTab = CheckInDeskTab | 'cleaning' | 'schedule';

/** Plan / Access / Cash — context tabs under Bookings. */
export const BOOKINGS_CONTEXT_TABS = ['plan', 'access', 'cash'] as const;
export type BookingsContextTab = (typeof BOOKINGS_CONTEXT_TABS)[number];

/** Interrupt + utility screens reached from More (or Today shortcuts). */
export const MORE_MENU_TABS = ['schedule', 'issues', 'transfers', 'archive', 'cleaning'] as const;
export type MoreMenuTab = (typeof MORE_MENU_TABS)[number];

export type ReceptionPrimaryNav =
  | 'today'
  | 'bookings'
  | 'more'
  | 'cleaning'
  | 'schedule';

const CHECK_IN_TAB_SET = new Set<string>(CHECK_IN_DESK_TABS);
const BOOKINGS_TAB_SET = new Set<string>(BOOKINGS_CONTEXT_TABS);
const MORE_TAB_SET = new Set<string>(MORE_MENU_TABS);

/** More tabs that can sit directly in bottom nav when they are the only More item. */
function moreMenuTabAsPrimary(tab: MoreMenuTab): ReceptionPrimaryNav | null {
  if (tab === 'schedule' || tab === 'cleaning') return tab;
  return null;
}

function resolveCandidateMoreMenuTabs(
  permissions: readonly string[] | null | undefined
): MoreMenuTab[] {
  const tabs: MoreMenuTab[] = [];
  const canCheckIn = receptionStaffCanCheckIn(permissions);
  const canClean = receptionStaffCanClean(permissions);

  if (canCheckIn || canClean) {
    tabs.push('schedule');
  }
  if (canCheckIn) {
    tabs.push('issues', 'transfers', 'archive');
  }
  if (canClean && canCheckIn) {
    // Cleaning-only staff uses Cleaning as primary, not More.
    tabs.push('cleaning');
  }
  return tabs;
}

export function isCheckInDeskTab(value: string): value is CheckInDeskTab {
  return CHECK_IN_TAB_SET.has(value);
}

export function isDeskTab(value: string): value is DeskTab {
  return value === 'cleaning' || value === 'schedule' || isCheckInDeskTab(value);
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
  const canCheckIn = receptionStaffCanCheckIn(permissions);
  const canClean = receptionStaffCanClean(permissions);

  if (canCheckIn) {
    tabs.push(...CHECK_IN_DESK_TABS);
  }
  if (canClean) {
    tabs.push('cleaning');
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

export function resolveBookingsContextTabs(
  permissions: readonly string[] | null | undefined
): BookingsContextTab[] {
  if (!receptionStaffCanCheckIn(permissions)) return [];
  return [...BOOKINGS_CONTEXT_TABS];
}

/**
 * Tabs shown inside the More menu surface.
 * When there is exactly one candidate and it can be a bottom-nav primary,
 * it is promoted out of More (empty list).
 */
export function resolveMoreMenuTabs(
  permissions: readonly string[] | null | undefined
): MoreMenuTab[] {
  const tabs = resolveCandidateMoreMenuTabs(permissions);
  if (tabs.length === 1 && moreMenuTabAsPrimary(tabs[0])) {
    return [];
  }
  return tabs;
}

/**
 * Open Issues/Transfers count for the More badge — only tabs visible in More.
 */
export function resolveMoreBadgeCount(
  permissions: readonly string[] | null | undefined,
  openIssuesCount: number,
  openTransfersCount: number
): number {
  const tabs = resolveMoreMenuTabs(permissions);
  let count = 0;
  if (tabs.includes('issues')) count += openIssuesCount;
  if (tabs.includes('transfers')) count += openTransfersCount;
  return count;
}

/**
 * Bottom nav destinations for the current role mix.
 * - check-in: Today · Bookings · More
 * - cleaning-only: Cleaning · My schedule (single More item promoted)
 * - both: Today · Bookings · More (Cleaning lives in More)
 */
export function resolveBottomNavItems(
  permissions: readonly string[] | null | undefined
): ReceptionPrimaryNav[] {
  const canCheckIn = receptionStaffCanCheckIn(permissions);
  const canClean = receptionStaffCanClean(permissions);
  const candidates = resolveCandidateMoreMenuTabs(permissions);
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
  permissions: readonly string[] | null | undefined
): ReceptionPrimaryNav {
  const bottom = resolveBottomNavItems(permissions);
  if (deskTab === 'desk') return 'today';
  if (isBookingsContextTab(deskTab)) return 'bookings';
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
    case 'schedule':
      return coerceDeskTab('schedule', permissions);
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
