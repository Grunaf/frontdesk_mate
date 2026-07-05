import { describe, expect, it } from 'vitest';
import { validateTenantSettingsBeforeSave } from './validateTenantSettingsBeforeSave';

describe('validateTenantSettingsBeforeSave owner', () => {
  it('does not require subscription dates', () => {
    expect(
      validateTenantSettingsBeforeSave({
        actor: 'owner',
        mergedSettings: {},
      })
    ).toBeNull();
  });

  it('ignores invalid desk PIN for owner', () => {
    expect(
      validateTenantSettingsBeforeSave({
        actor: 'owner',
        mergedSettings: {},
        receptionDeskPin: '12345',
      })
    ).toBeNull();
  });

  it('still blocks guest extras without price', () => {
    expect(
      validateTenantSettingsBeforeSave({
        actor: 'owner',
        mergedSettings: {
          guestExtras: [{ presetId: 'laundry', enabled: true }],
        },
      })
    ).toMatchObject({ code: 'guest_extra_price' });
  });
});
