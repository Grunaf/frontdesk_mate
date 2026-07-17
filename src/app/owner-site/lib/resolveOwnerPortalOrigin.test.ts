import { describe, expect, it } from 'vitest';
import { ownerPortalOriginUrl } from './resolveOwnerPortalOrigin';

function makeRequest(host: string, requestUrl = 'http://localhost:3000/en/auth/logout'): Request {
  return new Request(requestUrl, {
    method: 'POST',
    headers: { host },
  });
}

describe('ownerPortalOriginUrl', () => {
  it('keeps the dashboard host when request.url points at localhost', () => {
    const request = makeRequest('dashboard.localhost:3000');

    expect(ownerPortalOriginUrl(request, '/en/login').toString()).toBe(
      'http://dashboard.localhost:3000/en/login',
    );
  });

  it('prefers x-forwarded-host over host', () => {
    const request = new Request('http://localhost:3000/en/auth/logout', {
      method: 'POST',
      headers: {
        host: 'localhost:3000',
        'x-forwarded-host': 'dashboard.example.com',
        'x-forwarded-proto': 'https',
      },
    });

    expect(ownerPortalOriginUrl(request, '/en/login').toString()).toBe(
      'https://dashboard.example.com/en/login',
    );
  });
});
