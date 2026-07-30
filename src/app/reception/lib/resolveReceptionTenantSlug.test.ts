import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import {
  receptionLoginUrl,
  receptionOriginUrl,
  resolveReceptionTenantSlug,
} from './resolveReceptionTenantSlug';

function makeRequest(host: string, requestUrl = `http://localhost:3000/api/reception/login`): NextRequest {
  return new NextRequest(requestUrl, {
    method: 'POST',
    headers: { host },
  });
}

describe('resolveReceptionTenantSlug', () => {
  it('resolves tenant from reception subdomain host', () => {
    const request = makeRequest('vega.reception.localhost:3000');
    expect(resolveReceptionTenantSlug(request)).toBe('vega');
  });

  it('returns null for landing host', () => {
    const request = makeRequest('vega.localhost:3000');
    expect(resolveReceptionTenantSlug(request)).toBeNull();
  });
});

describe('receptionOriginUrl', () => {
  it('keeps the browser host when request.url points at localhost', () => {
    const request = makeRequest(
      'vega.reception.localhost:3000',
      'http://localhost:3000/api/reception/logout'
    );

    expect(receptionOriginUrl(request, '/login').toString()).toBe(
      'http://vega.reception.localhost:3000/login'
    );
  });

  it('keeps query string when pathname includes search', () => {
    const request = makeRequest('vega.reception.localhost:3000');

    expect(receptionOriginUrl(request, '/?tab=plan&stayId=abc').toString()).toBe(
      'http://vega.reception.localhost:3000/?tab=plan&stayId=abc'
    );
  });

  it('adds login error query params from reception host', () => {
    const request = makeRequest('vega.reception.localhost:3000');

    expect(receptionLoginUrl(request, 'invalid_pin').toString()).toBe(
      'http://vega.reception.localhost:3000/login?error=invalid_pin'
    );
  });

  it('preserves sanitized next on login URL', () => {
    const request = makeRequest('vega.reception.localhost:3000');

    expect(
      receptionLoginUrl(request, 'invalid_credentials', '/?tab=plan&stayId=abc').toString()
    ).toBe(
      'http://vega.reception.localhost:3000/login?error=invalid_credentials&next=%2F%3Ftab%3Dplan%26stayId%3Dabc'
    );
  });

  it('drops unsafe next on login URL', () => {
    const request = makeRequest('vega.reception.localhost:3000');

    expect(receptionLoginUrl(request, undefined, 'https://evil.com').toString()).toBe(
      'http://vega.reception.localhost:3000/login'
    );
  });
});
