import { describe, expect, it } from 'vitest';
import { applyDraftPatch } from './TenantFormDraftContext';

describe('applyDraftPatch', () => {
  it('merges nested contacts patches in one logical update sequence', () => {
    let draft = applyDraftPatch({}, { contacts: { phoneRaw: '38761538331' } });
    draft = applyDraftPatch(draft, { contacts: { phoneMask: '+387 61 538 331' } });

    expect(draft.contacts).toEqual({
      phoneRaw: '38761538331',
      phoneMask: '+387 61 538 331',
    });
  });

  it('merges wifi field patches without dropping the other key', () => {
    let draft = applyDraftPatch({}, { wifi: { name: 'HostelGuest' } });
    draft = applyDraftPatch(draft, { wifi: { password: 'secret' } });

    expect(draft.wifi).toEqual({ name: 'HostelGuest', password: 'secret' });
  });

  it('replaces top-level draft keys wholesale', () => {
    const draft = applyDraftPatch({ logoUrl: 'old.png' }, { logoUrl: 'new.png' });
    expect(draft.logoUrl).toBe('new.png');
  });
});
