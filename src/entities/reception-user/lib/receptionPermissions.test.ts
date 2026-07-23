import { describe, expect, it } from 'vitest';

import {
  isReceptionStaffPermission,
  receptionStaffCanManageArchive,
  sanitizeReceptionStaffPermissions,
} from './receptionPermissions';

describe('receptionPermissions', () => {
  it('has an empty whitelist in Archive v1', () => {
    expect(isReceptionStaffPermission('reservation.archive.read')).toBe(false);
    expect(isReceptionStaffPermission('reservation.archive.purge')).toBe(false);
    expect(isReceptionStaffPermission('reservation.trash.read')).toBe(false);
  });

  it('drops legacy trash/archive keys on sanitize', () => {
    expect(
      sanitizeReceptionStaffPermissions([
        'reservation.trash.read',
        'reservation.archive.restore',
        'reservation.archive.purge',
        'nope',
      ])
    ).toEqual([]);
  });

  it('treats archive as open to all staff', () => {
    expect(receptionStaffCanManageArchive([])).toBe(true);
    expect(receptionStaffCanManageArchive(null)).toBe(true);
  });
});
