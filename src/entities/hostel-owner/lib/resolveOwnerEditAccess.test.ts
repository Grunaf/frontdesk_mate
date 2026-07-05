import { describe, expect, it } from 'vitest';
import { resolveOwnerEditAccess } from './resolveOwnerEditAccess';

describe('resolveOwnerEditAccess', () => {
  it('allows editing for active and scheduled', () => {
    expect(resolveOwnerEditAccess('active')).toEqual({ canEditSettings: true, reasonKey: null });
    expect(resolveOwnerEditAccess('scheduled')).toEqual({ canEditSettings: true, reasonKey: null });
  });

  it('blocks editing for expired and archived with reason keys', () => {
    expect(resolveOwnerEditAccess('expired')).toEqual({
      canEditSettings: false,
      reasonKey: 'expired',
    });
    expect(resolveOwnerEditAccess('archived')).toEqual({
      canEditSettings: false,
      reasonKey: 'archived',
    });
  });
});
