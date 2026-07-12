import type { GuestStayRecordWithLink } from '../model/types';

const DEFAULT_CHECK_IN_AT = '2026-06-22T14:00:00.000Z';
const DEFAULT_CHECK_OUT_AT = '2026-06-25T23:59:59.999Z';

/** Test fixture: stay nights always derived from ISO unless dates are overridden. */
export function makeGuestStayRecordFixture(
  overrides: Partial<GuestStayRecordWithLink> = {}
): GuestStayRecordWithLink {
  const {
    check_in_at: overrideInAt,
    check_out_at: overrideOutAt,
    check_in_date: overrideInDate,
    check_out_date: overrideOutDate,
    ...rest
  } = overrides;

  const check_in_at = overrideInAt ?? DEFAULT_CHECK_IN_AT;
  const check_out_at = overrideOutAt ?? DEFAULT_CHECK_OUT_AT;

  return {
    id: 'stay-1',
    tenant_id: 'tenant-1',
    tenant_slug: 'demo',
    bed_id: 'bed-1',
    guest_name: 'Alex',
    activated_at: null,
    desk_checked_in_at: null,
    key_issued_at: null,
    passport_checked_at: null,
    tax_collected_at: null,
    revoked_at: null,
    created_at: '2026-06-22T10:00:00.000Z',
    magicLinkUrl: 'https://example.com/check-in',
    ...rest,
    check_in_at,
    check_out_at,
    check_in_date: overrideInDate ?? check_in_at.slice(0, 10),
    check_out_date: overrideOutDate ?? check_out_at.slice(0, 10),
  };
}
