import type { TenantRecord } from '../model/settings';

export type TenantLifecycleStatus = 'active' | 'expired' | 'archived' | 'scheduled';

export function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) {
    return '';
  }

  return iso.slice(0, 10);
}

export function parseAdminDateInput(value: string, kind: 'start' | 'end'): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return kind === 'end' ? `${trimmed}T23:59:59.999Z` : `${trimmed}T00:00:00.000Z`;
}

export function resolveTenantLifecycleStatus(
  record: Pick<
    TenantRecord,
    'archived_at' | 'subscription_starts_at' | 'subscription_ends_at' | 'is_active'
  >,
  now = new Date()
): TenantLifecycleStatus {
  if (record.archived_at) {
    return 'archived';
  }

  if (record.subscription_starts_at && new Date(record.subscription_starts_at) > now) {
    return 'scheduled';
  }

  if (record.subscription_ends_at && new Date(record.subscription_ends_at) < now) {
    return 'expired';
  }

  return 'active';
}

export function isTenantPubliclyAccessible(
  record: Pick<
    TenantRecord,
    'archived_at' | 'subscription_starts_at' | 'subscription_ends_at' | 'is_active'
  >,
  now = new Date()
): boolean {
  return resolveTenantLifecycleStatus(record, now) === 'active';
}

export function isTenantAppAccessible(
  record: Pick<
    TenantRecord,
    'archived_at' | 'subscription_starts_at' | 'subscription_ends_at' | 'is_active'
  >,
  now = new Date()
): boolean {
  return isTenantPubliclyAccessible(record, now);
}

export function isTenantLandingAccessible(
  record: Pick<
    TenantRecord,
    'archived_at' | 'subscription_starts_at' | 'subscription_ends_at' | 'is_active'
  >,
  now = new Date()
): boolean {
  const status = resolveTenantLifecycleStatus(record, now);
  return status === 'active' || status === 'expired' || status === 'scheduled';
}

export function isTenantLeadGenLanding(status: TenantLifecycleStatus): boolean {
  return status === 'expired' || status === 'scheduled';
}

export function isTenantLandingAccessibleFromStatus(status: TenantLifecycleStatus): boolean {
  return status === 'active' || status === 'expired' || status === 'scheduled';
}

export function isTenantAppAccessibleFromStatus(status: TenantLifecycleStatus): boolean {
  return status === 'active';
}

export function isSubscriptionLifecycleNeutral(status: TenantLifecycleStatus): boolean {
  return status === 'expired' || status === 'scheduled' || status === 'archived';
}

export function shouldShowSubscriptionInfoStep(status: TenantLifecycleStatus): boolean {
  return false;
}

export function getAdminSubscriptionHint(status: TenantLifecycleStatus): string {
  switch (status) {
    case 'archived':
      return 'Archived — hidden from guests';
    case 'expired':
      return 'Subscription ended — landing stays live for leads; renew to restore guest app';
    case 'scheduled':
      return 'Starts later — landing live for leads; guest app offline until start date';
    default:
      return 'Subscription active';
  }
}

export function getAdminGuestUrlHint(status: TenantLifecycleStatus): string | null {
  if (status === 'expired' || status === 'scheduled') {
    return 'Landing live · App offline — guest app links need renewal';
  }

  if (
    !isTenantLandingAccessibleFromStatus(status) &&
    !isTenantAppAccessibleFromStatus(status)
  ) {
    return 'Guest URLs offline';
  }

  return null;
}

export function resolveAdminFormLifecycleStatus(input: {
  archived: boolean;
  subscriptionStartsAt: string;
  subscriptionEndsAt: string;
  now?: Date;
}): TenantLifecycleStatus {
  if (input.archived) {
    return 'archived';
  }

  return resolveTenantLifecycleStatus(
    {
      archived_at: null,
      subscription_starts_at: input.subscriptionStartsAt
        ? `${input.subscriptionStartsAt}T00:00:00.000Z`
        : null,
      subscription_ends_at: input.subscriptionEndsAt
        ? `${input.subscriptionEndsAt}T23:59:59.999Z`
        : null,
      is_active: true,
    },
    input.now
  );
}

export function resolveArchivedAtOnArchive(input: {
  archived: boolean;
  previousArchivedAt: string | null;
  now?: Date;
}): string | null {
  if (!input.archived) {
    return null;
  }

  return input.previousArchivedAt ?? (input.now ?? new Date()).toISOString();
}

export function resolveIsActiveOnArchive(archived: boolean): boolean {
  return !archived;
}

/** @deprecated Use resolveArchivedAtOnArchive — archive is no longer part of tenant save. */
export function resolveArchivedAtOnSave(input: {
  archived: boolean;
  subscriptionEndsAt: string | null;
  previousArchivedAt: string | null;
  now?: Date;
}): string | null {
  return resolveArchivedAtOnArchive({
    archived: input.archived,
    previousArchivedAt: input.previousArchivedAt,
    now: input.now,
  });
}

/** @deprecated Use resolveIsActiveOnArchive — is_active reflects archive only. */
export function resolveIsActiveOnSave(input: {
  archived: boolean;
  subscriptionEndsAt: string | null;
  now?: Date;
}): boolean {
  return resolveIsActiveOnArchive(input.archived);
}
