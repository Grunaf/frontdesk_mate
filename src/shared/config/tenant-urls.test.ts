import { describe, expect, it, vi } from 'vitest';
import { getPlatformRootUrl, getTenantPublicUrl, normalizeTenantSlugInput } from './tenant-urls';

describe('tenant-urls', () => {
  it('builds tenant landing URL with slug subdomain', () => {
    expect(getTenantPublicUrl('balkanhan', 'landing', 'en')).toBe(
      'http://balkanhan.localhost:3000/en'
    );
  });

  it('builds tenant app URL with slug.app subdomain', () => {
    expect(getTenantPublicUrl('kotor-demo', 'app', 'ru', '/welcome')).toBe(
      'http://kotor-demo.app.localhost:3000/ru/welcome'
    );
  });

  it('builds tenant reception URL with slug.reception subdomain', () => {
    expect(getTenantPublicUrl('kotor-demo', 'reception', 'en')).toBe(
      'http://kotor-demo.reception.localhost:3000'
    );
  });

  it('builds platform root URL', () => {
    expect(getPlatformRootUrl('en')).toBe('http://localhost:3000/en');
  });

  it('uses http on localhost even when NODE_ENV is production', () => {
    vi.stubEnv('NODE_ENV', 'production');

    expect(getTenantPublicUrl('kotor-demo', 'landing', 'en')).toBe(
      'http://kotor-demo.localhost:3000/en'
    );

    vi.unstubAllEnvs();
  });

  it('normalizes slug input', () => {
    expect(normalizeTenantSlugInput('  Balkan Han ')).toBe('balkan-han');
  });
});
