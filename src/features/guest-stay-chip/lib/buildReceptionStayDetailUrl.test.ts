import { describe, expect, it } from 'vitest';
import { buildReceptionStayDetailUrl } from './buildReceptionStayDetailUrl';

describe('buildReceptionStayDetailUrl', () => {
  it('builds reception desk deep-link with stayId', () => {
    expect(
      buildReceptionStayDetailUrl('kotor-demo', '00000000-0000-0000-0000-0000123456', 'en')
    ).toBe(
      'http://kotor-demo.reception.localhost:3000/?tab=plan&stayId=00000000-0000-0000-0000-0000123456'
    );
  });

  it('returns empty string when slug or stayId is missing', () => {
    expect(buildReceptionStayDetailUrl('', 'abc')).toBe('');
    expect(buildReceptionStayDetailUrl('kotor-demo', '  ')).toBe('');
  });
});
