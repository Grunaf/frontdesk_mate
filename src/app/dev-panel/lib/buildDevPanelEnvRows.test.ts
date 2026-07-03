import { afterEach, describe, expect, it } from 'vitest';
import {
  buildDevPanelEnvRows,
  isSupabaseServerKeyEffective,
} from './buildDevPanelEnvRows';

const SNAPSHOT_KEYS = [
  'SUPABASE_SECRET_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'ADMIN_SECRET',
  'GUEST_SESSION_SECRET',
  'RECEPTION_SESSION_SECRET',
  'DEV_PANEL_SECRET',
];

describe('buildDevPanelEnvRows', () => {
  const saved = new Map<string, string | undefined>();

  afterEach(() => {
    for (const [key, value] of saved) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    saved.clear();
  });

  function clearKeys(keys: string[]) {
    for (const key of keys) {
      saved.set(key, process.env[key]);
      delete process.env[key];
    }
  }

  it('marks Supabase server key as fallback when only SERVICE_ROLE is set', () => {
    clearKeys(['SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY']);
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'role-key';

    const rows = buildDevPanelEnvRows(SNAPSHOT_KEYS);
    const secretRow = rows.find((r) => r.key === 'SUPABASE_SECRET_KEY');
    const roleRow = rows.find((r) => r.key === 'SUPABASE_SERVICE_ROLE_KEY');

    expect(secretRow?.effective).toBe('fallback');
    expect(roleRow?.effective).toBe('set');
    expect(isSupabaseServerKeyEffective()).toBe(true);
  });

  it('marks session secrets as fallback via ADMIN_SECRET', () => {
    clearKeys(['GUEST_SESSION_SECRET', 'RECEPTION_SESSION_SECRET', 'DEV_PANEL_SECRET', 'ADMIN_SECRET']);
    process.env.ADMIN_SECRET = 'admin';

    const rows = buildDevPanelEnvRows(SNAPSHOT_KEYS);

    expect(rows.find((r) => r.key === 'GUEST_SESSION_SECRET')).toMatchObject({
      effective: 'fallback',
      note: 'via ADMIN_SECRET',
    });
    expect(rows.find((r) => r.key === 'RECEPTION_SESSION_SECRET')).toMatchObject({
      effective: 'fallback',
    });
    expect(rows.find((r) => r.key === 'DEV_PANEL_SECRET')).toMatchObject({
      effective: 'fallback',
    });
  });
});
