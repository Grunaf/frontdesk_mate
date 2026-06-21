import { describe, expect, it } from 'vitest';
import {
  getAdminGuestUrlHint,
  getAdminSubscriptionHint,
  isSubscriptionLifecycleNeutral,
  isTenantAppAccessible,
  isTenantAppAccessibleFromStatus,
  isTenantLandingAccessible,
  isTenantLandingAccessibleFromStatus,
  isTenantLeadGenLanding,
  isTenantPubliclyAccessible,
  parseAdminDateInput,
  resolveAdminFormLifecycleStatus,
  resolveArchivedAtOnArchive,
  resolveIsActiveOnArchive,
  resolveTenantLifecycleStatus,
  shouldShowSubscriptionInfoStep,
} from './resolveTenantLifecycle';
import type { TenantRecord } from '../model/settings';

const baseRecord: Pick<
  TenantRecord,
  'archived_at' | 'subscription_starts_at' | 'subscription_ends_at' | 'is_active'
> = {
  archived_at: null,
  subscription_starts_at: '2026-01-01T00:00:00.000Z',
  subscription_ends_at: '2027-01-01T23:59:59.999Z',
  is_active: true,
};

describe('resolveTenantLifecycle', () => {
  it('marks active tenants as publicly accessible', () => {
    expect(resolveTenantLifecycleStatus(baseRecord, new Date('2026-06-01'))).toBe('active');
    expect(isTenantPubliclyAccessible(baseRecord, new Date('2026-06-01'))).toBe(true);
  });

  it('marks expired tenants as expired even when is_active is false', () => {
    const expired = {
      ...baseRecord,
      subscription_ends_at: '2025-01-01T23:59:59.999Z',
      is_active: false,
    };

    expect(resolveTenantLifecycleStatus(expired, new Date('2026-06-01'))).toBe('expired');
    expect(isTenantPubliclyAccessible(expired, new Date('2026-06-01'))).toBe(false);
  });

  it('marks archived tenants only when archived_at is set', () => {
    const archived = {
      ...baseRecord,
      archived_at: '2026-06-01T12:00:00.000Z',
      is_active: false,
    };

    expect(resolveTenantLifecycleStatus(archived, new Date('2026-06-02'))).toBe('archived');
    expect(isTenantPubliclyAccessible(archived, new Date('2026-06-02'))).toBe(false);
  });

  it('allows landing for expired and scheduled tenants', () => {
    const expired = {
      ...baseRecord,
      subscription_ends_at: '2025-01-01T23:59:59.999Z',
    };
    const scheduled = {
      ...baseRecord,
      subscription_starts_at: '2030-01-01T00:00:00.000Z',
    };
    const archived = {
      ...baseRecord,
      archived_at: '2026-06-01T12:00:00.000Z',
      is_active: false,
    };

    expect(isTenantLandingAccessible(expired, new Date('2026-06-01'))).toBe(true);
    expect(isTenantLandingAccessible(scheduled, new Date('2026-06-01'))).toBe(true);
    expect(isTenantLandingAccessible(archived, new Date('2026-06-02'))).toBe(false);
    expect(isTenantAppAccessible(expired, new Date('2026-06-01'))).toBe(false);
  });

  it('flags lead-gen landing statuses', () => {
    expect(isTenantLeadGenLanding('expired')).toBe(true);
    expect(isTenantLeadGenLanding('scheduled')).toBe(true);
    expect(isTenantLeadGenLanding('active')).toBe(false);
    expect(isTenantLeadGenLanding('archived')).toBe(false);
  });

  it('parses admin date inputs', () => {
    expect(parseAdminDateInput('2026-06-20', 'start')).toBe('2026-06-20T00:00:00.000Z');
    expect(parseAdminDateInput('2026-06-20', 'end')).toBe('2026-06-20T23:59:59.999Z');
  });

  it('clears archive on restore', () => {
    expect(
      resolveArchivedAtOnArchive({
        archived: false,
        previousArchivedAt: '2026-01-01T00:00:00.000Z',
      })
    ).toBeNull();
    expect(resolveIsActiveOnArchive(false)).toBe(true);
  });

  it('keeps archive timestamp when archiving', () => {
    const archivedAt = '2026-03-01T10:00:00.000Z';

    expect(
      resolveArchivedAtOnArchive({
        archived: true,
        previousArchivedAt: archivedAt,
        now: new Date('2026-06-01'),
      })
    ).toBe(archivedAt);
    expect(resolveIsActiveOnArchive(true)).toBe(false);
  });

  it('derives admin helpers from lifecycle status', () => {
    expect(isTenantLandingAccessibleFromStatus('expired')).toBe(true);
    expect(isTenantAppAccessibleFromStatus('expired')).toBe(false);
    expect(isSubscriptionLifecycleNeutral('expired')).toBe(true);
    expect(isSubscriptionLifecycleNeutral('archived')).toBe(true);
    expect(isSubscriptionLifecycleNeutral('active')).toBe(false);
    expect(shouldShowSubscriptionInfoStep('active')).toBe(false);
    expect(getAdminGuestUrlHint('expired')).toContain('App offline');
    expect(getAdminGuestUrlHint('archived')).toBe('Guest URLs offline');
    expect(getAdminSubscriptionHint('expired')).toContain('Subscription ended');
  });

  it('resolves admin form lifecycle from archived flag before dates', () => {
    expect(
      resolveAdminFormLifecycleStatus({
        archived: true,
        subscriptionStartsAt: '2026-01-01',
        subscriptionEndsAt: '2027-01-01',
      })
    ).toBe('archived');

    expect(
      resolveAdminFormLifecycleStatus({
        archived: false,
        subscriptionStartsAt: '2024-01-01',
        subscriptionEndsAt: '2024-12-31',
      })
    ).toBe('expired');
  });
});
