import { describe, expect, it } from 'vitest';
import { diffTenantSettingsForAudit } from './diffTenantSettingsForAudit';
import type { TenantSettings } from '../model/settings';

describe('diffTenantSettingsForAudit', () => {
  it('reports wifi when only WiFi name changes', () => {
    const previous: TenantSettings = { wifi: { name: 'Old', password: 'secret-a' } };
    const next: TenantSettings = { wifi: { name: 'New', password: 'secret-a' } };

    expect(diffTenantSettingsForAudit(previous, next)).toEqual({
      changedKeys: ['wifi'],
    });
  });

  it('reports wifi when only WiFi password changes without exposing password in diff output', () => {
    const previous: TenantSettings = { wifi: { name: 'Net', password: 'old' } };
    const next: TenantSettings = { wifi: { name: 'Net', password: 'new' } };

    const diff = diffTenantSettingsForAudit(previous, next);
    expect(diff.changedKeys).toEqual(['wifi']);
    expect(JSON.stringify(diff)).not.toContain('old');
    expect(JSON.stringify(diff)).not.toContain('new');
  });

  it('ignores legacy deskPinHash-only changes in reception', () => {
    const previous: TenantSettings = {
      reception: { open: '08:00', deskPinHash: 'hash-a' } as TenantSettings['reception'],
    };
    const next: TenantSettings = {
      reception: { open: '08:00', deskPinHash: 'hash-b' } as TenantSettings['reception'],
    };

    expect(diffTenantSettingsForAudit(previous, next)).toEqual({
      changedKeys: [],
    });
  });

  it('includes reception when non-PIN reception fields change', () => {
    const previous: TenantSettings = {
      reception: { open: '08:00' },
    };
    const next: TenantSettings = {
      reception: { open: '09:00' },
    };

    expect(diffTenantSettingsForAudit(previous, next)).toEqual({
      changedKeys: ['reception'],
    });
  });

  it('returns empty diff when settings are unchanged', () => {
    const settings: TenantSettings = {
      contacts: { email: 'a@b.c' },
      wifi: { name: 'X', password: 'p' },
    };

    expect(diffTenantSettingsForAudit(settings, { ...settings })).toEqual({
      changedKeys: [],
    });
  });
});
