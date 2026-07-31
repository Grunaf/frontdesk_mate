import { describe, expect, it } from 'vitest';
import { resolveIssueGuestContact } from './resolveIssueGuestContact';

describe('resolveIssueGuestContact', () => {
  it('requires phone or email by default', () => {
    expect(resolveIssueGuestContact({})).toEqual({
      ok: false,
      error: 'contact_required',
    });
  });

  it('allows empty contacts when explicitly skipped', () => {
    expect(resolveIssueGuestContact({ contactSkipped: true })).toEqual({
      ok: true,
      contactPhone: null,
      contactEmail: null,
    });
  });

  it('ignores draft values when skipped', () => {
    expect(
      resolveIssueGuestContact({
        contactSkipped: true,
        contactPhone: '+38267123456',
        contactEmail: 'a@b.com',
      })
    ).toEqual({
      ok: true,
      contactPhone: null,
      contactEmail: null,
    });
  });
});
