import { describe, expect, it } from 'vitest';
import { resolveTenantSlugFromHost } from './resolveTenantSlugFromHost';

const BASE = 'frontdeskmate.com';

describe('resolveTenantSlugFromHost', () => {
  it('resolves landing tenant from {slug}.{baseDomain}', () => {
    expect(resolveTenantSlugFromHost('balkanhan.frontdeskmate.com', BASE)).toEqual({
      tenantSlug: 'balkanhan',
      site: 'landing',
    });
  });

  it('resolves app tenant from {slug}.app.{baseDomain}', () => {
    expect(resolveTenantSlugFromHost('balkanhan.app.frontdeskmate.com', BASE)).toEqual({
      tenantSlug: 'balkanhan',
      site: 'app',
    });
  });

  it('resolves reception tenant from {slug}.reception.{baseDomain}', () => {
    expect(resolveTenantSlugFromHost('balkanhan.reception.frontdeskmate.com', BASE)).toEqual({
      tenantSlug: 'balkanhan',
      site: 'reception',
    });
  });

  it('uses env fallback for bare reception.{baseDomain}', () => {
    expect(resolveTenantSlugFromHost('reception.frontdeskmate.com', BASE)).toEqual({
      tenantSlug: null,
      site: 'reception',
    });
  });

  it('uses env fallback site for legacy app.{baseDomain}', () => {
    expect(resolveTenantSlugFromHost('app.frontdeskmate.com', BASE)).toEqual({
      tenantSlug: null,
      site: 'app',
    });
  });

  it('uses env fallback for bare base domain', () => {
    expect(resolveTenantSlugFromHost('frontdeskmate.com', BASE)).toEqual({
      tenantSlug: null,
      site: 'landing',
    });
  });

  it('uses env fallback for localhost', () => {
    expect(resolveTenantSlugFromHost('localhost:3000', 'localhost:3000')).toEqual({
      tenantSlug: null,
      site: 'landing',
    });
  });

  it('resolves slug on {slug}.localhost for local multi-tenant dev', () => {
    expect(resolveTenantSlugFromHost('default.localhost:3000', 'localhost:3000')).toEqual({
      tenantSlug: 'default',
      site: 'landing',
    });
  });

  it('ignores reserved www label', () => {
    expect(resolveTenantSlugFromHost('www.frontdeskmate.com', BASE)).toEqual({
      tenantSlug: null,
      site: 'landing',
    });
  });

  it('ignores reserved dashboard label (owner portal host)', () => {
    expect(resolveTenantSlugFromHost('dashboard.frontdeskmate.com', BASE)).toEqual({
      tenantSlug: null,
      site: 'landing',
    });
  });

  it('ignores dashboard.localhost as tenant slug', () => {
    expect(resolveTenantSlugFromHost('dashboard.localhost:3000', 'localhost:3000')).toEqual({
      tenantSlug: null,
      site: 'landing',
    });
  });
});
