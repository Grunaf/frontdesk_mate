import { describe, expect, it } from 'vitest';
import { resolveOwnerPortalFromHost } from './resolveOwnerPortalFromHost';

const BASE = 'frontdeskmate.com';

describe('resolveOwnerPortalFromHost', () => {
  it('detects dashboard.{baseDomain}', () => {
    expect(resolveOwnerPortalFromHost('dashboard.frontdeskmate.com', BASE)).toEqual({
      site: 'dashboard',
    });
  });

  it('detects dashboard.localhost for dev', () => {
    expect(resolveOwnerPortalFromHost('dashboard.localhost:3000', 'localhost:3000')).toEqual({
      site: 'dashboard',
    });
  });

  it('returns null for tenant landing host', () => {
    expect(resolveOwnerPortalFromHost('balkanhan.frontdeskmate.com', BASE)).toBeNull();
  });

  it('returns null for bare base domain', () => {
    expect(resolveOwnerPortalFromHost('frontdeskmate.com', BASE)).toBeNull();
  });

  it('returns null for reception host', () => {
    expect(resolveOwnerPortalFromHost('balkanhan.reception.frontdeskmate.com', BASE)).toBeNull();
  });
});
