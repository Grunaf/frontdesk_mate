import { describe, expect, it } from 'vitest';
import { diffTenantSettingsForAudit } from './diffTenantSettingsForAudit';
import type { TenantSettings } from '../model/settings';

describe('diffTenantSettingsForAudit', () => {
  it('reports wifi when only WiFi name changes', () => {
    const previous: TenantSettings = { wifi: { name: 'Old', password: 'secret-a' } };
    const next: TenantSettings = { wifi: { name: 'New', password: 'secret-a' } };

    expect(diffTenantSettingsForAudit(previous, next)).toEqual({
      changedKeys: ['wifi'],
      deskPinChanged: false,
    });
  });

  it('reports wifi when only WiFi password changes without exposing password in diff output', () => {
    const previous: TenantSettings = { wifi: { name: 'Net', password: 'old' } };
    const next: TenantSettings = { wifi: { name: 'Net', password: 'new' } };

    const diff = diffTenantSettingsForAudit(previous, next);
    expect(diff.changedKeys).toEqual(['wifi']);
    expect(diff.deskPinChanged).toBe(false);
    expect(JSON.stringify(diff)).not.toContain('old');
    expect(JSON.stringify(diff)).not.toContain('new');
  });

  it('sets deskPinChanged when only desk PIN hash changes', () => {
    const previous: TenantSettings = {
      reception: { open: '08:00', deskPinHash: 'hash-a' },
    };
    const next: TenantSettings = {
      reception: { open: '08:00', deskPinHash: 'hash-b' },
    };

    expect(diffTenantSettingsForAudit(previous, next)).toEqual({
      changedKeys: [],
      deskPinChanged: true,
    });
  });

  it('includes reception when non-PIN reception fields change', () => {
    const previous: TenantSettings = {
      reception: { open: '08:00', deskPinHash: 'same' },
    };
    const next: TenantSettings = {
      reception: { open: '09:00', deskPinHash: 'same' },
    };

    expect(diffTenantSettingsForAudit(previous, next)).toEqual({
      changedKeys: ['reception'],
      deskPinChanged: false,
    });
  });

  it('includes reception and deskPinChanged when both change', () => {
    const previous: TenantSettings = {
      reception: { open: '08:00', deskPinHash: 'hash-a' },
    };
    const next: TenantSettings = {
      reception: { open: '09:00', deskPinHash: 'hash-b' },
    };

    expect(diffTenantSettingsForAudit(previous, next)).toEqual({
      changedKeys: ['reception'],
      deskPinChanged: true,
    });
  });

  it('returns empty diff when settings are unchanged', () => {
    const settings: TenantSettings = {
      contacts: { email: 'a@b.c' },
      wifi: { name: 'X', password: 'p' },
    };

    expect(diffTenantSettingsForAudit(settings, { ...settings })).toEqual({
      changedKeys: [],
      deskPinChanged: false,
    });
  });
});
